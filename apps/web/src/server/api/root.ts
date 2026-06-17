import { router } from "@/server/trpc";
import { appRouter as appsRouter } from "./routers/apps";
import { postRouter } from "./routers/posts";

export const appRouter = router({
  app: appsRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
