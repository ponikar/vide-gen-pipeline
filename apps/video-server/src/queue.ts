import { randomUUID } from "node:crypto";
import type { Logger, LogFields } from "../../../src/logger.js";
import { elapsedMs, safeErrorMessage } from "../../../src/logger.js";

export type JobStatus = "pending" | "running" | "done" | "failed";

export type Job = {
	id: string;
	status: JobStatus;
	createdAt: number;
	outputUrl?: string;
	error?: string;
	progress?: string;
	input: unknown;
	context: LogFields;
};

type JobQueueOptions = {
	concurrency?: number;
	logger: Logger;
};

export class JobQueue {
	private jobs = new Map<string, Job>();
	private pending: string[] = [];
	private running = 0;
	private maxConcurrency: number;
	private processor: (
		input: unknown,
		jobId: string,
		context: LogFields,
	) => Promise<string>;
	private logger: Logger;

	constructor(
		processor: (
			input: unknown,
			jobId: string,
			context: LogFields,
		) => Promise<string>,
		options: JobQueueOptions,
	) {
		this.processor = processor;
		this.maxConcurrency = options.concurrency ?? 1;
		this.logger = options.logger;
	}

	enqueue(input: unknown, context: LogFields = {}): string {
		const id = randomUUID();
		const job: Job = {
			id,
			status: "pending",
			createdAt: Date.now(),
			input,
			context,
		};
		this.jobs.set(id, job);
		this.pending.push(id);
		this.logger.info("queue.job_accepted", "Video job accepted", {
			...context,
			jobId: id,
			queueDepth: this.pending.length,
			runningJobs: this.running,
			totalJobs: this.jobs.size,
		});
		this.tick();
		return id;
	}

	getJob(id: string): Job | undefined {
		return this.jobs.get(id);
	}

	private tick(): void {
		while (this.running < this.maxConcurrency && this.pending.length > 0) {
			const id = this.pending.shift()!;
			const job = this.jobs.get(id)!;
			job.status = "running";
			this.running++;
			const startedAt = performance.now();
			const jobLogger = this.logger.child({ ...job.context, jobId: id });
			jobLogger.info("queue.job_started", "Video job started", {
				queueWaitMs: Date.now() - job.createdAt,
				queueDepth: this.pending.length,
				runningJobs: this.running,
			});

			this.processor(job.input, id, job.context)
				.then((outputUrl) => {
					job.status = "done";
					job.outputUrl = outputUrl;
					jobLogger.info("queue.job_completed", "Video job completed", {
						durationMs: elapsedMs(startedAt),
					});
				})
				.catch((err: unknown) => {
					job.status = "failed";
					job.error = safeErrorMessage(err);
					jobLogger.error("queue.job_failed", "Video job failed", err, {
						durationMs: elapsedMs(startedAt),
					});
				})
				.finally(() => {
					this.running--;
					jobLogger.debug("queue.capacity_released", "Queue capacity released", {
						queueDepth: this.pending.length,
						runningJobs: this.running,
					});
					this.tick();
				});
		}
	}
}
