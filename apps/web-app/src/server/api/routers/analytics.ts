import { and, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { apps, connectedAccounts, cronSchedules, posts } from "@/db/schema";
import { protectedProcedure, router } from "@/server/trpc";

export const analyticsRouter = router({
	getCalendar: protectedProcedure
		.input(
			z.object({
				appId: z.string().uuid(),
				year: z.number().int(),
				month: z.number().int().min(1).max(12),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)),
				);
			if (!app) throw new Error("App not found");

			const start = new Date(input.year, input.month - 1, 1);
			const end = new Date(input.year, input.month, 1);

			const rows = await ctx.db
				.select({
					date: sql<string>`published_at::date`,
					postCount: sql<number>`count(*)::int`,
					totalViews: sql<number>`coalesce(sum(views), 0)::int`,
					totalLikes: sql<number>`coalesce(sum(likes), 0)::int`,
					totalComments: sql<number>`coalesce(sum(comments), 0)::int`,
					totalShares: sql<number>`coalesce(sum(shares), 0)::int`,
					posts: sql<string>`jsonb_agg(jsonb_build_object(
            'id', id, 'title', title, 'platform', platform,
            'views', views, 'likes', likes, 'comments', comments,
            'shares', shares, 'reach', reach, 'link', link,
            'videoType', video_type
          ) order by published_at desc)`,
				})
				.from(posts)
				.where(
					and(
						eq(posts.appId, input.appId),
						gte(posts.publishedAt, start),
						lt(posts.publishedAt, end),
					),
				)
				.groupBy(sql`published_at::date`)
				.orderBy(sql`published_at::date`);

			const [schedule] = await ctx.db
				.select({
					scheduleTime: cronSchedules.scheduleTime,
					timezone: cronSchedules.timezone,
					socialPlatforms: cronSchedules.socialPlatforms,
				})
				.from(cronSchedules)
				.where(
					and(
						eq(cronSchedules.appId, input.appId),
						eq(cronSchedules.enabled, true),
					),
				)
				.limit(1);

			const monthTotalPosts = rows.reduce(
				(sum, r) => sum + r.postCount,
				0,
			);
			const monthTotalViews = rows.reduce(
				(sum, r) => sum + r.totalViews,
				0,
			);

			return {
				days: rows,
				monthTotalPosts,
				monthTotalViews,
				cronSchedule: schedule ?? null,
			};
		}),

	refreshStats: protectedProcedure
		.input(z.object({ appId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.select({ id: apps.id })
				.from(apps)
				.where(
					and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)),
				);
			if (!app) throw new Error("App not found");

			const recentPosts = await ctx.db
				.select({
					id: posts.id,
					platform: posts.platform,
					platformPostId: posts.platformPostId,
				})
				.from(posts)
				.where(
					and(
						eq(posts.appId, input.appId),
						gte(
							posts.publishedAt,
							new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
						),
					),
				);

			const accounts = await ctx.db
				.select({ provider: connectedAccounts.provider, accessToken: connectedAccounts.accessToken })
				.from(connectedAccounts)
				.where(eq(connectedAccounts.appId, input.appId));

			const igToken = accounts.find((a) => a.provider === "instagram")?.accessToken;
			const ttToken = accounts.find((a) => a.provider === "tiktok")?.accessToken;

			for (const post of recentPosts) {
				if (!post.platformPostId) continue;

				try {
					if (post.platform === "instagram" && igToken) {
						const url = new URL(`https://graph.instagram.com/v22.0/${post.platformPostId}/insights`);
						url.searchParams.set("access_token", igToken);
						url.searchParams.set("metric", "reach,views,saved,shares,comments,likes");

						const res = await fetch(url.toString());
						if (!res.ok) continue;
						const json = (await res.json()) as {
							data: Array<{ name: string; values: Array<{ value: number }> }>;
						};

						const stats: Record<string, number> = {};
						for (const i of json.data) stats[i.name] = i.values[0]?.value ?? 0;

						await ctx.db
							.update(posts)
							.set({
								views: stats.views ?? 0,
								likes: stats.likes ?? 0,
								comments: stats.comments ?? 0,
								shares: stats.shares ?? 0,
								reach: stats.reach ?? null,
							})
							.where(eq(posts.id, post.id));
					}

					if (post.platform === "tiktok" && ttToken) {
						const res = await fetch(
							"https://open.tiktokapis.com/v2/video/query/?fields=id,view_count,like_count,comment_count,share_count",
							{
								method: "POST",
								headers: {
									Authorization: `Bearer ${ttToken}`,
									"Content-Type": "application/json",
								},
								body: JSON.stringify({ filters: { video_ids: [post.platformPostId] } }),
							},
						);
						if (!res.ok) continue;
						const json = (await res.json()) as {
							data?: { videos: Array<Record<string, unknown>> };
							error?: { code: string; message: string };
						};
						if (json.error) continue;

						const video = json.data?.videos?.[0];
						if (video) {
							await ctx.db
								.update(posts)
								.set({
									views: Number(video.view_count ?? 0),
									likes: Number(video.like_count ?? 0),
									comments: Number(video.comment_count ?? 0),
									shares: Number(video.share_count ?? 0),
									reach: null,
								})
								.where(eq(posts.id, post.id));
						}
					}
				} catch {
					// API error — skip, retry next time
				}
			}

			return { ok: true };
		}),
});
