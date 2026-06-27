import { afterEach, describe, expect, it, vi } from "vitest";
import { withRouteLogging } from "../apps/web-app/src/server/http-logging.js";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("withRouteLogging", () => {
	it("adds a request ID to immutable redirect responses", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const request = new Request("https://example.com/api/auth", {
			headers: { "x-request-id": "request-1" },
		});

		const response = await withRouteLogging(
			"oauth.test",
			request,
			async () => Response.redirect("https://example.com/done", 302),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("https://example.com/done");
		expect(response.headers.get("x-request-id")).toBe("request-1");
	});
});
