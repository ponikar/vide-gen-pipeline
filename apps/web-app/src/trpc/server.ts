import "server-only";

import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/trpc";

export const api = appRouter.createCaller(async () => {
	const headers = new Headers();
	headers.set("x-trpc-source", "server");
	return createTRPCContext({ headers });
});
