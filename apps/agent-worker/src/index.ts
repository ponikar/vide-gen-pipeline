import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb } from "./db.js";
import { runPipeline } from "./orchestrator.js";

const db = createDb();
const app = new Hono();

app.use("/*", cors());

app.post("/nudge", async (c) => {
	const { schedule_id, secret } = await c.req.json<{
		schedule_id?: string;
		secret?: string;
	}>();

	if (!schedule_id || !secret) {
		return c.json({ error: "Missing schedule_id or secret" }, 400);
	}

	const schedules = await db`
    SELECT id, app_id, social_platforms, webhook_secret, enabled
    FROM cron_schedules WHERE id = ${schedule_id}
  `;

	if ((schedules as Record<string, unknown>[]).length === 0) {
		return c.json({ error: "Schedule not found" }, 404);
	}

	const schedule = (schedules as Record<string, unknown>[])[0];

	if (!schedule.enabled) {
		return c.json({ error: "Schedule is disabled" }, 403);
	}

	if (schedule.webhook_secret !== secret) {
		return c.json({ error: "Invalid secret" }, 401);
	}

	const videoServerUrl =
		process.env.VIDEO_SERVER_URL ?? "http://localhost:3001";
	const platforms = schedule.social_platforms
		? (schedule.social_platforms as string[])
		: ["instagram"];

	c.executionCtx.waitUntil(
		runPipeline(
			db,
			schedule.id as string,
			schedule.app_id as string,
			platforms,
			videoServerUrl,
		),
	);

	return c.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3002);
console.log(`Agent worker listening on :${port}`);
serve({ fetch: app.fetch, port });
