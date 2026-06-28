export const dynamic = "force-dynamic";

export function GET() {
	return new Response(
		"tiktok-developers-site-verification=6EYom0JFxBg8JCtoEIZhWDSgBciqXxUQ",
		{
			headers: { "content-type": "text/plain" },
		},
	);
}
