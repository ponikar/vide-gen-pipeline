import { randomUUID } from "node:crypto";

export type JobStatus = "pending" | "running" | "done" | "failed";

export type Job = {
	id: string;
	status: JobStatus;
	createdAt: number;
	outputUrl?: string;
	error?: string;
	progress?: string;
	input: unknown;
};

type JobQueueOptions = {
	concurrency?: number;
};

export class JobQueue {
	private jobs = new Map<string, Job>();
	private pending: string[] = [];
	private running = 0;
	private maxConcurrency: number;
	private processor: (input: unknown, jobId: string) => Promise<string>;

	constructor(
		processor: (input: unknown, jobId: string) => Promise<string>,
		options: JobQueueOptions = {},
	) {
		this.processor = processor;
		this.maxConcurrency = options.concurrency ?? 1;
	}

	enqueue(input: unknown): string {
		const id = randomUUID();
		const job: Job = {
			id,
			status: "pending",
			createdAt: Date.now(),
			input,
		};
		this.jobs.set(id, job);
		this.pending.push(id);
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

			this.processor(job.input, id)
				.then((outputUrl) => {
					job.status = "done";
					job.outputUrl = outputUrl;
					console.log(`[queue] Job ${id} completed`);
				})
				.catch((err: unknown) => {
					job.status = "failed";
					job.error = err instanceof Error ? err.message : String(err);
					console.error(`[queue] Job ${id} failed:`, job.error);
				})
				.finally(() => {
					this.running--;
					this.tick();
				});
		}
	}
}
