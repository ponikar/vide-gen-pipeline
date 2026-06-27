import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
	createLogger,
	elapsedMs,
	getRequestId,
	REQUEST_ID_HEADER,
} from "../../../src/logger.js";
import { createDb } from "./db.js";
import { generateOnboardingPreviewPayloads } from "./fine-tune.js";
import { runPipeline } from "./orchestrator.js";

const db = createDb();
type AppEnv = {
	Variables: {
		requestId: string;
	};
};

const app = new Hono<AppEnv>();
const logger = createLogger("agent-worker");
const NUDGE_CMD =
	process.env.CRON_NUDGE_COMMAND ??
	`tsx ${new URL("../scripts/nudge.ts", import.meta.url).pathname}`;
const FALLBACK_FILE = `${homedir()}/.gold-fish-crontab`;

const DAY_MAP: Record<string, string> = {
	sun: "0", mon: "1", tue: "2", wed: "3", thu: "4", fri: "5", sat: "6",
};

function crontabLine(id: string, secret: string, time: string, days: string[]) {
	const [hour, minute] = time.split(":");
	const dow =
		days.includes("daily")
			? "*"
			: days.map((d) => DAY_MAP[d] ?? d).join(",");
	return `${minute} ${hour} * * ${dow} ${NUDGE_CMD} ${id} ${secret}`;
}

function crontabRead(): string {
	try {
		return execSync("crontab -l", { encoding: "utf-8", timeout: 3000 }).trim();
	} catch {
		try {
			if (existsSync(FALLBACK_FILE)) {
				return readFileSync(FALLBACK_FILE, "utf-8").trim();
			}
		} catch { /* ignore */ }
		return "";
	}
}

function crontabWrite(content: string): "crontab" | "fallback" {
	const withNewline = content.endsWith("\n") ? content : `${content}\n`;
	try {
		const tmp = `/tmp/gold-fish-cron-${Date.now()}`;
		writeFileSync(tmp, withNewline, "utf-8");
		execSync(`crontab "${tmp}"`, { timeout: 5000 });
		return "crontab";
	} catch (err) {
		writeFileSync(FALLBACK_FILE, withNewline, "utf-8");
		logger.warn(
			"scheduler.fallback_written",
			"System crontab was unavailable; wrote the inactive fallback file",
			{ error: err, fallbackFile: FALLBACK_FILE },
		);
		return "fallback";
	}
}

function crontabAdd(line: string): "crontab" | "fallback" {
	const current = crontabRead();
	return crontabWrite(current ? `${current}\n${line}` : line);
}

function crontabRemove(id: string): "crontab" | "fallback" {
	const current = crontabRead();
	const lines = current.split("\n").filter((l) => !l.includes(id));
	return crontabWrite(lines.join("\n"));
}

