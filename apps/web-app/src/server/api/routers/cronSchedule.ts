import { randomBytes, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
	apps,
	connectedAccounts,
	cronSchedules,
	posts,
	videoJobs,
} from "@/db/schema";
import { protectedProcedure, router } from "@/server/trpc";
import { REQUEST_ID_HEADER, USER_ID_HEADER } from "@/logger";

const AGENT_WORKER_URL =
	process.env.AGENT_WORKER ?? "http://localhost:3002";

async function notifyAgentWorker(
	path: string,
	requestId: string,
	body?: Record<string, unknown>,
	userId?: string,
) {
	const url = `${AGENT_WORKER_URL}${path}`;
	const res = await fetch(url, {
		method: body ? "POST" : "DELETE",
		headers: {
			...(body ? { "Content-Type": "application/json" } : {}),
			[REQUEST_ID_HEADER]: requestId,
			...(userId ? { [USER_ID_HEADER]: userId } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Agent worker ${path} failed (${res.status}): ${text}`);
	}
	return res.json() as Promise<{ ok: boolean }>;
}

function generateSecret(): string {
	return randomBytes(32).toString("hex");
}

function validateTimezone(timezone: string): void {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
	} catch {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid timezone",
		});
	}
}

export const cronScheduleRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				appId: z.string().uuid(),
				name: z.string().optional(),
				scheduleTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm"),
				scheduleDays: z.array(z.string()).min(1),
				timezone: z.string().default("UTC"),
				socialPlatforms: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)),
				);
			if (!app) throw new Error("App not found");

			const platforms = input.socialPlatforms ?? ["instagram", "tiktok"];
			const accounts = await ctx.db
				.select({ provider: connectedAccounts.provider })
				.from(connectedAccounts)
				.where(
					and(
						eq(connectedAccounts.appId, input.appId),
						inArray(connectedAccounts.provider, platforms),
					),
				);
			const connectedProviders = new Set(
				accounts.map((a) => a.provider),
			);
			const missing = platforms.filter(
				(p) => !connectedProviders.has(p),
			);
			if (missing.length > 0) {
				const list = missing
					.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
					.join(" and ");
				throw new Error(
					`Connect your ${list} account${missing.length > 1 ? "s" : ""} before scheduling.`,
				);
			}

			const secret = generateSecret();
			const id = randomUUID();

			await notifyAgentWorker("/api/schedules", ctx.requestId, {
				schedule_id: id,
				secret,
				schedule_time: input.scheduleTime,
				schedule_days: input.scheduleDays,
				timezone: input.timezone,
				social_platforms: input.socialPlatforms,
			}, ctx.clerkUserId);
			ctx.logger.info(
				"schedule.worker_configured",
				"Agent worker accepted the schedule configuration",
				{ appId: input.appId, scheduleId: id },
			);

			const [schedule] = await ctx.db
				.insert(cronSchedules)
				.values({
					id,
					appId: input.appId,
					name: input.name,
					scheduleTime: input.scheduleTime,
					scheduleDays: input.scheduleDays,
					timezone: input.timezone,
					socialPlatforms: input.socialPlatforms ?? null,
					webhookSecret: secret,
				})
				.returning();
			ctx.logger.info("schedule.created", "Schedule was saved", {
				appId: input.appId,
				scheduleId: id,
				platforms,
				stateSaved: Boolean(schedule),
			});

			const webhookUrl = `${AGENT_WORKER_URL}/nudge`;

			return {
				id: schedule.id,
				name: schedule.name,
				scheduleTime: schedule.scheduleTime,
				scheduleDays: schedule.scheduleDays,
				timezone: schedule.timezone,
				socialPlatforms: schedule.socialPlatforms,
				webhookSecret: schedule.webhookSecret,
				webhookUrl,
				enabled: schedule.enabled,
			};
		}),

	schedulePost: protectedProcedure
		.input(
			z.object({
				appId: z.string().uuid(),
				videoJobId: z.string().uuid(),
				scheduledAt: z.date(),
				timezone: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			validateTimezone(input.timezone);
			if (input.scheduledAt.getTime() < Date.now() + 2 * 60 * 1000) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Choose a time at least two minutes from now.",
				});
			}

			const [job] = await ctx.db
				.select({
					id: videoJobs.id,
					status: videoJobs.status,
					outputUrl: videoJobs.outputUrl,
					generationParams: videoJobs.generationParams,
					cronScheduleId: videoJobs.cronScheduleId,
				})
				.from(videoJobs)
				.innerJoin(apps, eq(videoJobs.appId, apps.id))
				.where(
					and(
						eq(videoJobs.id, input.videoJobId),
						eq(videoJobs.appId, input.appId),
						eq(apps.clerkUserId, ctx.clerkUserId),
					),
				);
			if (!job) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
			}
			if (job.status !== "done" || !job.outputUrl) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "The video must finish generating before it can be scheduled.",
				});
			}
			if (job.cronScheduleId) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "This video is already scheduled.",
				});
			}

			const [tiktokAccount] = await ctx.db
				.select({ id: connectedAccounts.id })
				.from(connectedAccounts)
				.where(
					and(
						eq(connectedAccounts.appId, input.appId),
						eq(connectedAccounts.provider, "tiktok"),
					),
				);
			if (!tiktokAccount) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Connect your TikTok account before scheduling.",
				});
			}

			const params = job.generationParams ?? {};
			const meta =
				typeof params.meta === "object" && params.meta !== null
					? (params.meta as Record<string, unknown>)
					: {};
			const idea =
				typeof meta.idea === "string" ? meta.idea : "Generated TikTok video";
			if (meta.flow !== "on_demand") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Only user-approved videos can be scheduled here.",
				});
			}

			const timeParts = new Intl.DateTimeFormat("en-GB", {
				timeZone: input.timezone,
				hour: "2-digit",
				minute: "2-digit",
				hourCycle: "h23",
			}).formatToParts(input.scheduledAt);
			const hour = timeParts.find((part) => part.type === "hour")?.value;
			const minute = timeParts.find((part) => part.type === "minute")?.value;
			if (!hour || !minute) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Could not resolve the selected local time.",
				});
			}

			const scheduleId = randomUUID();
			const secret = generateSecret();
			let postId: string | null = null;

			try {
				const [post] = await ctx.db
					.insert(posts)
					.values({
						appId: input.appId,
						title: idea.slice(0, 200),
						description:
							typeof meta.videoDescription === "string"
								? meta.videoDescription
								: null,
						platform: "tiktok",
						videoJobId: job.id,
						status: "scheduled",
						type: "user_approved",
						scheduledAt: input.scheduledAt,
						meta: {
							outputUrl: job.outputUrl,
							timezone: input.timezone,
						},
					})
					.returning({ id: posts.id });
				postId = post.id;

				await ctx.db.insert(cronSchedules).values({
					id: scheduleId,
					appId: input.appId,
					name: "Approved TikTok post",
					scheduleTime: `${hour}:${minute}`,
					scheduleDays: ["once"],
					timezone: input.timezone,
					socialPlatforms: ["tiktok"],
					webhookSecret: secret,
				});

				await ctx.db
					.update(videoJobs)
					.set({ cronScheduleId: scheduleId })
					.where(eq(videoJobs.id, job.id));

				await notifyAgentWorker("/api/schedules", ctx.requestId, {
					schedule_id: scheduleId,
					secret,
					schedule_time: `${hour}:${minute}`,
					schedule_days: ["once"],
					timezone: input.timezone,
					social_platforms: ["tiktok"],
					scheduled_at: input.scheduledAt.toISOString(),
				}, ctx.clerkUserId);
			} catch (error) {
				await ctx.db
					.update(videoJobs)
					.set({ cronScheduleId: null })
					.where(eq(videoJobs.id, job.id));
				await ctx.db
					.delete(cronSchedules)
					.where(eq(cronSchedules.id, scheduleId));
				if (postId) {
					await ctx.db.delete(posts).where(eq(posts.id, postId));
				}
				throw error;
			}

			ctx.logger.info(
				"schedule.post_created",
				"User-approved TikTok post was scheduled",
				{
					appId: input.appId,
					postId,
					scheduleId,
					scheduledAt: input.scheduledAt,
					timezone: input.timezone,
					stateSaved: true,
				},
			);

			return {
				postId: postId!,
				scheduleId,
				scheduledAt: input.scheduledAt,
				timezone: input.timezone,
			};
		}),

	list: protectedProcedure
		.input(z.object({ appId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)),
				);
			if (!app) return [];

			return ctx.db
				.select({
					id: cronSchedules.id,
					name: cronSchedules.name,
					scheduleTime: cronSchedules.scheduleTime,
					scheduleDays: cronSchedules.scheduleDays,
					timezone: cronSchedules.timezone,
					socialPlatforms: cronSchedules.socialPlatforms,
					enabled: cronSchedules.enabled,
					lastTriggeredAt: cronSchedules.lastTriggeredAt,
					createdAt: cronSchedules.createdAt,
				})
				.from(cronSchedules)
				.where(
					and(
						eq(cronSchedules.appId, input.appId),
						sql`NOT ('once' = ANY(${cronSchedules.scheduleDays}))`,
					),
				)
				.orderBy(cronSchedules.createdAt);
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				name: z.string().optional(),
				scheduleTime: z
					.string()
					.regex(/^\d{2}:\d{2}$/, "Must be HH:mm")
					.optional(),
				scheduleDays: z.array(z.string()).min(1).optional(),
				timezone: z.string().optional(),
				socialPlatforms: z.array(z.string()).optional(),
				enabled: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [schedule] = await ctx.db
				.select({ appId: cronSchedules.appId })
				.from(cronSchedules)
				.where(eq(cronSchedules.id, input.id));
			if (!schedule) throw new Error("Schedule not found");

			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(
						eq(apps.id, schedule.appId),
						eq(apps.clerkUserId, ctx.clerkUserId),
					),
				);
			if (!app) throw new Error("App not found");

			const [updated] = await ctx.db
				.update(cronSchedules)
				.set({
					...(input.name !== undefined && { name: input.name }),
					...(input.scheduleTime !== undefined && {
						scheduleTime: input.scheduleTime,
					}),
					...(input.scheduleDays !== undefined && {
						scheduleDays: input.scheduleDays,
					}),
					...(input.timezone !== undefined && { timezone: input.timezone }),
					...(input.socialPlatforms !== undefined && {
						socialPlatforms: input.socialPlatforms,
					}),
					...(input.enabled !== undefined && { enabled: input.enabled }),
				})
				.where(eq(cronSchedules.id, input.id))
				.returning();
			ctx.logger.info("schedule.updated", "Schedule changes were saved", {
				appId: schedule.appId,
				scheduleId: input.id,
				stateSaved: Boolean(updated),
			});

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [schedule] = await ctx.db
				.select({ appId: cronSchedules.appId })
				.from(cronSchedules)
				.where(eq(cronSchedules.id, input.id));
			if (!schedule) throw new Error("Schedule not found");

			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(
						eq(apps.id, schedule.appId),
						eq(apps.clerkUserId, ctx.clerkUserId),
					),
				);
			if (!app) throw new Error("App not found");

			await notifyAgentWorker(`/api/schedules/${input.id}`, ctx.requestId, undefined, ctx.clerkUserId);
			await ctx.db.delete(cronSchedules).where(eq(cronSchedules.id, input.id));
			ctx.logger.info("schedule.deleted", "Schedule was removed", {
				appId: schedule.appId,
				scheduleId: input.id,
				stateSaved: true,
			});
			return { ok: true };
		}),

	regenerateSecret: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [schedule] = await ctx.db
				.select({ appId: cronSchedules.appId })
				.from(cronSchedules)
				.where(eq(cronSchedules.id, input.id));
			if (!schedule) throw new Error("Schedule not found");

			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(
						eq(apps.id, schedule.appId),
						eq(apps.clerkUserId, ctx.clerkUserId),
					),
				);
			if (!app) throw new Error("App not found");

			const newSecret = generateSecret();
			await ctx.db
				.update(cronSchedules)
				.set({ webhookSecret: newSecret })
				.where(eq(cronSchedules.id, input.id));
			ctx.logger.info("schedule.secret_regenerated", "Schedule secret was replaced", {
				appId: schedule.appId,
				scheduleId: input.id,
				stateSaved: true,
			});

			return { webhookSecret: newSecret };
		}),

	getWebhookInfo: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [schedule] = await ctx.db
				.select({
					id: cronSchedules.id,
					appId: cronSchedules.appId,
					webhookSecret: cronSchedules.webhookSecret,
				})
				.from(cronSchedules)
				.where(eq(cronSchedules.id, input.id));
			if (!schedule) throw new Error("Schedule not found");

			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(
						eq(apps.id, schedule.appId),
						eq(apps.clerkUserId, ctx.clerkUserId),
					),
				);
			if (!app) throw new Error("App not found");

			return {
				webhookUrl: `${process.env.NEXT_PUBLIC_AGENT_WORKER_URL ?? "http://localhost:3002"}/nudge`,
				scheduleId: schedule.id,
				secret: schedule.webhookSecret,
			};
		}),
});
