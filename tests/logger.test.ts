import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createLogger,
	getRequestId,
	safeErrorMessage,
} from "../src/logger.js";

afterEach(() => {
	vi.restoreAllMocks();
	delete process.env.LOG_LEVEL;
});

describe("logger", () => {
	it("writes structured context and error traces", () => {
		process.env.LOG_LEVEL = "debug";
		const output = vi.spyOn(console, "error").mockImplementation(() => {});
		const cause = new Error("database unavailable");
		const error = new Error("job failed", { cause });

		createLogger("agent-worker", { requestId: "request-1" })
			.child({ jobId: "job-1" })
			.error("pipeline.failed", "Pipeline failed", error, { phase: "rendering" });

		const entry = JSON.parse(String(output.mock.calls[0]?.[0])) as Record<
			string,
			unknown
		>;
		expect(entry).toMatchObject({
			level: "error",
			service: "agent-worker",
			event: "pipeline.failed",
			requestId: "request-1",
			jobId: "job-1",
			phase: "rendering",
		});
		expect(entry.error).toMatchObject({
			type: "Error",
			message: "job failed",
			cause: { message: "database unavailable" },
		});
	});

	it("redacts credentials and content fields", () => {
		const output = vi.spyOn(console, "log").mockImplementation(() => {});

		createLogger("web").info("request.done", "Done", {
			authorization: "Bearer abc",
			accessToken: "token",
			dialogue: [{ text: "private content" }],
			url: "https://example.com/path?access_token=abc",
		});

		const line = String(output.mock.calls[0]?.[0]);
		expect(line).not.toContain("abc");
		expect(line).not.toContain("private content");
		expect(line).toContain("[REDACTED]");
	});

	it("respects the configured log level", () => {
		process.env.LOG_LEVEL = "warn";
		const output = vi.spyOn(console, "log").mockImplementation(() => {});

		createLogger("video-server").info("queue.started", "Started");

		expect(output).not.toHaveBeenCalled();
	});

	it("sanitizes and bounds errors before database persistence", () => {
		const message = safeErrorMessage(
			new Error(`Bearer private-token ${"x".repeat(100)}`),
			40,
		);

		expect(message).not.toContain("private-token");
		expect(message.length).toBeLessThanOrEqual(43);
	});
});

describe("getRequestId", () => {
	it("keeps an inbound request ID", () => {
		expect(getRequestId(new Headers({ "x-request-id": "incoming" }))).toBe(
			"incoming",
		);
	});

	it("creates a request ID when absent", () => {
		expect(getRequestId(new Headers())).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
	});
});