app.use("/*", cors());
app.use("/*", async (c, next) => {
	const requestId = getRequestId(c.req.raw.headers);
	const startedAt = performance.now();
	const requestLogger = logger.child({ requestId });
	c.set("requestId", requestId);
	c.header(REQUEST_ID_HEADER, requestId);
	requestLogger.info("http.request_started", "Request started", {
		method: c.req.method,
		path: c.req.path,
	});

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
		} else {
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

const onboardingPreviewRequestSchema = z.object({
	app_id: z.string().min(1),
	count: z.union([z.literal(3), z.literal(4)]).default(3),
});

app.post("/api/onboarding/preview-payloads", async (c) => {
	const requestLogger = logger.child({ requestId: c.get("requestId") });
	const startedAt = performance.now();
	try {
		const input = onboardingPreviewRequestSchema.parse(await c.req.json());
		const previewLogger = requestLogger.child({ appId: input.app_id });
		const payloads = await generateOnboardingPreviewPayloads(
			db,
			input.app_id,
			input.count,
			previewLogger,
		);
		previewLogger.info("preview.request_completed", "Preview request completed", {
			previewCount: payloads.length,
			durationMs: elapsedMs(startedAt),
		});
		return c.json({ payloads });
	} catch (err) {
		if (err instanceof z.ZodError) {
			requestLogger.warn(
				"preview.request_rejected",
				"Preview request validation failed",
				{ issueCount: err.issues.length },
			);
			return c.json({ error: "Invalid onboarding preview request" }, 400);
		}
		const msg = err instanceof Error ? err.message : String(err);
		requestLogger.error(
			"preview.request_failed",
			"Preview generation failed",
			err,
			{ durationMs: elapsedMs(startedAt) },
		);
		return c.json({ error: `Onboarding preview generation failed: ${msg}` }, 500);
	}
});

app.post("/nudge", async (c) => {
	const requestLogger = logger.child({ requestId: c.get("requestId") });
	try {
		const { schedule_id, secret } = await c.req.json<{
			schedule_id?: string;
			secret?: string;
		}>();

		if (!schedule_id || !secret) {
			requestLogger.warn("pipeline.nudge_rejected", "Nudge is missing required fields");
			return c.json({ error: "Missing schedule_id or secret" }, 400);
		}
		const scheduleLogger = requestLogger.child({ scheduleId: schedule_id });

		const schedules = await db`
      SELECT id, app_id, social_platforms, webhook_secret, enabled
      FROM cron_schedules WHERE id = ${schedule_id}
    `;

		if ((schedules as Record<string, unknown>[]).length === 0) {
			scheduleLogger.warn("pipeline.nudge_rejected", "Schedule was not found");
			return c.json({ error: "Schedule not found" }, 404);
		}

		const schedule = (schedules as Record<string, unknown>[])[0];

		if (!schedule.enabled) {
			scheduleLogger.warn("pipeline.nudge_rejected", "Schedule is disabled");
			return c.json({ error: "Schedule is disabled" }, 403);
		}

		if (schedule.webhook_secret !== secret) {
			scheduleLogger.warn("pipeline.nudge_rejected", "Schedule secret is invalid");
			return c.json({ error: "Invalid secret" }, 401);
		}

		const videoServerUrl =
			process.env.VIDEO_SERVER_URL ?? "http://localhost:3001";
		const platforms = schedule.social_platforms
			? (schedule.social_platforms as string[])
			: ["instagram"];

		const [savedSchedule] = await db`
			UPDATE cron_schedules
			SET last_triggered_at = NOW(), updated_at = NOW()
			WHERE id = ${schedule_id}
			RETURNING id, last_triggered_at
		`;
		scheduleLogger.info(
			"pipeline.nudge_accepted",
			"Nudge accepted and trigger time saved",
			{
				appId: schedule.app_id,
				platforms,
				stateSaved: Boolean(savedSchedule),
			},
		);

		void runPipeline(
			db,
			schedule.id as string,
			schedule.app_id as string,
			platforms,
			videoServerUrl,
			c.get("requestId"),
		).catch((err: unknown) => {
			scheduleLogger.error(
				"pipeline.background_failed",
				"Background pipeline failed",
				err,
				{ appId: schedule.app_id },
			);
		});

		return c.json({ ok: true });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		requestLogger.error("pipeline.nudge_failed", "Nudge handling failed", err);
		return c.json({ error: `Nudge failed: ${msg}` }, 500);
	}
});

app.post("/api/schedules", async (c) => {
	const requestLogger = logger.child({ requestId: c.get("requestId") });
	const { schedule_id, secret, schedule_time, schedule_days, timezone } = await c.req.json<{
		schedule_id?: string;
		secret?: string;
		schedule_time?: string;
		schedule_days?: string[];
		timezone?: string;
	}>();

	if (!schedule_id || !secret || !schedule_time || !schedule_days) {
		requestLogger.warn("scheduler.request_rejected", "Schedule request is incomplete");
		return c.json({ error: "Missing required fields" }, 400);
	}

	try {
		const line = crontabLine(schedule_id, secret, schedule_time, schedule_days);
		const mode = crontabAdd(line);
		requestLogger.info("scheduler.schedule_saved", "Schedule configuration saved", {
			scheduleId: schedule_id,
			scheduleTime: schedule_time,
			scheduleDays: schedule_days,
			timezone,
			mode,
		});
	} catch (err) {
		requestLogger.error(
			"scheduler.schedule_save_failed",
			"Schedule configuration could not be saved",
			err,
			{ scheduleId: schedule_id },
		);
	}

	return c.json({ ok: true, id: schedule_id });
});

app.delete("/api/schedules/:id", async (c) => {
	const id = c.req.param("id");
	const requestLogger = logger.child({
		requestId: c.get("requestId"),
		scheduleId: id,
	});
	if (!id) {
		return c.json({ error: "Missing schedule id" }, 400);
	}

	try {
		const mode = crontabRemove(id);
		requestLogger.info("scheduler.schedule_removed", "Schedule configuration removed", {
			mode,
		});
	} catch (err) {
		requestLogger.error(
			"scheduler.schedule_remove_failed",
			"Schedule configuration could not be removed",
			err,
		);
	}

	return c.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3002);
logger.info("service.started", "Agent worker is listening", { port });
serve({ fetch: app.fetch, port });
