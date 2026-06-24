"use client";

import {
	ArrowLeft,
	BarChart3,
	Check,
	Clock,
	Copy,
	Loader2,
	Sparkles,
	ThumbsUp,
	Trash2,
	Unlink,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/trpc/react";

function ConnectedAccountsSection({ appId }: { appId: string }) {
	const utils = api.useUtils();
	const { data: accounts, isLoading } = api.connectedAccount.listByApp.useQuery(
		{ appId },
	);

	const disconnectAccount = api.connectedAccount.disconnect.useMutation({
		onSuccess: () => {
			utils.connectedAccount.listByApp.invalidate({ appId });
		},
	});

	const instagramLink = `/api/auth/instagram?appId=${appId}`;
	const tiktokLink = `/api/auth/tiktok?appId=${appId}`;

	const connectedAccount = accounts?.length ? accounts[0] : null;
	const hasInstagram = connectedAccount?.provider === "instagram";
	const hasTiktok = connectedAccount?.provider === "tiktok";

	return (
		<div className="space-y-4">
			<h2 className="text-lg font-semibold">Connected Accounts</h2>

			{isLoading ? (
				<div className="h-16 animate-pulse rounded bg-muted" />
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					<div
						className={`flex items-center justify-between rounded-lg border p-4 ${hasInstagram ? "border-green-500/50 bg-green-500/5" : ""}`}
					>
						<div className="flex items-center gap-3">
							<svg
								viewBox="0 0 24 24"
								className="h-6 w-6"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							>
								<rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
								<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
								<line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
							</svg>
							<div>
								<p className="font-medium">Instagram</p>
								{connectedAccount && hasInstagram && (
									<p className="text-xs text-muted-foreground">
										{connectedAccount.username}
									</p>
								)}
							</div>
						</div>
						{connectedAccount && hasInstagram ? (
							<button
								onClick={() =>
									disconnectAccount.mutate({ id: connectedAccount!.id })
								}
								disabled={disconnectAccount.isPending}
								className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								title="Disconnect"
							>
								<Unlink className="h-4 w-4" />
							</button>
						) : !connectedAccount ? (
							<Link
								href={instagramLink}
								className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
							>
								Connect
							</Link>
						) : null}
					</div>

					<div
						className={`flex items-center justify-between rounded-lg border p-4 ${hasTiktok ? "border-green-500/50 bg-green-500/5" : ""}`}
					>
						<div className="flex items-center gap-3">
							<svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
								<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
							</svg>
							<div>
								<p className="font-medium">TikTok</p>
								{connectedAccount && hasTiktok && (
									<p className="text-xs text-muted-foreground">
										{connectedAccount.username}
									</p>
								)}
							</div>
						</div>
						{connectedAccount && hasTiktok ? (
							<button
								onClick={() =>
									disconnectAccount.mutate({ id: connectedAccount!.id })
								}
								disabled={disconnectAccount.isPending}
								className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								title="Disconnect"
							>
								<Unlink className="h-4 w-4" />
							</button>
						) : !connectedAccount ? (
							<Link
								href={tiktokLink}
								className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
							>
								Connect
							</Link>
						) : null}
					</div>
				</div>
			)}
		</div>
	);
}

type VideoJob = {
	dbId: string;
	videoServerJobId: string;
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

	const { data: app } = api.app.getById.useQuery({ id: appId });
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

	const [started, setStarted] = useState(false);
	const [videos, setVideos] = useState<VideoJob[]>([]);

	useEffect(() => {
		if (existingJobs && existingJobs.length > 0) {
			setStarted(true);
			setVideos(
				existingJobs.map((j) => ({
					dbId: j.id,
					videoServerJobId: j.videoServerJobId ?? "",
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

	function handleStart() {
		setStarted(true);
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
				onError: () => {
					setVideos([]);
					setStarted(false);
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
		saveFineTune.mutate({ appId });
	}

	if (app?.fineTuned) return null;

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
				{!started && (
					<button
						onClick={handleStart}
						disabled={generateVideos.isPending}
						className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{generateVideos.isPending ? "Starting..." : "Start Fine-Tune"}
					</button>
				)}
			</div>

			{(started || (existingJobs && existingJobs.length > 0)) && (
				<div className="grid gap-4 sm:grid-cols-3">
					{videos.length === 0
						? Array.from({ length: 3 }).map((_, i) => (
								<VideoSkeleton key={i} index={i} />
							))
						: videos.map((job, i) => (
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
										<div className="aspect-[9/16] animate-pulse rounded-md bg-muted" />
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
									{(job.status === "pending" || job.status === "running") && (
										<div className="mt-2 flex items-center justify-center gap-2">
											<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
											<span className="text-xs text-muted-foreground">
												{job.status}
											</span>
										</div>
									)}
								</div>
							))}
				</div>
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
				disabled={createSchedule.isPending}
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
				<div className="mt-4 flex gap-2">
					<Link
						href={`/dashboard/${appId}/analytics`}
						className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
					>
						<BarChart3 className="h-3.5 w-3.5" />
						Analytics
					</Link>
				</div>
			</div>

			<VideoFineTuneSection appId={appId} />

			<hr className="border-t" />

			<ConnectedAccountsSection appId={appId} />

			<hr className="border-t" />

			<ScheduleSection appId={appId} app={app} />
		</div>
	);
}
