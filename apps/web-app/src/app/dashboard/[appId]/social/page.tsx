"use client";

import { Loader2, Unlink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { InstagramIcon, TikTokIcon } from "@/components/social-icons";
import { api } from "@/trpc/react";

function AccountCard({
	provider,
	icon,
	account,
	connectHref,
	onDisconnect,
	isDisconnecting,
}: {
	provider: string;
	icon: React.ReactNode;
	account: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
	connectHref: string;
	onDisconnect: (id: string) => void;
	isDisconnecting: boolean;
}) {
	return (
		<div
			className={`flex items-center justify-between rounded-lg border p-5 ${account ? "border-green-500/50 bg-green-500/5" : ""}`}
		>
			<div className="flex items-center gap-4">
				<div className="relative">
					{account?.avatarUrl ? (
						<img
							src={account.avatarUrl}
							alt=""
							className="h-10 w-10 rounded-full object-cover"
						/>
					) : (
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
							{icon}
						</div>
					)}
				</div>
				<div>
					<p className="font-medium capitalize">{provider}</p>
					{account ? (
						<div className="text-sm text-muted-foreground">
							<p>@{account.username}</p>
							{account.displayName && (
								<p className="text-xs">{account.displayName}</p>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">Not connected</p>
					)}
				</div>
			</div>
			{account ? (
				<button
					onClick={() => onDisconnect(account.id)}
					disabled={isDisconnecting}
					className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
					title="Disconnect"
				>
					<Unlink className="h-4 w-4" />
				</button>
			) : (
				<Link
					href={connectHref}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Connect
				</Link>
			)}
		</div>
	);
}

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

	const instagramAccount = accounts?.find((a) => a.provider === "instagram") ?? null;
	const tiktokAccount = accounts?.find((a) => a.provider === "tiktok") ?? null;

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
					<AccountCard
						provider="instagram"
						icon={<InstagramIcon className="h-5 w-5" />}
						account={instagramAccount}
						connectHref={instagramLink}
						onDisconnect={(id) => disconnectAccount.mutate({ id })}
						isDisconnecting={disconnectAccount.isPending}
					/>
					<AccountCard
						provider="tiktok"
						icon={<TikTokIcon className="h-5 w-5" />}
						account={tiktokAccount}
						connectHref={tiktokLink}
						onDisconnect={(id) => disconnectAccount.mutate({ id })}
						isDisconnecting={disconnectAccount.isPending}
					/>
				</div>
			)}
		</div>
	);
}
