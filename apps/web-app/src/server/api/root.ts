import { router } from "@/server/trpc";
import { apiKeyRouter } from "./routers/apiKey";
import { appRouter as appsRouter } from "./routers/apps";
import { connectedAccountRouter } from "./routers/connectedAccounts";
import { cronScheduleRouter } from "./routers/cronSchedule";
import { postRouter } from "./routers/posts";
import { videoGenerationRouter } from "./routers/videoGeneration";

export const appRouter = router({
	app: appsRouter,
	post: postRouter,
	apiKey: apiKeyRouter,
	connectedAccount: connectedAccountRouter,
	videoGeneration: videoGenerationRouter,
	cronSchedule: cronScheduleRouter,
});

export type AppRouter = typeof appRouter;
