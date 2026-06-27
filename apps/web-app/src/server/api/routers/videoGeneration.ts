import { TRPCError } from "@trpc/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { apps, connectedAccounts, videoJobs } from "@/db/schema";
import { env } from "@/env";
import { protectedProcedure, router } from "@/server/trpc";
import {
	REQUEST_ID_HEADER,
	safeErrorMessage,
} from "@/logger";

const previewPayloadSchema = z.object({
	video: z.string().url(),
	dialogue: z
		.array(
			z.object({
				speaker: z.string(),
				text: z.string(),
			}),
		)
		.min(1),
	voices: z.record(z.string()),
	ttsSpeed: z.number().positive().max(3),
	format: z.enum(["subtitles", "chat"]),
	meta: z.object({
		selectedHook: z.string(),
		hookFormula: z.string(),
		tone: z.string(),
		templateType: z.string(),
		videoType: z.string(),
		videoDescription: z.string(),
		videoCategory: z.string(),
		flow: z.literal("on_demand").optional(),
		idea: z.string().optional(),
	}),
});

const agentPreviewResponseSchema = z.object({
	payloads: z.array(previewPayloadSchema).min(1).max(4),
});

const videoServerGenerateResponseSchema = z.object({
	jobId: z.string().min(1),
});

const videoServerStatusResponseSchema = z.object({
	status: z.string(),
	error: z.string().optional(),
	outputUrl: z.string().nullable().optional(),
});

type PreviewPayload = z.infer<typeof previewPayloadSchema>;
type PreviewStatus = {
	id: string;
	status: "pending" | "running" | "done" | "failed";
	outputUrl: string | null;
	error: string | null;
	liked: boolean | null;
};

const DEFAULT_PREVIEW_COUNT = 3;

function normalizeStatus(status: string): PreviewStatus["status"] {
	if (
		status === "pending" ||
		status === "running" ||
		status === "done" ||
		status === "failed"
	) {
		return status;
	}
	return "pending";
}

async function readError(res: Response): Promise<string> {
	const text = await res.text();
	return text || `HTTP ${res.status}`;
}

async function getPreviewPayloads(
	appId: string,
	requestId: string,
	idea?: string,
): Promise<PreviewPayload[]> {
	const res = await fetch(`${env.AGENT_WORKER}/api/onboarding/preview-payloads`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			[REQUEST_ID_HEADER]: requestId,
		},
		body: JSON.stringify({
			app_id: appId,
			count: idea ? 1 : DEFAULT_PREVIEW_COUNT,
			...(idea ? { idea } : {}),
		}),
	});

	if (!res.ok) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Agent worker preview generation failed: ${await readError(res)}`,
		});
	}

	const parsed = agentPreviewResponseSchema.safeParse(await res.json());
	if (!parsed.success) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Agent worker returned invalid preview payloads",
		});
	}

	return parsed.data.payloads;
}

async function scheduleVideo(
	payload: PreviewPayload,
	requestId: string,
): Promise<string> {
	const res = await fetch(`${env.VIDEO_SERVER_URL}/api/generate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			[REQUEST_ID_HEADER]: requestId,
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		throw new Error(`Video server returned ${await readError(res)}`);
	}

	const parsed = videoServerGenerateResponseSchema.safeParse(await res.json());
	if (!parsed.success) {
		throw new Error("Video server returned an invalid generate response");
	}

	return parsed.data.jobId;
}

function toPreviewStatus(job: {
	id: string;
	status: string;
	outputUrl: string | null;
	error: string | null;
	liked: boolean | null;
}): PreviewStatus {
	return {
		id: job.id,
		status: normalizeStatus(job.status),
		outputUrl: job.outputUrl,
		error: job.error,
		liked: job.liked,
	};
}

