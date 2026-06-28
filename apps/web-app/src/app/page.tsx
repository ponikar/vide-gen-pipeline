import type { Metadata } from "next";
import LandingPage from "@/components/landing-redesign/LandingPage";

export const metadata: Metadata = {
	title: "AttentionSpam — You build the app. We handle the content.",
	description:
		"AttentionSpam automatically scripts, creates, and posts brainrot videos to TikTok and Instagram. Zero effort from you.",
};

export default function Home() {
	return <LandingPage />;
}
