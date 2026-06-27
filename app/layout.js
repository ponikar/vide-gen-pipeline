import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Vid-Gen-Scale — You build the app. We handle the content.",
  description:
    "Vid-Gen-Scale automatically scripts, creates, and posts brainrot videos to TikTok and Instagram. Zero effort from you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* Lenis smooth scroll (same CDN as the original site) */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
