import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { apps, connectedAccounts, cronSchedules } from "@/db/schema";
import { protectedProcedure, router } from "@/server/trpc";
import { REQUEST_ID_HEADER } from "../../../../../../src/logger";

const AGENT_WORKER_URL =
	process.env.AGENT_WORKER ?? "http://localhost:3002";

async function notifyAgentWorker(
	path: string,
	requestId: string,
	body?: Record<string, unknown>,
) {
	const url = `${AGENT_WORKER_URL}${path}`;
	const res = await fetch(url, {
		method: body ? "POST" : "DELETE",
		headers: {
			...(body ? { "Content-Type": "application/json" } : {}),
			[REQUEST_ID_HEADER]: requestId,
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
			});
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
				.where(eq(cronSchedules.appId, input.appId))
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

			await notifyAgentWorker(`/api/schedules/${input.id}`, ctx.requestId);
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
