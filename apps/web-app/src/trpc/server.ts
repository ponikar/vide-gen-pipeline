import "server-only";

import { createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/api/root";

export const api = appRouter.createCaller(async () => {
  const headers = new Headers();
  headers.set("x-trpc-source", "server");
  return createTRPCContext({ headers });
});
