import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export function GET() {
	const content = readFileSync(
		join(process.cwd(), "public", "tiktok6EYom0JFxBg8JCtoEIZhWDSgBciqXxUQ.txt"),
		"utf-8",
	);
	return new Response(content, {
		headers: { "content-type": "text/plain" },
	});
}
