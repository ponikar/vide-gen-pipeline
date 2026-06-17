import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "@/server/trpc";
import { apiKeys, apps } from "@/db/schema";
import { generateApiKey } from "@/lib/crypto";

export const apiKeyRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        appId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [app] = await ctx.db
        .select()
        .from(apps)
        .where(and(eq(apps.id, input.appId), eq(apps.clerkUserId, ctx.clerkUserId)));
      if (!app) throw new Error("App not found");

      const { value, prefix, hash } = await generateApiKey();

      await ctx.db.insert(apiKeys).values({
        clerkUserId: ctx.clerkUserId,
        name: input.name,
        keyPrefix: prefix,
        keyHash: hash,
        appId: input.appId,
      });

      return { keyValue: value, name: input.name, prefix, appId: input.appId };
    }),

  list: protectedProcedure
    .input(z.object({ appId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          appId: apiKeys.appId,
          lastUsedAt: apiKeys.lastUsedAt,
          revokedAt: apiKeys.revokedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.appId, input.appId),
            eq(apiKeys.clerkUserId, ctx.clerkUserId),
          ),
        )
        .orderBy(desc(apiKeys.createdAt));
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [key] = await ctx.db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(eq(apiKeys.id, input.id), eq(apiKeys.clerkUserId, ctx.clerkUserId)),
        )
        .returning();
      if (!key) throw new Error("Key not found");
      return key;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [key] = await ctx.db
        .delete(apiKeys)
        .where(
          and(eq(apiKeys.id, input.id), eq(apiKeys.clerkUserId, ctx.clerkUserId)),
        )
        .returning();
      if (!key) throw new Error("Key not found");
      return key;
    }),
});
