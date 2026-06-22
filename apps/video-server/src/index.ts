import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";

import { JobQueue } from "./queue.js";
import type { GenerateRequest } from "./pipeline.js";
import { runPipeline } from "./pipeline.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

const queue = new JobQueue((input: unknown, jobId: string) =>
  runPipeline(input as GenerateRequest, jobId),
);

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/api/generate", async (c) => {
  const body = (await c.req.json()) as GenerateRequest;

  if (!body.video) {
    return c.json({ error: "video is required" }, 400);
  }
  if (!body.dialogue || !Array.isArray(body.dialogue) || body.dialogue.length === 0) {
    return c.json({ error: "dialogue must be a non-empty array" }, 400);
  }

  const jobId = queue.enqueue(body);
  return c.json({ jobId }, 201);
});

app.get("/api/status/:jobId", (c) => {
  const jobId = c.req.param("jobId");
  const job = queue.getJob(jobId);

  if (!job) {
    return c.json({ error: "job not found" }, 404);
  }

  return c.json({
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    error: job.error,
    outputUrl: job.outputUrl,
  });
});

app.get("/api/output/:jobId", (c) => {
  const jobId = c.req.param("jobId");
  const job = queue.getJob(jobId);

  if (!job) {
    return c.json({ error: "job not found" }, 404);
  }
  if (job.status !== "done" || !job.outputUrl) {
    return c.json({ error: "output not ready" }, 404);
  }

  return c.redirect(job.outputUrl, 302);
});

const PORT = Number(process.env.PORT ?? 3001);

console.log(`video-server listening on http://localhost:${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
});
