import { afterEach, describe, expect, it, vi } from "vitest";
import { TikTokClient } from "../src/tiktok/client.js";
import { uploadDraft } from "../src/tiktok/post.js";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("TikTok draft upload", () => {
	it("initializes an inbox upload and waits for inbox delivery", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(new Uint8Array([1, 2, 3]), {
					status: 200,
					headers: { "Content-Type": "video/mp4" },
				}),
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);

		const post = vi
			.fn()
			.mockResolvedValueOnce({
				upload_url: "https://upload.example/video",
				publish_id: "publish-1",
			})
			.mockResolvedValueOnce({ status: "SEND_TO_USER_INBOX" });
		const client = { post } as unknown as TikTokClient;
		const initialized = vi.fn();

		await expect(
			uploadDraft(client, "https://video.example/render.mp4", initialized),
		).resolves.toEqual({ publishId: "publish-1" });

		expect(post).toHaveBeenNthCalledWith(
			1,
			"/post/publish/inbox/video/init/",
			expect.objectContaining({
				source_info: expect.objectContaining({ source: "FILE_UPLOAD" }),
			}),
		);
		expect(post).toHaveBeenNthCalledWith(
			2,
			"/post/publish/status/fetch/",
			{ publish_id: "publish-1" },
		);
		expect(initialized).toHaveBeenCalledWith("publish-1");
	});

	it("accepts TikTok's success error envelope", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn<typeof fetch>().mockResolvedValue(
				Response.json({
					data: { publish_id: "publish-1" },
					error: { code: "ok", message: "" },
				}),
			),
		);

		const client = new TikTokClient("token");
		await expect(client.post("/test", {})).resolves.toEqual({
			publish_id: "publish-1",
		});
	});
});
