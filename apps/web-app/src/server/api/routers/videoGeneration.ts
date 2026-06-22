import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { apps, videoJobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateObject } from "ai";
import { getVideoModel } from "@/lib/ai-model";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";

const PROMPTS_DIR = path.resolve(process.cwd(), "..", "..", "prompts");

const hookSchema = z.object({
  video: z.string().url(),
  dialogue: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
  })).min(1),
  voices: z.record(z.string()).optional(),
  ttsSpeed: z.number().positive().max(3).optional(),
  format: z.enum(["subtitles", "chat"]).optional(),
});

const hooksSchema = z.object({
  hooks: z.array(hookSchema).length(3),
});

type Hook = z.infer<typeof hookSchema>;

async function readPrompt(name: string): Promise<string> {
  try {
    return await readFile(path.join(PROMPTS_DIR, name), "utf8");
  } catch {
    return "";
  }
}

async function generateHooks(appName: string, appDescription: string): Promise<Hook[]> {
  const hookPrompt = await readPrompt("hook.md");
  const videoPrompt = await readPrompt("video.md");
  const videosContext = await readPrompt("videos-context.md");

  const system = [
    "You are a video content strategist. Given an app name and description, generate 3 short hook videos.",
    "Each hook should be a short, punchy video that grabs attention and explains the app's value.",
    "",
    videoPrompt,
    "",
    hookPrompt,
    "",
    "Available background videos (pick the most relevant ones for each hook):",
    videosContext,
  ].filter(Boolean).join("\n");

  const { object } = await generateObject({
    model: getVideoModel(),
    schema: hooksSchema,
    system,
    prompt: [
      `App name: ${appName}`,
      appDescription ? `App description: ${appDescription}` : "",
      "",
      "Generate 3 hook videos. Each must use a background video from the available list.",
      "The dialogue should be spoken by a single speaker (speaker: 'A').",
      "Use af_heart voice (warm, friendly) for all hooks.",
      "Keep dialogue short — 2-4 lines per hook, each line under 15 words.",
      "Format should be 'subtitles' (not chat) for all hooks.",
    ].filter(Boolean).join("\n"),
  });

  return object.hooks;
}

export const videoGenerationRouter = router({
  generate: protectedProcedure
    .input(z.object({ appId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [app] = await ctx.db.select().from(apps)
        .where(and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)));

      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "App not found" });
      }

      if (app.fineTuned) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Already fine-tuned" });
      }

      const hooks = await generateHooks(app.name, app.description ?? "");

      const created: Array<{ dbId: string; videoServerJobId: string; hook: Hook }> = [];

      for (const hook of hooks) {
        const [job] = await ctx.db.insert(videoJobs).values({
          appId: input.appId,
          status: "pending",
          generationParams: hook as unknown as Record<string, unknown>,
        }).returning();

        try {
          const res = await fetch(`${env.VIDEO_SERVER_URL}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(hook),
          });

          if (!res.ok) {
            throw new Error(`Video server returned ${res.status}`);
          }

          const { jobId } = (await res.json()) as { jobId: string };

          await ctx.db.update(videoJobs)
            .set({ status: "running", videoServerJobId: jobId })
            .where(eq(videoJobs.id, job.id));

          created.push({ dbId: job.id, videoServerJobId: jobId, hook });
        } catch (err) {
          await ctx.db.update(videoJobs)
            .set({ status: "failed", error: err instanceof Error ? err.message : String(err) })
            .where(eq(videoJobs.id, job.id));
        }
      }

      return created.map((c) => ({
        dbId: c.dbId,
        videoServerJobId: c.videoServerJobId,
      }));
    }),

  list: protectedProcedure
    .input(z.object({ appId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.select().from(videoJobs)
        .where(eq(videoJobs.appId, input.appId))
        .orderBy(videoJobs.createdAt);
    }),

  getStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await ctx.db.select().from(videoJobs)
        .where(eq(videoJobs.id, input.id));

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.videoServerJobId && (job.status === "running" || job.status === "pending")) {
        try {
          const res = await fetch(`${env.VIDEO_SERVER_URL}/api/status/${job.videoServerJobId}`);

          if (res.status === 404) {
            await ctx.db.update(videoJobs)
              .set({ status: "failed", error: "Video server lost this job (restarted?)" })
              .where(eq(videoJobs.id, job.id));
            return { ...job, status: "failed", error: "Video server lost this job" };
          }

          if (res.ok) {
            const remote = (await res.json()) as { status: string; error?: string; outputUrl?: string };

            if (remote.status === "done" && remote.outputUrl) {
              await ctx.db.update(videoJobs)
                .set({ status: "done", outputUrl: remote.outputUrl })
                .where(eq(videoJobs.id, job.id));
              return { ...job, status: "done", outputUrl: remote.outputUrl };
            }

            if (remote.status === "failed") {
              await ctx.db.update(videoJobs)
                .set({ status: "failed", error: remote.error })
                .where(eq(videoJobs.id, job.id));
              return { ...job, status: "failed", error: remote.error };
            }
          }
        } catch {
          // keep current status if video-server is unreachable
        }
      }

      return job;
    }),

  retry: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await ctx.db.select({
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
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No generation params to retry" });
      }

      const hook = job.generationParams as Hook;

      const res = await fetch(`${env.VIDEO_SERVER_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hook),
      });

      if (!res.ok) {
        throw new Error(`Video server returned ${res.status}`);
      }

      const { jobId } = (await res.json()) as { jobId: string };

      const [updated] = await ctx.db.update(videoJobs)
        .set({
          status: "running",
          videoServerJobId: jobId,
          error: null,
          outputUrl: null,
          liked: null,
        })
        .where(eq(videoJobs.id, job.id))
        .returning();

      return { dbId: updated.id, videoServerJobId: updated.videoServerJobId };
    }),

  setPreference: protectedProcedure
    .input(z.object({ id: z.string().uuid(), liked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await ctx.db.update(videoJobs)
        .set({ liked: input.liked })
        .where(eq(videoJobs.id, input.id))
        .returning();

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      return job;
    }),

  saveFineTune: protectedProcedure
    .input(z.object({ appId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [app] = await ctx.db.select().from(apps)
        .where(and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)));

      if (!app) {
        throw new TRPCError({ code: "NOT_FOUND", message: "App not found" });
      }

      const selected = await ctx.db.select({
        generationParams: videoJobs.generationParams,
        outputUrl: videoJobs.outputUrl,
      })
        .from(videoJobs)
        .where(and(
          eq(videoJobs.appId, input.appId),
          eq(videoJobs.liked, true),
          eq(videoJobs.status, "done"),
        ));

      const fineTunePreference = selected.map((s) => ({
        params: s.generationParams,
        outputUrl: s.outputUrl,
      }));

      const [updated] = await ctx.db.update(apps)
        .set({ fineTuned: true, fineTunePreference: fineTunePreference as unknown as Record<string, unknown> })
        .where(eq(apps.id, input.appId))
        .returning();

      return updated;
    }),
});
