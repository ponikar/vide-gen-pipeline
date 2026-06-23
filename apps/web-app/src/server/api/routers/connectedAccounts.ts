import { eq } from "drizzle-orm";
import { z } from "zod";
import { connectedAccounts } from "@/db/schema";
import { protectedProcedure, router } from "@/server/trpc";

export const connectedAccountRouter = router({
	listByApp: protectedProcedure
		.input(z.object({ appId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(connectedAccounts)
				.where(eq(connectedAccounts.appId, input.appId));
		}),

	disconnect: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(connectedAccounts)
				.set({ appId: null })
				.where(eq(connectedAccounts.id, input.id));

			return { success: true };
		}),
});
