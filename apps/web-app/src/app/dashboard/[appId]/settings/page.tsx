"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/trpc/react";

export default function SettingsPage() {
	const [reason, setReason] = useState("");
	const [additionalInfo, setAdditionalInfo] = useState("");

	const { data: existingRequest, isLoading: checkingExisting } =
		api.deleteAccountRequest.getMyRequest.useQuery();

	const submitRequest = api.deleteAccountRequest.submitRequest.useMutation();

	if (checkingExisting) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (existingRequest && existingRequest.status === "pending") {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Settings</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage your account settings.
					</p>
				</div>
				<div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-6">
					<h2 className="text-lg font-semibold">Delete Account Request</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						You already have a pending delete account request submitted on{" "}
						{new Date(existingRequest.createdAt).toLocaleDateString()}.
						We'll process it manually and notify you via email.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Settings</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage your account settings.
				</p>
			</div>

			<div className="rounded-lg border border-destructive/20 p-6">
				<h2 className="text-lg font-semibold text-destructive">
					Delete Account
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Request to permanently delete your account and all associated data.
					This action cannot be undone. We'll process your request manually and
					notify you via email.
				</p>

				{submitRequest.isSuccess ? (
					<div className="mt-4 rounded-md bg-green-500/10 border border-green-500/50 p-4 text-sm text-green-700 dark:text-green-400">
						Your delete request has been received. We'll process it manually and
						notify you via email.
					</div>
				) : (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							submitRequest.mutate({ reason, additionalInfo });
						}}
						className="mt-4 space-y-4"
					>
						<div>
							<label
								htmlFor="reason"
								className="block text-sm font-medium mb-1"
							>
								Reason for leaving (optional)
							</label>
							<textarea
								id="reason"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								rows={3}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								placeholder="Tell us why you're leaving..."
							/>
						</div>
						<div>
							<label
								htmlFor="additionalInfo"
								className="block text-sm font-medium mb-1"
							>
								Additional information (optional)
							</label>
							<textarea
								id="additionalInfo"
								value={additionalInfo}
								onChange={(e) => setAdditionalInfo(e.target.value)}
								rows={3}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								placeholder="Anything else you'd like us to know..."
							/>
						</div>
						{submitRequest.isError && (
							<p className="text-sm text-destructive">
								{submitRequest.error.message}
							</p>
						)}
						<button
							type="submit"
							disabled={submitRequest.isPending}
							className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
						>
							{submitRequest.isPending && (
								<Loader2 className="h-4 w-4 animate-spin" />
							)}
							Request Account Deletion
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
