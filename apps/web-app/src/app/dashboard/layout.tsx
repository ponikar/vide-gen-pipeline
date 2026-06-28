import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="flex h-14 items-center px-4">
					<Link
						href="/dashboard"
						className="flex items-center gap-2 font-semibold"
					>
						<img src="/logo.png" alt="AttentionSpam" width="20" height="20" />
						<span>AttentionSpam</span>
					</Link>
					<div className="ml-auto flex items-center gap-4">
						<UserButton afterSignOutUrl="/sign-in" />
					</div>
				</div>
			</header>
			<main className="flex-1">{children}</main>
		</div>
	);
}
