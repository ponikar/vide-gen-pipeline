import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import LandingPage from "@/components/landing-redesign/LandingPage";

export const metadata: Metadata = {
	title: "AttentionSpam — You build the app. We handle the content.",
	description:
		"AttentionSpam automatically scripts, creates, and posts brainrot videos to TikTok and Instagram. Zero effort from you.",
};

export default async function Home() {
	const { userId } = await auth();
	return <LandingPage isSignedIn={!!userId} />;
}
