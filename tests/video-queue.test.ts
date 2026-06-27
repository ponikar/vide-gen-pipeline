import { describe, expect, it, vi } from "vitest";
import { JobQueue } from "../apps/video-server/src/queue.js";
import { createLogger } from "../src/logger.js";

describe("JobQueue", () => {
	it("records successful job transitions", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const queue = new JobQueue(async () => "https://example.com/video.mp4", {
			logger: createLogger("video-server-test"),
		});

		const jobId = queue.enqueue({ input: true }, { requestId: "request-1" });

		await vi.waitFor(() => {
			expect(queue.getJob(jobId)).toMatchObject({
				status: "done",
				outputUrl: "https://example.com/video.mp4",
			});
		});
	});

	it("records processor errors without losing the job", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const queue = new JobQueue(
			async () => {
				throw new Error("ffmpeg failed");
			},
			{ logger: createLogger("video-server-test") },
		);

		const jobId = queue.enqueue({ input: true });

		await vi.waitFor(() => {
			expect(queue.getJob(jobId)).toMatchObject({
				status: "failed",
				error: "ffmpeg failed",
			});
		});
	});

	it("keeps excess work pending until capacity is available", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		let releaseFirst: (() => void) | undefined;
		const firstFinished = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		const queue = new JobQueue(
			async (input) => {
				if (input === "first") await firstFinished;
				return `https://example.com/${String(input)}.mp4`;
			},
			{ logger: createLogger("video-server-test"), concurrency: 1 },
		);

		const firstId = queue.enqueue("first");
		const secondId = queue.enqueue("second");

		expect(queue.getJob(firstId)?.status).toBe("running");
		expect(queue.getJob(secondId)?.status).toBe("pending");

		releaseFirst?.();
		await vi.waitFor(() => {
			expect(queue.getJob(secondId)?.status).toBe("done");
		});
	});
});
