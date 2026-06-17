import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { apps } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const appRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [app] = await ctx.db.insert(apps).values({
        clerkUserId: ctx.clerkUserId,
        name: input.name,
        description: input.description,
      }).returning();
      return app;
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.select().from(apps)
        .where(eq(apps.clerkUserId, ctx.clerkUserId))
        .orderBy(apps.createdAt);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [app] = await ctx.db.select().from(apps)
        .where(and(eq(apps.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)));
      return app ?? null;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [app] = await ctx.db.update(apps)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
        })
        .where(and(eq(apps.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)))
        .returning();
      return app;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [app] = await ctx.db.delete(apps)
        .where(and(eq(apps.id, input.id), eq(apps.clerkUserId, ctx.clerkUserId)))
        .returning();
      return app;
    }),
});
