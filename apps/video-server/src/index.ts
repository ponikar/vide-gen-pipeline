import { randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	createLogger,
	elapsedMs,
	getRequestId,
	REQUEST_ID_HEADER,
	USER_ID_HEADER,
} from "../../../src/logger.js";
import { preloadTts } from "../../../src/tts.js";
import type { GenerateRequest } from "./pipeline.js";
import { assertSystemDeps, runPipeline } from "./pipeline.js";
import { JobQueue } from "./queue.js";

type AppEnv = {
	Variables: {
		requestId: string;
	};
};

const app = new Hono<AppEnv>();
const instanceId = randomUUID();
const logger = createLogger("video-server", { instanceId, source: "video-server/src/index.ts" });

app.use(
	"/*",
	cors({
		origin: ["http://localhost:3000"],
		allowMethods: ["GET", "POST", "OPTIONS"],
		exposeHeaders: [REQUEST_ID_HEADER],
	}),
);
app.use("/*", async (c, next) => {
	const requestId = getRequestId(c.req.raw.headers);
	const startedAt = performance.now();
	const userId = c.req.raw.headers.get(USER_ID_HEADER)?.trim() || undefined;
	const requestLogger = logger.child({
		requestId,
		...(userId ? { userId } : {}),
	});
	c.set("requestId", requestId);
	c.header(REQUEST_ID_HEADER, requestId);
	if (userId) c.header(USER_ID_HEADER, userId);

	try {
		await next();
		const fields = {
			method: c.req.method,
			path: c.req.path,
			status: c.res.status,
			durationMs: elapsedMs(startedAt),
		};
		if (c.res.status >= 400) {
			requestLogger.warn("http.request_completed", "Request returned an error", fields);
		} else if (c.req.path !== "/api/health") {
			requestLogger.info("http.request_completed", "Request completed", fields);
		}
	} catch (err) {
		requestLogger.error("http.request_failed", "Request crashed", err, {
			method: c.req.method,
			path: c.req.path,
			durationMs: elapsedMs(startedAt),
		});
		throw err;
	}
});

const queue = new JobQueue((input: unknown, jobId: string, context) =>
	runPipeline(
		input as GenerateRequest,
		jobId,
		logger.child({ ...context, jobId }),
	),
	{ logger },
);

app.get("/api/health", (c) => {
	return c.json({ status: "ok" });
});

app.post("/api/generate", async (c) => {
	const body = (await c.req.json()) as GenerateRequest;

	if (!body.video) {
		return c.json({ error: "video is required" }, 400);
	}
	if (
		!body.dialogue ||
		!Array.isArray(body.dialogue) ||
		body.dialogue.length === 0
	) {
		return c.json({ error: "dialogue must be a non-empty array" }, 400);
	}

	const jobId = queue.enqueue(body, { requestId: c.get("requestId") });
	return c.json({ jobId }, 201);
});

app.get("/api/status/:jobId", (c) => {
	const jobId = c.req.param("jobId");
	const job = queue.getJob(jobId);

	if (!job) {
		logger.warn("queue.job_not_found", "Video job was not found", {
			requestId: c.get("requestId"),
			jobId,
			restartPossible: true,
		});
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
		logger.warn("queue.output_not_found", "Video job output was not found", {
			requestId: c.get("requestId"),
			jobId,
			restartPossible: true,
		});
		return c.json({ error: "job not found" }, 404);
	}
	if (job.status !== "done" || !job.outputUrl) {
		return c.json({ error: "output not ready" }, 404);
	}

	return c.redirect(job.outputUrl, 302);
});

const PORT = Number(process.env.PORT ?? 3001);

const shutdown = async (signal: string) => {
  logger.info("service.shutting_down", "Video server shutting down", { signal });
  await logger.flush();
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const startupStartedAt = performance.now();
logger.info("service.starting", "Video server is starting", { port: PORT });
try {
	await assertSystemDeps();
	logger.info("service.dependencies_ready", "System dependencies are available");
	await preloadTts();
	logger.info("service.tts_ready", "Text-to-speech model is ready");
} catch (error) {
	logger.error("service.startup_failed", "Video server could not start", error, {
		startupDurationMs: elapsedMs(startupStartedAt),
	});
	throw error;
}

logger.info("service.started", "Video server is listening", {
	port: PORT,
	startupDurationMs: elapsedMs(startupStartedAt),
});

serve({
	fetch: app.fetch,
	port: PORT,
});
