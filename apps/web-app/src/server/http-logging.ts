import {
	createLogger,
	elapsedMs,
	getRequestId,
	type Logger,
	REQUEST_ID_HEADER,
} from "../../../../src/logger.js";

export type RouteContext = {
	logger: Logger;
	requestId: string;
};

const logger = createLogger("web");

export async function withRouteLogging(
	route: string,
	request: Request,
	handler: (context: RouteContext) => Promise<Response>,
): Promise<Response> {
	const requestId = getRequestId(request.headers);
	const startedAt = performance.now();
	const requestLogger = logger.child({
		requestId,
		route,
		method: request.method,
	});
	requestLogger.info("http.request_started", "API request started");

	try {
		const response = await handler({ logger: requestLogger, requestId });
		const headers = new Headers(response.headers);
		headers.set(REQUEST_ID_HEADER, requestId);
		const loggedResponse = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
		const fields = {
			status: response.status,
			durationMs: elapsedMs(startedAt),
		};
		if (response.status >= 400) {
			requestLogger.warn("http.request_completed", "API request returned an error", fields);
		} else {
			requestLogger.info("http.request_completed", "API request completed", fields);
		}
		return loggedResponse;
	} catch (error) {
		requestLogger.error("http.request_failed", "API request crashed", error, {
			durationMs: elapsedMs(startedAt),
		});
		throw error;
	}
}
