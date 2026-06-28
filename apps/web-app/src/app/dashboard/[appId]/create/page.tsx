"use client";

import {
	ArrowLeft,
	CalendarClock,
	Loader2,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";

type VideoJob = {
	id: string;
	status: string;
	outputUrl: string | null;
	error: string | null;
};

export default function CreatePostPage() {
	const { appId } = useParams<{ appId: string }>();
	const utils = api.useUtils();
	const polledJobId = useRef<string | null>(null);

	const [idea, setIdea] = useState("");
	const [job, setJob] = useState<VideoJob | null>(null);
	const [date, setDate] = useState("");
	const [time, setTime] = useState("");
	const [timezone, setTimezone] = useState("UTC");
	const [formError, setFormError] = useState<string | null>(null);

	const { data: app, isLoading: appLoading } = api.app.getById.useQuery({
		id: appId,
	});
	const { data: accounts } = api.connectedAccount.listByApp.useQuery({ appId });
	const { data: posts } = api.post.listByApp.useQuery({ appId });

	const generate = api.videoGeneration.generate.useMutation();
	const getStatus = api.videoGeneration.getStatus.useMutation();
	const schedulePost = api.cronSchedule.schedulePost.useMutation({
		onSuccess: () => {
			utils.post.listByApp.invalidate({ appId });
		},
	});

	const hasTikTok = accounts?.some((account) => account.provider === "tiktok");
	const relatedPost = posts?.find(
		(post) =>
			post.videoJobId === job?.id &&
			post.platform === "tiktok" &&
			post.type === "user_approved",
	);
	const isScheduled = Boolean(relatedPost);

	const pollJob = useCallback(
		(id: string) => {
			getStatus.mutate(
				{ id },
				{
					onSuccess: (updated) => {
						setJob((current) =>
							current?.id === id
								? {
										...current,
										status: updated.status,
										outputUrl: updated.outputUrl,
										error: updated.error,
									}
								: current,
						);
						if (updated.status !== "done" && updated.status !== "failed") {
							window.setTimeout(() => pollJob(id), 2000);
						}
					},
					onError: () => {
						window.setTimeout(() => pollJob(id), 2000);
					},
				},
			);
		},
		[getStatus],
	);

	useEffect(() => {
		setTimezone(
			Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		);
	}, []);

	useEffect(() => {
		if (
			job &&
			(job.status === "pending" || job.status === "running") &&
			polledJobId.current !== job.id
		) {
			polledJobId.current = job.id;
			pollJob(job.id);
		}
	}, [job, pollJob]);

	function generateVideo() {
		const trimmedIdea = idea.trim();
		if (!trimmedIdea) return;
		setFormError(null);
		generate.mutate(
			{ appId, idea: trimmedIdea },
			{
				onSuccess: ([created]) => {
					if (!created) return;
					const nextJob = {
						id: created.dbId,
						status: created.videoServerJobId ? "running" : "failed",
						outputUrl: null,
						error: created.videoServerJobId
							? null
							: "The video could not be queued.",
					};
					polledJobId.current = null;
					setJob(nextJob);
				},
				onError: (error) => setFormError(error.message),
			},
		);
	}

	function scheduleVideo() {
		setFormError(null);
		if (!job?.outputUrl || !date || !time) {
			setFormError("Choose a date and local time.");
			return;
		}

		const scheduledAt = new Date(`${date}T${time}:00`);
		if (Number.isNaN(scheduledAt.getTime())) {
			setFormError("Choose a valid date and local time.");
			return;
		}
		const resolvedDate = [
			scheduledAt.getFullYear(),
			String(scheduledAt.getMonth() + 1).padStart(2, "0"),
			String(scheduledAt.getDate()).padStart(2, "0"),
		].join("-");
		const resolvedTime = [
			String(scheduledAt.getHours()).padStart(2, "0"),
			String(scheduledAt.getMinutes()).padStart(2, "0"),
		].join(":");
		if (resolvedDate !== date || resolvedTime !== time) {
			setFormError(
				"That local time does not exist in your timezone. Choose another time.",
			);
			return;
		}
		if (scheduledAt.getTime() < Date.now() + 2 * 60 * 1000) {
			setFormError("Choose a time at least two minutes from now.");
			return;
		}

		schedulePost.mutate(
			{
				appId,
				videoJobId: job.id,
				scheduledAt,
				timezone,
			},
			{ onError: (error) => setFormError(error.message) },
		);
	}

	if (appLoading) {
		return (
			<div className="flex justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!app) {
		return <p>App not found.</p>;
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div>
				<Link
					href={`/dashboard/${appId}`}
					className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to {app.name}
				</Link>
				<h1 className="text-2xl font-bold">Create a TikTok post</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Describe the video you want. You will review it before anything is
					sent to TikTok.
				</p>
			</div>

			{!hasTikTok ? (
				<div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4">
					<p className="text-sm font-medium">Connect TikTok first</p>
					<p className="mt-1 text-xs text-muted-foreground">
						A connected TikTok account is required to generate and schedule
						this post.
					</p>
					<Link
						href={`/api/auth/tiktok?appId=${appId}`}
						className="mt-3 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
					>
						Connect TikTok
					</Link>
				</div>
			) : (
				<>
					<div className="space-y-3 rounded-lg border p-4">
						<label htmlFor="idea" className="text-sm font-medium">
							Video idea
						</label>
						<textarea
							id="idea"
							value={idea}
							onChange={(event) => setIdea(event.target.value)}
							maxLength={2000}
							rows={5}
							disabled={generate.isPending}
							placeholder="For example: Explain why people keep checking their phone at bedtime and show how my app helps."
							className="block w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
						/>
						<button
							type="button"
							onClick={generateVideo}
							disabled={!idea.trim() || generate.isPending}
							className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{generate.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : job?.status === "done" || job?.status === "failed" ? (
								<RefreshCw className="h-4 w-4" />
							) : (
								<Sparkles className="h-4 w-4" />
							)}
							{generate.isPending
								? "Creating script..."
								: job?.status === "done" || job?.status === "failed"
									? "Regenerate"
									: "Generate video"}
						</button>
					</div>

					{job && (
						<div className="space-y-4 rounded-lg border p-4">
							<h2 className="font-semibold">Video preview</h2>
							{job.status === "done" && job.outputUrl ? (
								<video
									src={job.outputUrl}
									controls
									className="mx-auto aspect-[9/16] max-h-[560px] w-auto rounded-md bg-black"
								/>
							) : job.status === "failed" ? (
								<div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
									{job.error || "Video generation failed. Try regenerating it."}
								</div>
							) : (
								<div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md bg-muted">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									<p className="text-sm text-muted-foreground">
										Generating your video…
									</p>
								</div>
							)}
						</div>
					)}

					{job?.status === "done" && job.outputUrl && !isScheduled && (
						<div className="space-y-4 rounded-lg border p-4">
							<div className="flex items-center gap-2">
								<CalendarClock className="h-5 w-5 text-muted-foreground" />
								<div>
									<h2 className="font-semibold">Schedule this video</h2>
									<p className="text-xs text-muted-foreground">
										The selected time uses your local timezone: {timezone}
									</p>
								</div>
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label htmlFor="post-date" className="mb-1 block text-sm font-medium">
										Date
									</label>
									<input
										id="post-date"
										type="date"
										value={date}
										onChange={(event) => setDate(event.target.value)}
										className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									/>
								</div>
								<div>
									<label htmlFor="post-time" className="mb-1 block text-sm font-medium">
										Local time
									</label>
									<input
										id="post-time"
										type="time"
										value={time}
										onChange={(event) => setTime(event.target.value)}
										className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									/>
								</div>
							</div>
							<p className="text-xs text-muted-foreground">
								At this time, Gold Fish will send the approved video to your
								TikTok Inbox. Open the TikTok notification to review and publish it.
							</p>
							<button
								type="button"
								onClick={scheduleVideo}
								disabled={!date || !time || schedulePost.isPending}
								className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{schedulePost.isPending && (
									<Loader2 className="h-4 w-4 animate-spin" />
								)}
								Schedule TikTok upload
							</button>
						</div>
					)}

					{relatedPost && (
						<div className="rounded-lg border border-green-500/40 bg-green-500/5 p-4">
							<p className="text-sm font-medium">
								{relatedPost.status === "sent_to_inbox"
									? "Video sent to TikTok Inbox"
									: relatedPost.status === "failed"
										? "TikTok upload failed"
										: "TikTok upload scheduled"}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{relatedPost.status === "sent_to_inbox"
									? "Open TikTok and use the inbox notification to finish your post."
									: relatedPost.scheduledAt
										? new Date(relatedPost.scheduledAt).toLocaleString()
										: "Your approved video is scheduled."}
							</p>
						</div>
					)}
				</>
			)}

			{(formError || generate.error || schedulePost.error) && (
				<p className="text-sm text-destructive">
					{formError || generate.error?.message || schedulePost.error?.message}
				</p>
			)}
		</div>
	);
}
