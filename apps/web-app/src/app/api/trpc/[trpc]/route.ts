import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@/server";
import {
	getRequestId,
	REQUEST_ID_HEADER,
} from "../../../../../../../src/logger.js";

const handler = async (req: Request) => {
	const requestId = getRequestId(req.headers);
	const response = await fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: () =>
			createTRPCContext({ headers: req.headers, requestId }),
	});
	const headers = new Headers(response.headers);
	headers.set(REQUEST_ID_HEADER, requestId);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};

export { handler as GET, handler as POST };
