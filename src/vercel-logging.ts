import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createLogger, elapsedMs, REQUEST_ID_HEADER } from "./logger.js";

type VercelHandler = (
	request: VercelRequest,
	response: VercelResponse,
) => Promise<unknown> | unknown;

const logger = createLogger("api");

export function withVercelLogging(
	route: string,
	handler: VercelHandler,
): VercelHandler {
	return async (request, response) => {
		const incomingRequestId = request.headers[REQUEST_ID_HEADER];
		const requestId =
			(typeof incomingRequestId === "string"
				? incomingRequestId
				: incomingRequestId?.[0]) || randomUUID();
		const startedAt = performance.now();
		const requestLogger = logger.child({
			requestId,
			route,
			method: request.method,
		});
		response.setHeader(REQUEST_ID_HEADER, requestId);
		requestLogger.info("http.request_started", "API request started");

		response.once("finish", () => {
			const fields = {
				status: response.statusCode,
				durationMs: elapsedMs(startedAt),
			};
			if (response.statusCode >= 400) {
				requestLogger.warn(
					"http.request_completed",
					"API request returned an error",
					fields,
				);
			} else {
				requestLogger.info("http.request_completed", "API request completed", fields);
			}
		});

		try {
			return await handler(request, response);
		} catch (error) {
			requestLogger.error("http.request_failed", "API request crashed", error, {
				status: response.statusCode,
				durationMs: elapsedMs(startedAt),
			});
			throw error;
		}
	};
}
