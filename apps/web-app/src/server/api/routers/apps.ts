import { generateObject } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apps } from "@/db/schema";
import { getScrapeModel } from "@/lib/ai-model";
import { protectedProcedure, router } from "@/server/trpc";

export const appRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				description: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [app] = await ctx.db
				.insert(apps)
				.values({
					clerkUserId: ctx.clerkUserId,
					name: input.name,
					description: input.description,
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
			const response = await fetch(input.url, {
				headers: { "User-Agent": "GoldFish/1.0 (AI scraper)" },
			});
			const html = await response.text();

			const text = html
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
				.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
				.replace(/<[^>]+>/g, " ")
				.replace(/\s+/g, " ")
				.trim()
				.slice(0, 8000);

			const { object } = await generateObject({
				model: getScrapeModel(),
				schema: z.object({
					name: z.string(),
					description: z.string(),
				}),
				prompt: `Extract the app/product name and a short description (max 200 chars) from this website content. Return the name and description.

${text}`,
			});

			return object;
		}),
});
