import { UserButton } from "@clerk/nextjs";
import { Fish } from "lucide-react";
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
						<Fish className="h-5 w-5 text-yellow-500" />
						<span>Gold Fish</span>
					</Link>
					<div className="ml-auto flex items-center gap-4">
						<UserButton afterSignOutUrl="/sign-in" />
					</div>
				</div>
			</header>
			<div className="flex flex-1">
				<aside className="w-56 border-r bg-muted/30 p-4 hidden md:block">
					<nav className="flex flex-col gap-2">
						<Link
							href="/dashboard"
							className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
						>
							My Apps
						</Link>
						<Link
							href="/dashboard/onboard"
							className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
						>
							New App
						</Link>
					</nav>
				</aside>
				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	);
}