export const videoGenerationRouter = router({
	generate: protectedProcedure
		.input(
			z.object({
				appId: z.string().uuid(),
				idea: z.string().trim().min(1).max(2000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)),
				);

			if (!app) {
				throw new TRPCError({ code: "NOT_FOUND", message: "App not found" });
			}

			if (!input.idea && app.fineTuned) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Already fine-tuned",
				});
			}

			if (input.idea) {
				const [tiktokAccount] = await ctx.db
					.select({ id: connectedAccounts.id })
					.from(connectedAccounts)
					.where(
						and(
							eq(connectedAccounts.appId, app.id),
							eq(connectedAccounts.provider, "tiktok"),
						),
					);
				if (!tiktokAccount) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "Connect your TikTok account before generating a post.",
					});
				}
			}

			ctx.logger.info(
				"preview.generation_started",
				input.idea
					? "Generating an on-demand video preview"
					: "Generating onboarding video previews",
				{ appId: app.id, flow: input.idea ? "on_demand" : "onboarding" },
			);
			const payloads = await getPreviewPayloads(
				app.id,
				ctx.requestId,
				input.idea,
			);
			ctx.logger.info(
				"preview.payloads_received",
				"Agent worker returned preview payloads",
				{ appId: app.id, previewCount: payloads.length },
			);

			const created: Array<{
				dbId: string;
				videoServerJobId: string | null;
			}> = [];

			for (const payload of payloads) {
				const [job] = await ctx.db
					.insert(videoJobs)
					.values({
						appId: input.appId,
						status: "pending",
						generationParams: payload as unknown as Record<string, unknown>,
					})
					.returning();
				ctx.logger.info("preview.job_created", "Preview job was saved", {
					appId: input.appId,
					dbJobId: job.id,
					status: job.status,
					stateSaved: true,
				});

				try {
					const jobId = await scheduleVideo(payload, ctx.requestId);

					const [saved] = await ctx.db
						.update(videoJobs)
						.set({ status: "running", videoServerJobId: jobId })
						.where(eq(videoJobs.id, job.id))
						.returning({ id: videoJobs.id });
					ctx.logger.info(
						"preview.render_queued",
						"Preview render was queued and saved",
						{
							appId: input.appId,
							dbJobId: job.id,
							renderJobId: jobId,
							stateSaved: Boolean(saved),
						},
					);

					created.push({ dbId: job.id, videoServerJobId: jobId });
				} catch (err) {
					const [saved] = await ctx.db
						.update(videoJobs)
						.set({
							status: "failed",
							error: safeErrorMessage(err),
						})
						.where(eq(videoJobs.id, job.id))
						.returning({ id: videoJobs.id });
					ctx.logger.error(
						"preview.render_queue_failed",
						"Preview render could not be queued",
						err,
						{
							appId: input.appId,
							dbJobId: job.id,
							stateSaved: Boolean(saved),
						},
					);
					created.push({ dbId: job.id, videoServerJobId: null });
				}
			}

			return created.map((c) => ({
				dbId: c.dbId,
				videoServerJobId: c.videoServerJobId,
			}));
		}),

	list: protectedProcedure
		.input(
			z.object({
				appId: z.string().uuid(),
				flow: z.enum(["onboarding", "on_demand"]).default("onboarding"),
			}),
		)
		.query(async ({ ctx, input }) => {
			const flowFilter =
				input.flow === "on_demand"
					? sql`${videoJobs.generationParams}->'meta'->>'flow' = 'on_demand'`
					: sql`coalesce(${videoJobs.generationParams}->'meta'->>'flow', 'onboarding') <> 'on_demand'`;

			return await ctx.db
				.select({
					id: videoJobs.id,
					appId: videoJobs.appId,
					status: videoJobs.status,
					generationParams: videoJobs.generationParams,
					videoServerJobId: videoJobs.videoServerJobId,
					outputUrl: videoJobs.outputUrl,
					liked: videoJobs.liked,
					error: videoJobs.error,
					createdAt: videoJobs.createdAt,
					updatedAt: videoJobs.updatedAt,
				})
				.from(videoJobs)
				.innerJoin(apps, eq(videoJobs.appId, apps.id))
				.where(
					and(
						eq(videoJobs.appId, input.appId),
						eq(apps.clerkUserId, ctx.clerkUserId),
						flowFilter,
					),
				)
				.orderBy(videoJobs.createdAt);
		}),

	getStatus: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [job] = await ctx.db
				.select({
					id: videoJobs.id,
					status: videoJobs.status,
					videoServerJobId: videoJobs.videoServerJobId,
					outputUrl: videoJobs.outputUrl,
					error: videoJobs.error,
					liked: videoJobs.liked,
				})
				.from(videoJobs)
				.innerJoin(apps, eq(videoJobs.appId, apps.id))
				.where(
					and(eq(videoJobs.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)),
				);

			if (!job) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
			}

			if (
				job.videoServerJobId &&
				(job.status === "running" || job.status === "pending")
			) {
				try {
					const res = await fetch(
						`${env.VIDEO_SERVER_URL}/api/status/${job.videoServerJobId}`,
						{ headers: { [REQUEST_ID_HEADER]: ctx.requestId } },
					);

					if (res.status === 404) {
						const [saved] = await ctx.db
							.update(videoJobs)
							.set({
								status: "failed",
								error: "Video server lost this job (restarted?)",
							})
							.where(eq(videoJobs.id, job.id))
							.returning({ id: videoJobs.id });
						ctx.logger.error(
							"preview.render_job_lost",
							"Video server no longer has the preview job",
							new Error("Video server returned 404 for an active job"),
							{
								dbJobId: job.id,
								renderJobId: job.videoServerJobId,
								stateSaved: Boolean(saved),
							},
						);
						return toPreviewStatus({
							...job,
							status: "failed",
							error: "Video server lost this job",
						});
					}

					if (res.ok) {
						const remote = videoServerStatusResponseSchema.parse(await res.json());

						if (remote.status === "done" && remote.outputUrl) {
							const [saved] = await ctx.db
								.update(videoJobs)
								.set({ status: "done", outputUrl: remote.outputUrl })
								.where(eq(videoJobs.id, job.id))
								.returning({ id: videoJobs.id });
							ctx.logger.info(
								"preview.render_completed",
								"Preview render completed and was saved",
								{
									dbJobId: job.id,
									renderJobId: job.videoServerJobId,
									stateSaved: Boolean(saved),
								},
							);
							return toPreviewStatus({
								...job,
								status: "done",
								outputUrl: remote.outputUrl,
								error: null,
							});
						}

						if (remote.status === "failed") {
							const [saved] = await ctx.db
								.update(videoJobs)
								.set({ status: "failed", error: remote.error })
								.where(eq(videoJobs.id, job.id))
								.returning({ id: videoJobs.id });
							ctx.logger.error(
								"preview.render_failed",
								"Preview render failed and was saved",
								new Error(remote.error ?? "Video rendering failed"),
								{
									dbJobId: job.id,
									renderJobId: job.videoServerJobId,
									stateSaved: Boolean(saved),
								},
							);
							return toPreviewStatus({
								...job,
								status: "failed",
								error: remote.error ?? "Video rendering failed",
							});
						}

						const remoteStatus = normalizeStatus(remote.status);
						if (remoteStatus !== normalizeStatus(job.status)) {
							const [saved] = await ctx.db
								.update(videoJobs)
								.set({ status: remoteStatus })
								.where(eq(videoJobs.id, job.id))
								.returning({ id: videoJobs.id });
							ctx.logger.info(
								"preview.status_changed",
								"Preview status changed and was saved",
								{
									dbJobId: job.id,
									renderJobId: job.videoServerJobId,
									status: remoteStatus,
									stateSaved: Boolean(saved),
								},
							);
							return toPreviewStatus({ ...job, status: remoteStatus });
						}
					}
				} catch (err) {
					// Keep current DB status when video-server is temporarily unreachable.
					ctx.logger.warn(
						"preview.status_unavailable",
						"Video server status is temporarily unavailable; database state was kept",
						{
							error: err,
							dbJobId: job.id,
							renderJobId: job.videoServerJobId,
							status: job.status,
							stateSaved: false,
						},
					);
				}
			}

			return toPreviewStatus(job);
		}),

	retry: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [job] = await ctx.db
				.select({
					id: videoJobs.id,
					appId: videoJobs.appId,
					generationParams: videoJobs.generationParams,
					app: { clerkUserId: apps.clerkUserId },
				})
				.from(videoJobs)
				.innerJoin(apps, eq(videoJobs.appId, apps.id))
				.where(eq(videoJobs.id, input.id));

			if (!job) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
			}
			if (job.app.clerkUserId !== ctx.clerkUserId) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not your job" });
			}
			if (!job.generationParams) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "No generation params to retry",
				});
			}

			const payload = previewPayloadSchema.safeParse(job.generationParams);
			if (!payload.success) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Stored generation params are invalid",
				});
			}

			const jobId = await scheduleVideo(payload.data, ctx.requestId);

			const [updated] = await ctx.db
				.update(videoJobs)
				.set({
					status: "running",
					videoServerJobId: jobId,
					error: null,
					outputUrl: null,
					liked: null,
				})
				.where(eq(videoJobs.id, job.id))
				.returning();
			ctx.logger.info("preview.retry_queued", "Preview retry was queued and saved", {
				appId: job.appId,
				dbJobId: job.id,
				renderJobId: jobId,
				stateSaved: Boolean(updated),
			});

			return { dbId: updated.id, videoServerJobId: updated.videoServerJobId };
		}),

	setPreference: protectedProcedure
		.input(z.object({ id: z.string().uuid(), liked: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select({
					id: videoJobs.id,
					status: videoJobs.status,
				})
				.from(videoJobs)
				.innerJoin(apps, eq(videoJobs.appId, apps.id))
				.where(
					and(eq(videoJobs.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)),
				);

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
			}
			if (existing.status !== "done") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Only completed videos can be selected",
				});
			}

			const [job] = await ctx.db
				.update(videoJobs)
				.set({ liked: input.liked })
				.where(eq(videoJobs.id, input.id))
				.returning();

			if (!job) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
			}
			ctx.logger.info("preview.preference_saved", "Preview preference was saved", {
				dbJobId: input.id,
				liked: input.liked,
				stateSaved: true,
			});

			return job;
		}),

	saveFineTune: protectedProcedure
		.input(z.object({ appId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)),
				);

			if (!app) {
				throw new TRPCError({ code: "NOT_FOUND", message: "App not found" });
			}

			const selected = await ctx.db
				.select({
					generationParams: videoJobs.generationParams,
					outputUrl: videoJobs.outputUrl,
				})
				.from(videoJobs)
				.where(
					and(
						eq(videoJobs.appId, input.appId),
						eq(videoJobs.liked, true),
						eq(videoJobs.status, "done"),
						isNotNull(videoJobs.outputUrl),
					),
				);

			if (selected.length === 0) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Select at least one completed video",
				});
			}

			const fineTunePreference = selected.map((s) => ({
				params: s.generationParams,
				outputUrl: s.outputUrl,
			}));

			const [updated] = await ctx.db
				.update(apps)
				.set({
					fineTuned: true,
					fineTunePreference: fineTunePreference as unknown as Record<
						string,
						unknown
					>,
				})
				.where(eq(apps.id, input.appId))
				.returning();
			ctx.logger.info(
				"preview.fine_tune_saved",
				"Fine-tune preferences were saved",
				{
					appId: input.appId,
					selectedVideoCount: selected.length,
					stateSaved: Boolean(updated),
				},
			);

			return updated;
		}),
});
