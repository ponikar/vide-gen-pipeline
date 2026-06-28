"use client";

import { Loader2, Unlink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";

export default function SocialPage() {
	const { appId } = useParams<{ appId: string }>();
	const utils = api.useUtils();

	const { data: accounts, isLoading } = api.connectedAccount.listByApp.useQuery(
		{ appId },
	);

	const disconnectAccount = api.connectedAccount.disconnect.useMutation({
		onSuccess: () => {
			utils.connectedAccount.listByApp.invalidate({ appId });
		},
	});

	const instagramLink = `/api/auth/instagram?appId=${appId}`;
	const tiktokLink = `/api/auth/tiktok?appId=${appId}`;

	const connectedAccount = accounts?.length ? accounts[0] : null;
	const hasInstagram = connectedAccount?.provider === "instagram";
	const hasTiktok = connectedAccount?.provider === "tiktok";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Social</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Connect your social media accounts to start posting.
				</p>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2">
					<div
						className={`flex items-center justify-between rounded-lg border p-5 ${hasInstagram ? "border-green-500/50 bg-green-500/5" : ""}`}
					>
						<div className="flex items-center gap-4">
							<svg
								viewBox="0 0 24 24"
								className="h-7 w-7"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							>
								<rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
								<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
								<line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
							</svg>
							<div>
								<p className="font-medium">Instagram</p>
								{connectedAccount && hasInstagram && (
									<p className="text-sm text-muted-foreground">
										@{connectedAccount.username}
									</p>
								)}
								{!connectedAccount && (
									<p className="text-sm text-muted-foreground">Not connected</p>
								)}
							</div>
						</div>
						{connectedAccount && hasInstagram ? (
							<button
								onClick={() =>
									disconnectAccount.mutate({ id: connectedAccount!.id })
								}
								disabled={disconnectAccount.isPending}
								className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								title="Disconnect"
							>
								<Unlink className="h-4 w-4" />
							</button>
						) : (
							<Link
								href={instagramLink}
								className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
							>
								Connect
							</Link>
						)}
					</div>

					<div
						className={`flex items-center justify-between rounded-lg border p-5 ${hasTiktok ? "border-green-500/50 bg-green-500/5" : ""}`}
					>
						<div className="flex items-center gap-4">
							<svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
								<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
							</svg>
							<div>
								<p className="font-medium">TikTok</p>
								{connectedAccount && hasTiktok && (
									<p className="text-sm text-muted-foreground">
										@{connectedAccount.username}
									</p>
								)}
								{!connectedAccount && (
									<p className="text-sm text-muted-foreground">Not connected</p>
								)}
							</div>
						</div>
						{connectedAccount && hasTiktok ? (
							<button
								onClick={() =>
									disconnectAccount.mutate({ id: connectedAccount!.id })
								}
								disabled={disconnectAccount.isPending}
								className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								title="Disconnect"
							>
								<Unlink className="h-4 w-4" />
							</button>
						) : (
							<Link
								href={tiktokLink}
								className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
							>
								Connect
							</Link>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
