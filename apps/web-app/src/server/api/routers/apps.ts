import { generateObject } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apps, type ScrapedInfo } from "@/db/schema";
import { getScrapeModel } from "@/lib/ai-model";
import { protectedProcedure, router } from "@/server/trpc";

const scrapedInfoSchema = z.object({
	name: z.string(),
	description: z.string(),
	tagline: z.string(),
	targetAudience: z.string(),
	problemSolved: z.string(),
	keyFeatures: z.array(z.string()),
	uniqueSellingPoints: z.array(z.string()),
	toneOfVoice: z.string(),
	keyBenefits: z.array(z.string()),
	useCases: z.array(z.string()),
});

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
				schema: scrapedInfoSchema,
				prompt: `You are a product researcher. Analyze this website content and extract structured information about the app/product.

Extract all of the following:
- name: The app/product name
- description: A short description (max 200 chars) suitable for a tagline
- tagline: The main value proposition or tagline from the site (max 100 chars)
- targetAudience: Who this is for (e.g. "freelance designers", "SaaS founders")
- problemSolved: What specific problem does this solve
- keyFeatures: List of main features (3-6 items)
- uniqueSellingPoints: What makes it different from alternatives (2-4 items)
- toneOfVoice: How the brand communicates (e.g. "professional", "playful", "minimalist")
- keyBenefits: The main benefits users get (3-5 items)
- useCases: Common scenarios where people use this (2-4 items)

Return all fields. Use the actual website content — do not make things up.

Website content:
${text}`,
			});

			return object as ScrapedInfo;
		}),
});
