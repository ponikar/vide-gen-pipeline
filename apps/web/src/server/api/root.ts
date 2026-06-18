import { router } from "@/server/trpc";
import { appRouter as appsRouter } from "./routers/apps";
import { postRouter } from "./routers/posts";
import { apiKeyRouter } from "./routers/apiKey";
import { connectedAccountRouter } from "./routers/connectedAccounts";

export const appRouter = router({
  app: appsRouter,
  post: postRouter,
  apiKey: apiKeyRouter,
  connectedAccount: connectedAccountRouter,
});

export type AppRouter = typeof appRouter;
