import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { createDb } from "./db.js";
import { generateOnboardingPreviewPayloads } from "./fine-tune.js";
import { runPipeline } from "./orchestrator.js";

const db = createDb();
const app = new Hono();
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

function crontabWrite(content: string) {
	const withNewline = content.endsWith("\n") ? content : `${content}\n`;
	try {
		const tmp = `/tmp/gold-fish-cron-${Date.now()}`;
		writeFileSync(tmp, withNewline, "utf-8");
		execSync(`crontab "${tmp}"`, { timeout: 5000 });
	} catch {
		writeFileSync(FALLBACK_FILE, withNewline, "utf-8");
	}
}

function crontabAdd(line: string) {
	const current = crontabRead();
	crontabWrite(current ? `${current}\n${line}` : line);
}

function crontabRemove(id: string) {
	const current = crontabRead();
	const lines = current.split("\n").filter((l) => !l.includes(id));
	crontabWrite(lines.join("\n"));
}

app.use("/*", cors());

const onboardingPreviewRequestSchema = z.object({
	app_id: z.string().min(1),
	count: z.union([z.literal(3), z.literal(4)]).default(3),
});

app.post("/api/onboarding/preview-payloads", async (c) => {
	try {
		const input = onboardingPreviewRequestSchema.parse(await c.req.json());
		const payloads = await generateOnboardingPreviewPayloads(
			db,
			input.app_id,
			input.count,
		);
		return c.json({ payloads });
	} catch (err) {
		if (err instanceof z.ZodError) {
			return c.json({ error: "Invalid onboarding preview request" }, 400);
		}
		const msg = err instanceof Error ? err.message : String(err);
		return c.json({ error: `Onboarding preview generation failed: ${msg}` }, 500);
	}
});

app.post("/nudge", async (c) => {
	try {
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

		void runPipeline(
			db,
			schedule.id as string,
			schedule.app_id as string,
			platforms,
			videoServerUrl,
		).catch((err: unknown) => {
			const msg = err instanceof Error ? err.message : String(err);
			console.error(`Pipeline failed: ${msg}`);
		});

		return c.json({ ok: true });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return c.json({ error: `Nudge failed: ${msg}` }, 500);
	}
});

app.post("/api/schedules", async (c) => {
	const { schedule_id, secret, schedule_time, schedule_days, timezone } = await c.req.json<{
		schedule_id?: string;
		secret?: string;
		schedule_time?: string;
		schedule_days?: string[];
		timezone?: string;
	}>();

	if (!schedule_id || !secret || !schedule_time || !schedule_days) {
		return c.json({ error: "Missing required fields" }, 400);
	}

	try {
		const line = crontabLine(schedule_id, secret, schedule_time, schedule_days);
		crontabAdd(line);
	} catch (err) {
		console.error("Crontab add failed (non-fatal):", err);
	}

	return c.json({ ok: true, id: schedule_id });
});

app.delete("/api/schedules/:id", async (c) => {
	const id = c.req.param("id");
	if (!id) {
		return c.json({ error: "Missing schedule id" }, 400);
	}

	try {
		crontabRemove(id);
	} catch (err) {
		console.error("Crontab remove failed (non-fatal):", err);
	}

	return c.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3002);
console.log(`Agent worker listening on :${port}`);
serve({ fetch: app.fetch, port });
