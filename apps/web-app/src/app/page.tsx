import type { Metadata } from "next";
import LandingPage from "@/components/landing-redesign/LandingPage";

export const metadata: Metadata = {
	title: "Vid-Gen-Scale — You build the app. We handle the content.",
	description:
		"Vid-Gen-Scale automatically scripts, creates, and posts brainrot videos to TikTok and Instagram. Zero effort from you.",
};

export default function Home() {
	return <LandingPage />;
}
