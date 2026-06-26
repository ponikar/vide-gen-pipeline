"use client";

import { ArrowLeft, Loader2, Send, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";

type ScrapedInfo = {
	name: string;
	description: string;
	tagline: string;
	targetAudience: string;
	problemSolved: string;
	keyFeatures: string[];
	uniqueSellingPoints: string[];
	toneOfVoice: string;
	keyBenefits: string[];
	useCases: string[];
};

interface Message {
	id: string;
	role: "bot" | "user";
	content: string;
}

let msgId = 0;
function nextId() {
	return `msg-${++msgId}`;
}

const initialMessage =
	"Let's get your app set up. Tell me about your app, or paste a link if you want me to pull details from your website or App Store page.";

function toApiMessages(messages: Message[]) {
	return messages.map((message) => ({
		role: message.role === "bot" ? ("assistant" as const) : ("user" as const),
		content: message.content,
	}));
}

function renderScrapedSummary(info: ScrapedInfo) {
	return [
		`I found **${info.name}**.`,
		"",
		info.description,
		"",
		`Target: ${info.targetAudience}`,
		`Problem: ${info.problemSolved}`,
		`Features: ${info.keyFeatures.join(", ")}`,
		"",
		"Does this look right?",
	].join("\n");
}

export default function OnboardPage() {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const endRef = useRef<HTMLDivElement>(null);

	const [messages, setMessages] = useState<Message[]>([
		{ id: nextId(), role: "bot", content: initialMessage },
	]);
	const [input, setInput] = useState("");
	const [scrapedInfo, setScrapedInfo] = useState<ScrapedInfo | undefined>();

	const chat = api.onboarding.chat.useMutation();
	const createApp = api.app.create.useMutation({
		onSuccess: (app) => {
			setMessages((prev) => [
				...prev,
				{ id: nextId(), role: "bot", content: "Your app has been created! Redirecting..." },
			]);
			setTimeout(() => router.push(`/dashboard/${app.id}`), 1500);
		},
		onError: (err) => {
			setMessages((prev) => [
				...prev,
				{
					id: nextId(),
					role: "bot",
					content: `Something went wrong: ${err.message}. Please try again.`,
				},
			]);
		},
	});

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
		inputRef.current?.focus();
	}, [messages]);

	const isBusy = chat.isPending || createApp.isPending;

	const handleSend = async (value: string) => {
		const trimmed = value.trim();
		if (!trimmed || isBusy) return;

		setInput("");
		const userMessage: Message = {
			id: nextId(),
			role: "user",
			content: trimmed,
		};
		const nextMessages = [...messages, userMessage];
		setMessages(nextMessages);

		try {
			const result = await chat.mutateAsync({
				messages: toApiMessages(nextMessages),
			});

			if (result.scrapedInfo) {
				setScrapedInfo(result.scrapedInfo);
			}

			setMessages((prev) => [
				...prev,
				{
					id: nextId(),
					role: "bot",
					content: result.scrapedInfo
						? renderScrapedSummary(result.scrapedInfo)
						: result.reply,
				},
			]);
		} catch {
			setMessages((prev) => [
				...prev,
				{
					id: nextId(),
					role: "bot",
					content: "Sorry, something went wrong. Please try again.",
				},
			]);
		}
	};

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend(input);
		}
	}

	function createFromScrape() {
		if (!scrapedInfo || createApp.isPending) return;
		createApp.mutate({
			name: scrapedInfo.name,
			description: scrapedInfo.description || undefined,
			scrapedInfo,
		});
	}

	return (
		<div className="mx-auto flex max-w-2xl flex-col">
			<div className="mb-4">
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to apps
				</Link>
			</div>

			<div className="flex-1 space-y-4 overflow-y-auto pb-4">
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
					>
						{msg.role === "bot" && (
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
								<Sparkles className="h-4 w-4 text-primary" />
							</div>
						)}
						<div
							className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
								msg.role === "bot"
									? "border bg-muted/50"
									: "bg-primary text-primary-foreground"
							}`}
						>
							{msg.content}
						</div>
						{msg.role === "user" && (
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
								<User className="h-4 w-4 text-primary" />
							</div>
						)}
					</div>
				))}
				{isBusy && (
					<div className="flex gap-3">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
							<Sparkles className="h-4 w-4 text-primary" />
						</div>
						<div className="rounded-lg border bg-muted/50 px-4 py-2.5 text-sm">
							<Loader2 className="h-4 w-4 animate-spin" />
						</div>
					</div>
				)}

				<div ref={endRef} />
			</div>

			<div className="sticky bottom-0 border-t bg-background pt-4">
				{scrapedInfo && (
					<div className="mb-2 flex justify-end">
						<button
							type="button"
							onClick={createFromScrape}
							disabled={createApp.isPending}
							className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
						>
							Create app from scraped info
						</button>
					</div>
				)}
				<div className="flex gap-2">
					<input
						ref={inputRef}
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message or paste a link..."
						disabled={isBusy}
						className="block flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
					/>
					<button
						type="button"
						onClick={() => handleSend(input)}
						disabled={isBusy || !input.trim()}
						className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						<Send className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
