"use client";

import { BarChart3, Clapperboard, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { appId } = useParams<{ appId: string }>();
	const pathname = usePathname();

	const navItems = [
		{
			label: "Create Post",
			href: `/dashboard/${appId}/create`,
			icon: Clapperboard,
		},
		{
			label: "Analytics Post",
			href: `/dashboard/${appId}/analytics`,
			icon: BarChart3,
		},
		{
			label: "Social",
			href: `/dashboard/${appId}/social`,
			icon: Share2,
		},
		// {
		// 	label: "Settings",
		// 	href: `/dashboard/${appId}`,
		// 	icon: Settings,
		// },
	];

	return (
		<div className="flex h-full">
			<aside className="w-56 shrink-0 border-r bg-muted/30 p-4 hidden md:block">
				<nav className="flex flex-col gap-2">
					{navItems.map((item) => {
						const Icon = item.icon;
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${
									isActive
										? "bg-accent text-accent-foreground"
										: ""
								}`}
							>
								<Icon className="h-4 w-4" />
								{item.label}
							</Link>
						);
					})}
				</nav>
			</aside>
			<main className="flex-1 overflow-auto p-6">{children}</main>
		</div>
	);
}
