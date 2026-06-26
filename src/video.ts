import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { isHttpUrl } from "./config.js";

export async function resolveVideoSource(
	video: string,
	tempDir: string,
): Promise<string> {
	if (isHttpUrl(video)) {
		return downloadVideo(video, tempDir);
	}

	await assertReadableFile(video);
	return video;
}

async function downloadVideo(url: string, tempDir: string): Promise<string> {
	if (!url.toLowerCase().split("?")[0].endsWith(".mp4")) {
		throw new Error("Only direct downloadable MP4 URLs are supported.");
	}

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to download video from ${url}: ${response.status} ${response.statusText}`,
		);
	}

	const contentType = response.headers.get("content-type") ?? "";
	if (
		contentType &&
		!contentType.includes("video/") &&
		!contentType.includes("application/octet-stream")
	) {
		throw new Error(
			`URL did not return a video content type from ${url}: ${contentType}`,
		);
	}

	await mkdir(tempDir, { recursive: true });
	const outputPath = path.join(tempDir, "source.mp4");
	const bytes = new Uint8Array(await response.arrayBuffer());
	await writeFile(outputPath, bytes);
	return outputPath;
}

async function assertReadableFile(filePath: string): Promise<void> {
	try {
		const info = await stat(filePath);
		if (!info.isFile()) {
			throw new Error(`${filePath} is not a file.`);
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Video file is not readable: ${filePath}`);
		}
		throw error;
	}
}
