import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apps, type ScrapedInfo } from "@/db/schema";
import { scrapeAppInfo, scrapedInfoSchema } from "@/server/app-scraper";
import { protectedProcedure, router } from "@/server/trpc";

export const appRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				description: z.string().max(500).optional(),
				scrapedInfo: scrapedInfoSchema.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.insert(apps)
				.values({
					clerkUserId: ctx.clerkUserId,
					name: input.name,
					description: input.description,
					scrapedInfo: input.scrapedInfo as ScrapedInfo | undefined,
				})
				.returning();
			return app;
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select()
			.from(apps)
			.where(eq(apps.clerkUserId, ctx.clerkUserId))
			.orderBy(apps.createdAt);
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.select()
				.from(apps)
				.where(
					and(eq(apps.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)),
				);
			return app ?? null;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				name: z.string().min(1).max(100).optional(),
				description: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.update(apps)
				.set({
					...(input.name ? { name: input.name } : {}),
					...(input.description !== undefined
						? { description: input.description }
						: {}),
				})
				.where(
					and(eq(apps.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)),
				)
				.returning();
			return app;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.delete(apps)
				.where(
					and(eq(apps.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)),
				)
				.returning();
			return app;
		}),

	scrapeUrl: protectedProcedure
		.input(z.object({ url: z.string().url() }))
		.mutation(async ({ input }) => {
			try {
				return await scrapeAppInfo(input.url);
			} catch {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"Couldn't scrape that page. Please try again or fill in the details manually.",
				});
			}
		}),
});
