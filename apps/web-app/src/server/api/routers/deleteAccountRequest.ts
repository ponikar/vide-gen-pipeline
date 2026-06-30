import { eq } from "drizzle-orm";
import { z } from "zod";
import { deleteAccountRequests } from "@/db/schema";
import { protectedProcedure, router } from "@/server/trpc";

export const deleteAccountRequestRouter = router({
	submitRequest: protectedProcedure
		.input(
			z.object({
				reason: z.string().optional(),
				additionalInfo: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(deleteAccountRequests)
				.where(eq(deleteAccountRequests.clerkUserId, ctx.clerkUserId))
				.limit(1);

			if (existing && existing.status === "pending") {
				throw new Error("You already have a pending delete request.");
			}

			const [request] = await ctx.db
				.insert(deleteAccountRequests)
				.values({
					clerkUserId: ctx.clerkUserId,
					reason: input.reason ?? null,
					additionalInfo: input.additionalInfo ?? null,
				})
				.returning();

			return request;
		}),

	getMyRequest: protectedProcedure.query(async ({ ctx }) => {
		const [request] = await ctx.db
			.select()
			.from(deleteAccountRequests)
			.where(eq(deleteAccountRequests.clerkUserId, ctx.clerkUserId))
			.orderBy(deleteAccountRequests.createdAt)
			.limit(1);

		return request ?? null;
	}),
});
