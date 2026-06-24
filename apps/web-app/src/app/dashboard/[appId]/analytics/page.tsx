"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/trpc/react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type DayData = {
	date: string;
	postCount: number;
	totalViews: number;
	totalLikes: number;
	totalComments: number;
	totalShares: number;
	posts: string;
};

function parseDayPosts(raw: string) {
	try {
		return JSON.parse(raw) as Array<{
			id: string;
			title: string;
			platform: string;
			views: number;
			likes: number;
			comments: number;
			shares: number;
			reach: number | null;
			link: string | null;
			videoType: string | null;
		}>;
	} catch {
		return [];
	}
}

function cellColor(views: number): string {
	if (views === 0) return "";
	if (views < 100) return "bg-green-100 text-green-800";
	if (views < 1000) return "bg-amber-100 text-amber-800";
	return "bg-yellow-100 text-yellow-800";
}

export default function AnalyticsPage() {
	const { appId } = useParams<{ appId: string }>();
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);

	const { data, isLoading, refetch } = api.analytics.getCalendar.useQuery({
		appId,
		year,
		month,
	});

	const refreshStats = api.analytics.refreshStats.useMutation({
		onSuccess: () => refetch(),
	});

	const daysMap = new Map<string, DayData>();
	if (data) {
		for (const d of data.days) {
			daysMap.set(d.date, d);
		}
	}

	const scheduleDays =
		data?.cronSchedule?.scheduleTime
			? { time: data.cronSchedule.scheduleTime, tz: data.cronSchedule.timezone ?? "UTC" }
			: null;

	const firstDay = new Date(year, month - 1, 1);
	const lastDay = new Date(year, month, 0);
	const startOffset = firstDay.getDay();
	const totalDays = lastDay.getDate();

	const cells: Array<{ day: number; empty: boolean }> = [];
	for (let i = 0; i < startOffset; i++) cells.push({ day: 0, empty: true });
	for (let d = 1; d <= totalDays; d++) cells.push({ day: d, empty: false });

	function prevMonth() {
		if (month === 1) {
			setYear(year - 1);
			setMonth(12);
		} else {
			setMonth(month - 1);
		}
		setSelectedDate(null);
	}

	function nextMonth() {
		if (month === 12) {
			setYear(year + 1);
			setMonth(1);
		} else {
			setMonth(month + 1);
		}
		setSelectedDate(null);
	}

	function dateStr(day: number) {
		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}

	const selectedDay = selectedDate ? daysMap.get(selectedDate) : null;

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<div>
				<Link
					href={`/dashboard/${appId}`}
					className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to app
				</Link>
				<h1 className="text-2xl font-bold">Analytics</h1>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : (
				<>
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="text-sm text-muted-foreground">
							{data ? (
								<>
									<span className="font-semibold text-foreground">{data.monthTotalPosts}</span> posts &middot;{" "}
									<span className="font-semibold text-foreground">{data.monthTotalViews.toLocaleString()}</span> views this month
									{scheduleDays && (
										<>
											<span className="mx-2">&middot;</span>
											Auto-posts daily at {scheduleDays.time} {scheduleDays.tz}
										</>
									)}
								</>
							) : null}
						</div>
						<button
							onClick={() => refreshStats.mutate({ appId })}
							disabled={refreshStats.isPending}
							className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
						>
							<RefreshCw className={`h-3.5 w-3.5 ${refreshStats.isPending ? "animate-spin" : ""}`} />
							{refreshStats.isPending ? "Refreshing..." : "Refresh stats"}
						</button>
					</div>

					<div className="rounded-lg border">
						<div className="flex items-center justify-between border-b px-4 py-3">
							<button onClick={prevMonth} className="rounded-md p-1.5 hover:bg-accent">
								<ChevronLeft className="h-5 w-5" />
							</button>
							<h2 className="text-lg font-semibold">
								{MONTHS[month - 1]} {year}
							</h2>
							<button onClick={nextMonth} className="rounded-md p-1.5 hover:bg-accent">
								<ChevronRight className="h-5 w-5" />
							</button>
						</div>

						<div className="grid grid-cols-7">
							{WEEKDAYS.map((w) => (
								<div key={w} className="border-b bg-muted/30 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
									{w}
								</div>
							))}
							{cells.map((cell, i) => {
								if (cell.empty) {
									return <div key={`e-${i}`} className="border-b p-2" />;
								}
								const ds = dateStr(cell.day);
								const dayData = daysMap.get(ds);
								const isSelected = selectedDate === ds;
								const isToday =
									cell.day === now.getDate() &&
									month === now.getMonth() + 1 &&
									year === now.getFullYear();

								return (
									<div
										key={ds}
										onClick={() =>
											setSelectedDate(isSelected ? null : ds)
										}
										className={`relative cursor-pointer border-b p-2 transition-colors hover:bg-accent/50 ${
											isSelected ? "bg-accent" : ""
										} ${isToday ? "ring-1 ring-inset ring-primary/30" : ""}`}
									>
										<div className="text-xs text-muted-foreground">
											{cell.day}
										</div>
										{dayData && dayData.postCount > 0 && (
											<>
												<div
													className={`mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cellColor(dayData.totalViews)}`}
												>
													{dayData.postCount}
												</div>
												{dayData.totalViews > 0 && (
													<div className="mt-0.5 text-[9px] text-muted-foreground">
														{dayData.totalViews >= 1000
															? `${(dayData.totalViews / 1000).toFixed(1)}k`
															: dayData.totalViews}
													</div>
												)}
											</>
										)}
										{scheduleDays && (
											<div className="absolute right-1.5 top-1.5">
												<div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{selectedDay && (
						<div className="rounded-lg border p-4">
							<h3 className="mb-3 text-sm font-medium">
								{selectedDay.postCount} post{selectedDay.postCount !== 1 ? "s" : ""} &middot;{" "}
								{selectedDay.totalViews.toLocaleString()} views &middot;{" "}
								{selectedDay.totalLikes.toLocaleString()} likes &middot;{" "}
								{selectedDay.totalComments.toLocaleString()} comments &middot;{" "}
								{selectedDay.totalShares.toLocaleString()} shares
							</h3>
							<div className="space-y-2">
								{parseDayPosts(selectedDay.posts).map((p) => (
									<div
										key={p.id}
										className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2"
									>
										<div className="flex items-center gap-2 min-w-0">
											<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
												{p.platform === "instagram" ? "IG" : "TT"}
											</span>
											<span className="truncate text-sm">{p.title}</span>
										</div>
										<div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
											<span>{p.views} views</span>
											<span>{p.likes} likes</span>
											{p.reach !== null && p.reach !== undefined && (
												<span>{p.reach} reach</span>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
