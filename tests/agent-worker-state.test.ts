import { afterEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../apps/agent-worker/src/db.js";
import { runPipeline } from "../apps/agent-worker/src/orchestrator.js";

type QueryResult = Array<Record<string, unknown>>;
type QueryHandler = (
	query: string,
	values: unknown[],
	call: number,
) => Promise<QueryResult>;

function createFakeDb(handler: QueryHandler): {
	db: Db;
	queries: string[];
} {
	const queries: string[] = [];
	const db = (async (
		strings: TemplateStringsArray,
		...values: unknown[]
	) => {
		const query = strings.join("$value");
		queries.push(query);
		return handler(query, values, queries.length);
	}) as unknown as Db;
	return { db, queries };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("agent worker job state", () => {
	it("does not attempt a duplicate failure insert when initial state creation fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { db, queries } = createFakeDb(async () => {
			throw new Error("database unavailable");
		});

		await expect(
			runPipeline(
				db,
				"schedule-1",
				"app-1",
				["instagram"],
				"http://video-server",
				"request-1",
			),
		).rejects.toThrow("database unavailable");

		expect(queries).toHaveLength(1);
		expect(queries[0]).toContain("INSERT INTO video_jobs");
	});

	it("updates the existing job to failed when a later phase fails", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const { db, queries } = createFakeDb(async (_query, _values, call) => {
			if (call === 1) {
				return [{ id: "job-1", status: "running", current_phase: "learning" }];
			}
			if (call === 2) return [];
			if (call === 3) {
				return [{ id: "job-1", status: "failed", current_phase: "learning" }];
			}
			throw new Error(`Unexpected database call ${call}`);
		});

		await expect(
			runPipeline(
				db,
				"schedule-1",
				"app-1",
				["instagram"],
				"http://video-server",
				"request-1",
			),
		).rejects.toThrow("App not found");

		expect(queries.filter((query) => query.includes("INSERT INTO video_jobs"))).toHaveLength(1);
		expect(
			queries.some((query) => query.includes("SET status = 'failed'")),
		).toBe(true);
	});

	it("reports when failure state cannot be saved", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const { db } = createFakeDb(async (_query, _values, call) => {
			if (call === 1) {
				return [{ id: "job-1", status: "running", current_phase: "learning" }];
			}
			if (call === 2) return [];
			throw new Error("failure update unavailable");
		});

		await expect(
			runPipeline(
				db,
				"schedule-1",
				"app-1",
				["instagram"],
				"http://video-server",
				"request-1",
			),
		).rejects.toThrow("App not found");

		expect(
			errors.mock.calls.some((call) =>
				String(call[0]).includes("pipeline.failure_save_failed"),
			),
		).toBe(true);
		expect(
			errors.mock.calls.some((call) =>
				String(call[0]).includes('"stateSaved":false'),
			),
		).toBe(true);
	});
});
