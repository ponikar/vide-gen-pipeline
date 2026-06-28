import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/react";
import "@/styles/globals.css";
import "@/styles/landing-redesign.css";

const inter = Inter({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700", "800", "900"],
	display: "swap",
	variable: "--font-inter",
});

const dmSans = DM_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-dm-sans",
});

const jetBrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-jetbrains-mono",
});

export const metadata = {
	title: "Gold Fish — You built the app. Let AI find the audience.",
	description:
		"Gold Fish posts short-form videos to Instagram & TikTok every week, learns what drives installs, and builds your audience on autopilot.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider>
			<html
				lang="en"
				className={`${inter.variable} ${dmSans.variable} ${jetBrainsMono.variable}`}
			>
				<body>
					<TRPCReactProvider headers={new Headers()}>
						{children}
					</TRPCReactProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
