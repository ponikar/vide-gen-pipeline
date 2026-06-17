import { router } from "@/server/trpc";
import { appRouter as appsRouter } from "./routers/apps";
import { postRouter } from "./routers/posts";
import { apiKeyRouter } from "./routers/apiKey";

export const appRouter = router({
  app: appsRouter,
  post: postRouter,
  apiKey: apiKeyRouter,
});

export type AppRouter = typeof appRouter;
