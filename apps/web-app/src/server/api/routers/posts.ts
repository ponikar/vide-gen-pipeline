import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { apps, posts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

const appOwnership = async (ctx: { db: typeof import("@/db").db; clerkUserId: string }, appId: string) => {
  const [app] = await ctx.db.select().from(apps)
    .where(and(eq(apps.id, appId), eq(apps.clerkUserId, ctx.clerkUserId)));
  if (!app) throw new Error("App not found");
  return app;
};

export const postRouter = router({
  create: protectedProcedure
    .input(z.object({
      appId: z.string().uuid(),
      title: z.string().min(1).max(200),
      link: z.string().url().optional(),
      stats: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await appOwnership(ctx, input.appId);
      const [post] = await ctx.db.insert(posts).values({
        appId: input.appId,
        title: input.title,
        link: input.link,
        stats: input.stats,
      }).returning();
      return post;
    }),

  listByApp: protectedProcedure
    .input(z.object({ appId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await appOwnership(ctx, input.appId);
      return ctx.db.select().from(posts)
        .where(eq(posts.appId, input.appId))
        .orderBy(desc(posts.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [post] = await ctx.db.select().from(posts)
        .where(eq(posts.id, input.id));
      if (!post) return null;
      await appOwnership(ctx, post.appId);
      return post;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      link: z.string().url().optional().nullable(),
      stats: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db.select().from(posts)
        .where(eq(posts.id, input.id));
      if (!existing) throw new Error("Post not found");
      await appOwnership(ctx, existing.appId);
      const [post] = await ctx.db.update(posts)
        .set({
          ...(input.title ? { title: input.title } : {}),
          ...(input.link !== undefined ? { link: input.link } : {}),
          ...(input.stats ? { stats: input.stats } : {}),
        })
        .where(eq(posts.id, input.id))
        .returning();
      return post;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db.select().from(posts)
        .where(eq(posts.id, input.id));
      if (!existing) throw new Error("Post not found");
      await appOwnership(ctx, existing.appId);
      const [post] = await ctx.db.delete(posts)
        .where(eq(posts.id, input.id))
        .returning();
      return post;
    }),
});
