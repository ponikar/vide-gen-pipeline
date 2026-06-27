import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/db";
import {
	createLogger,
	elapsedMs,
	getRequestId,
} from "@/logger";

const logger = createLogger("web");

export const createTRPCContext = async (opts: {
	headers: Headers;
	requestId?: string;
}) => {
	const requestId = opts.requestId ?? getRequestId(opts.headers);
	return {
		...opts,
		db,
		requestId,
		logger: logger.child({ requestId }),
	};
};

const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

export const router = t.router;
const withLogging = t.middleware(async ({ ctx, path, type, next }) => {
	const startedAt = performance.now();
	const procedureLogger = ctx.logger.child({ procedure: path, procedureType: type });
	procedureLogger.info("trpc.request_started", "tRPC request started");

	try {
		const result = await next();
		if (result.ok) {
			procedureLogger.info("trpc.request_completed", "tRPC request completed", {
				durationMs: elapsedMs(startedAt),
			});
		} else {
			procedureLogger.error(
				"trpc.request_failed",
				"tRPC request failed",
				result.error,
				{ durationMs: elapsedMs(startedAt) },
			);
		}
		return result;
	} catch (error) {
		procedureLogger.error("trpc.request_failed", "tRPC request crashed", error, {
			durationMs: elapsedMs(startedAt),
		});
		throw error;
	}
});

export const publicProcedure = t.procedure.use(withLogging);

const isAuthed = t.middleware(async ({ ctx, next }) => {
	const { userId } = await auth();
	if (!userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({
		ctx: {
			clerkUserId: userId,
			db: ctx.db,
			requestId: ctx.requestId,
			logger: ctx.logger.child({ clerkUserId: userId }),
		},
	});
});

export const protectedProcedure = t.procedure.use(withLogging).use(isAuthed);
