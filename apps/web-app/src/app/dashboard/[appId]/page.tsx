"use client";

import {
	ArrowLeft,
	Check,
	Clock,
	Copy,
	Loader2,
	Sparkles,
	ThumbsUp,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/trpc/react";


type VideoJob = {
	dbId: string;
	videoServerJobId: string | null;
	status: string;
	outputUrl: string | null;
	liked: boolean | null;
};

function VideoSkeleton({ index }: { index: number }) {
	return (
		<div className="rounded-lg border p-4">
			<p className="mb-2 text-center text-xs text-muted-foreground">
				Video {index + 1}
			</p>
			<div className="aspect-[9/16] animate-pulse rounded-md bg-muted" />
			<div className="mt-2 flex items-center justify-center gap-2">
				<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				<span className="text-xs text-muted-foreground">Generating...</span>
			</div>
		</div>
	);
}

function VideoFineTuneSection({ appId }: { appId: string }) {
	const utils = api.useUtils();

	const { data: existingJobs } = api.videoGeneration.list.useQuery({ appId });

	const generateVideos = api.videoGeneration.generate.useMutation();
	const jobStatus = api.videoGeneration.getStatus.useMutation();
	const setPref = api.videoGeneration.setPreference.useMutation();
	const retryVideo = api.videoGeneration.retry.useMutation();
	const saveFineTune = api.videoGeneration.saveFineTune.useMutation({
		onSuccess: () => {
			utils.app.getById.invalidate({ id: appId });
		},
	});

	const [videos, setVideos] = useState<VideoJob[]>([]);
	const [saveSuccess, setSaveSuccess] = useState(false);

	useEffect(() => {
		if (existingJobs && existingJobs.length > 0) {
			setVideos(
				existingJobs.map((j) => ({
					dbId: j.id,
					videoServerJobId: j.videoServerJobId,
					status: j.status,
					outputUrl: j.outputUrl,
					liked: j.liked,
				})),
			);
		}
	}, [existingJobs]);

	const pollJob = useCallback(
		(dbId: string) => {
			jobStatus.mutate(
				{ id: dbId },
				{
					onSuccess: (updated) => {
						setVideos((prev) =>
							prev.map((v) =>
								v.dbId === dbId
									? {
											...v,
											status: updated.status,
											outputUrl: updated.outputUrl ?? null,
										}
									: v,
							),
						);
						if (updated.status !== "done" && updated.status !== "failed") {
							setTimeout(() => pollJob(dbId), 2000);
						}
					},
					onError: () => {
						setTimeout(() => pollJob(dbId), 2000);
					},
				},
			);
		},
		[jobStatus],
	);

	function handleGenerate() {
		setVideos([]);
		setSaveSuccess(false);
		generateVideos.mutate(
			{ appId },
			{
				onSuccess: (jobs) => {
					setVideos(
						jobs.map((j) => ({
							dbId: j.dbId,
							videoServerJobId: j.videoServerJobId,
							status: "pending",
							outputUrl: null,
							liked: null,
						})),
					);
					jobs.forEach((j) => setTimeout(() => pollJob(j.dbId), 2000));
				},
			},
		);
	}

	function handlePick(dbId: string, current: boolean | null) {
		const next = !current;
		setPref.mutate({ id: dbId, liked: next });
		setVideos((prev) =>
			prev.map((v) => (v.dbId === dbId ? { ...v, liked: next } : v)),
		);
	}

	function handleSave() {
		setSaveSuccess(false);
		saveFineTune.mutate(
			{ appId },
			{
				onSuccess: () => {
					setSaveSuccess(true);
				},
			},
		);
	}

	const hasVideos = videos.length > 0;
	const isGenerating = generateVideos.isPending;
	const someDone = videos.some((v) => v.status === "done");
	const hasPick = videos.some((v) => v.liked === true);
	const canSave = someDone && hasPick;

	return (
		<div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Sparkles className="h-5 w-5 text-primary" />
					<div>
						<p className="text-sm font-medium">Fine-tune your content</p>
						<p className="text-xs text-muted-foreground">
							Generate sample videos to teach the AI your style.
						</p>
					</div>
				</div>
				<button
					onClick={handleGenerate}
					disabled={isGenerating}
					className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{isGenerating ? "Generating..." : hasVideos ? "Regenerate" : "Start Fine-Tune"}
				</button>
			</div>

			{generateVideos.error && (
				<p className="text-sm text-destructive">
					Video generation failed: {generateVideos.error.message}
				</p>
			)}

			{hasVideos && (
				<div className="grid gap-4 sm:grid-cols-3">
					{videos.map((job, i) => (
						<div
							key={job.dbId}
							className={`rounded-lg border p-4 text-center ${
								job.liked === true
									? "border-primary ring-2 ring-primary/30"
									: ""
							} ${job.status === "failed" ? "border-destructive/50 bg-destructive/5" : ""}`}
						>
							<p className="mb-2 text-xs text-muted-foreground">
								Video {i + 1}
							</p>
							{job.status === "pending" || job.status === "running" ? (
								<>
									<div className="aspect-[9/16] animate-pulse rounded-md bg-muted" />
									<div className="mt-2 flex items-center justify-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
										<span className="text-xs text-muted-foreground">
											{job.status}
										</span>
									</div>
								</>
							) : job.status === "done" && job.outputUrl ? (
								<video
									src={job.outputUrl}
									controls
									className="aspect-[9/16] w-full rounded-md object-cover"
								/>
							) : job.status === "failed" ? (
								<div className="flex flex-col aspect-[9/16] items-center justify-center gap-2 rounded-md bg-muted">
									<p className="text-xs text-destructive">Failed</p>
									<button
										onClick={() => {
											retryVideo.mutate(
												{ id: job.dbId },
												{
													onSuccess: (data) => {
														setVideos((prev) =>
															prev.map((v) =>
																v.dbId === job.dbId
																	? {
																			...v,
																			status: "pending" as const,
																			videoServerJobId:
																				data.videoServerJobId!,
																			outputUrl: null,
																			liked: null,
																		}
																	: v,
															),
														);
														setTimeout(() => pollJob(job.dbId), 2000);
													},
												},
											);
										}}
										disabled={retryVideo.isPending}
										className="rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
									>
										{retryVideo.isPending ? "Retrying..." : "Retry"}
									</button>
								</div>
							) : (
								<div className="aspect-[9/16] animate-pulse rounded-md bg-muted" />
							)}
							{job.status === "done" && job.outputUrl && (
								<button
									onClick={() => handlePick(job.dbId, job.liked)}
									className={`mt-2 inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${
										job.liked === true
											? "bg-primary text-primary-foreground"
											: "border hover:bg-accent"
									}`}
								>
									<ThumbsUp className="h-3 w-3" />
									{job.liked === true ? "Selected" : "Select"}
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{saveSuccess && (
				<p className="text-sm text-green-600">Preferences saved successfully!</p>
			)}

			{saveFineTune.error && (
				<p className="text-sm text-destructive">
					Failed to save preferences: {saveFineTune.error.message}
				</p>
			)}

			{someDone && (
				<div className="flex items-center justify-between pt-2">
					<p className="text-xs text-muted-foreground">
						{hasPick
							? ""
							: "Select at least one video to save your preference."}
					</p>
					<button
						onClick={handleSave}
						disabled={!canSave || saveFineTune.isPending}
						className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{saveFineTune.isPending ? "Saving..." : "Save"}
					</button>
				</div>
			)}
		</div>
	);
}

const TIMEZONES = [
	"UTC",
	"US/Eastern",
	"US/Central",
	"US/Mountain",
	"US/Pacific",
	"Europe/London",
	"Europe/Berlin",
	"Europe/Paris",
	"Asia/Kolkata",
	"Asia/Dubai",
	"Asia/Tokyo",
	"Asia/Shanghai",
	"Australia/Sydney",
	"Pacific/Auckland",
];

function ScheduleSection({ appId, app }: { appId: string; app: { fineTuned: boolean | null } }) {
	if (!app.fineTuned) return null;

	return <ScheduleForm appId={appId} />;
}

function ScheduleForm({ appId }: { appId: string }) {
	const utils = api.useUtils();
	const [formTime, setFormTime] = useState("09:00");
	const [formTz, setFormTz] = useState("UTC");
	const [formPlatforms, setFormPlatforms] = useState<string[]>(["instagram"]);
	const [result, setResult] = useState<{
		scheduleId: string;
		secret: string;
		webhookUrl: string;
	} | null>(null);
	const [copied, setCopied] = useState<string | null>(null);

	const { data: existing } = api.cronSchedule.list.useQuery({ appId });
	const { data: accounts } = api.connectedAccount.listByApp.useQuery({ appId });

	const createSchedule = api.cronSchedule.create.useMutation({
		onSuccess: (data) => {
			setResult({
				scheduleId: data.id,
				secret: data.webhookSecret ?? "",
				webhookUrl: data.webhookUrl,
			});
			utils.cronSchedule.list.invalidate({ appId });
		},
	});

	const connectedProviders = new Set(
		(accounts ?? []).map((a) => a.provider),
	);
	const missingPlatforms = formPlatforms.filter(
		(p) => !connectedProviders.has(p),
	);
	const canSchedule = missingPlatforms.length === 0;

	function togglePlatform(p: string) {
		setFormPlatforms((prev) =>
			prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
		);
	}

	if (result) {
		return (
			<div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
				<div className="flex items-center gap-3">
					<Clock className="h-5 w-5 text-primary" />
					<div>
						<p className="text-sm font-medium">Auto-posting is live!</p>
						<p className="text-xs text-muted-foreground">
							Your cron service will POST to this webhook daily at {formTime} {formTz}.
						</p>
					</div>
				</div>
				<div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-3">
					<p className="mb-2 text-xs font-medium">Webhook URL &mdash; copy these now</p>
					<div className="space-y-1.5">
						<CopyField label="URL" value={result.webhookUrl} copied={copied} onCopy={setCopied} />
						<CopyField label="Schedule ID" value={result.scheduleId} copied={copied} onCopy={setCopied} />
						<CopyField label="Secret" value={result.secret} copied={copied} onCopy={setCopied} />
					</div>
				</div>
			</div>
		);
	}

	if (existing && existing.length > 0) {
		return (
			<div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
				<div className="flex items-center gap-3">
					<Clock className="h-5 w-5 text-primary" />
					<div>
						<p className="text-sm font-medium">Auto-posting is active</p>
						<p className="text-xs text-muted-foreground">
							At {existing[0].scheduleTime} {existing[0].timezone} &middot;{" "}
							{existing[0].socialPlatforms?.join(", ") ?? "instagram"}
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 rounded-lg border p-4">
			<div className="flex items-center gap-3">
				<Clock className="h-5 w-5 text-muted-foreground" />
				<div>
					<p className="text-sm font-medium">Schedule auto-posting</p>
					<p className="text-xs text-muted-foreground">
						The AI will generate and publish a video daily at your chosen time.
					</p>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label className="block text-sm font-medium mb-1">Time</label>
					<input
						type="time"
						value={formTime}
						onChange={(e) => setFormTime(e.target.value)}
						className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium mb-1">Timezone</label>
					<select
						value={formTz}
						onChange={(e) => setFormTz(e.target.value)}
						className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{TIMEZONES.map((tz) => (
							<option key={tz} value={tz}>{tz}</option>
						))}
					</select>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium mb-1">Platforms</label>
				<div className="flex gap-2">
					{["instagram", "tiktok"].map((p) => (
						<button
							key={p}
							onClick={() => togglePlatform(p)}
							className={`rounded-md px-3 py-1.5 text-xs border capitalize ${
								formPlatforms.includes(p)
									? "bg-primary text-primary-foreground border-primary"
									: "hover:bg-accent"
							}`}
						>
							{p}
						</button>
					))}
				</div>
			</div>

			{!canSchedule && (
				<p className="text-xs text-destructive">
					Connect your{" "}
					{missingPlatforms
						.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
						.join(" and ")}{" "}
					account{missingPlatforms.length > 1 ? "s" : ""} above before scheduling.
				</p>
			)}

			{createSchedule.error && (
				<p className="text-xs text-destructive">
					{createSchedule.error.message}
				</p>
			)}

			<button
				onClick={() =>
					createSchedule.mutate({
						appId,
						scheduleTime: formTime,
						scheduleDays: ["daily"],
						timezone: formTz,
						socialPlatforms: formPlatforms.length > 0 ? formPlatforms : undefined,
					})
				}
				disabled={!canSchedule || createSchedule.isPending}
				className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
			>
				{createSchedule.isPending ? "Setting up..." : "Start Auto-Posting"}
			</button>
		</div>
	);
}

function CopyField({
	label,
	value,
	copied,
	onCopy,
}: {
	label: string;
	value: string;
	copied: string | null;
	onCopy: (v: string | null) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<span className="w-20 shrink-0 text-xs text-muted-foreground">{label}:</span>
			<code className="flex-1 truncate rounded bg-muted px-3 py-1.5 text-xs font-mono">{value}</code>
			<button
				onClick={async () => {
					await navigator.clipboard.writeText(value);
					onCopy(label);
					setTimeout(() => onCopy(null), 2000);
				}}
				className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
			>
				{copied === label ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
			</button>
		</div>
	);
}

export default function AppDetailPage() {
	const { appId } = useParams<{ appId: string }>();
	const router = useRouter();
	const utils = api.useUtils();

	const { data: app, isLoading: appLoading } = api.app.getById.useQuery({
		id: appId,
	});
	const deleteApp = api.app.delete.useMutation({
		onSuccess: () => {
			utils.app.list.invalidate();
			router.push("/dashboard");
		},
	});

	// TODO: remove redirect once Settings page is ready
	// Temporarily redirecting to analytics as the landing page for an app
	useEffect(() => {
		router.replace(`/dashboard/${appId}/analytics`);
	}, [appId, router]);

	if (appLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted" />
				<div className="h-4 w-72 animate-pulse rounded bg-muted" />
			</div>
		);
	}

	if (!app) {
		return (
			<div className="flex flex-col items-center justify-center py-20">
				<p className="text-lg font-medium">App not found</p>
				<Link
					href="/dashboard"
					className="mt-2 text-sm text-muted-foreground hover:text-foreground"
				>
					Back to dashboard
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-10">
			<div>
				<Link
					href="/dashboard"
					className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to apps
				</Link>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">{app.name}</h1>
						{app.description && (
							<p className="text-sm text-muted-foreground">{app.description}</p>
						)}
					</div>
					<button
						onClick={() => {
							if (confirm("Delete this app and all its posts?"))
								deleteApp.mutate({ id: appId });
						}}
						className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
					>
						<Trash2 className="h-4 w-4" />
						Delete
					</button>
				</div>

			</div>

			<VideoFineTuneSection appId={appId} />

			<ScheduleSection appId={appId} app={app} />
		</div>
	);
}
