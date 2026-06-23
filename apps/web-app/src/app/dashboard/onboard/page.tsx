"use client";

import { ArrowLeft, Loader2, Send, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";

type Step =
	| "INITIAL"
	| "SCRAPING"
	| "REVIEW_SCRAPED"
	| "ASKING_NAME"
	| "ASKING_DESCRIPTION"
	| "REVIEW_MANUAL"
	| "CREATING"
	| "DONE";

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

type Collected = {
	name: string;
	description: string;
	scrapedInfo?: ScrapedInfo;
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

const SCRAPE_YES = [
	"yes",
	"yep",
	"correct",
	"right",
	"looks good",
	"looks right",
];
const SCRAPE_NO = ["no", "nope", "wrong", "incorrect", "skip", "not right"];

export default function OnboardPage() {
	const router = useRouter();
	const utils = api.useUtils();
	const inputRef = useRef<HTMLInputElement>(null);
	const endRef = useRef<HTMLDivElement>(null);

	const [messages, setMessages] = useState<Message[]>([
		{
			id: nextId(),
			role: "bot",
			content:
				"Let's get your app set up.\n\nDo you have a link to your app's website or App Store page? Paste it here, or type \"skip\" if you don't have one.",
		},
	]);
	const [step, setStep] = useState<Step>("INITIAL");
	const [collected, setCollected] = useState<Collected>({
		name: "",
		description: "",
	});
	const [input, setInput] = useState("");

	const createApp = api.app.create.useMutation({
		onSuccess: (app) => {
			utils.app.list.invalidate();
			addBotMessage("Your app has been created! Redirecting...");
			setTimeout(() => router.push(`/dashboard/${app.id}`), 1500);
		},
		onError: (err) => {
			addBotMessage(`Something went wrong: ${err.message}. Let's try again.`);
			setStep("ASKING_NAME");
		},
	});

	const scrapeAi = api.app.scrapeUrl.useMutation();

	function addBotMessage(content: string) {
		setMessages((prev) => [...prev, { id: nextId(), role: "bot", content }]);
	}

	function addUserMessage(content: string) {
		setMessages((prev) => [...prev, { id: nextId(), role: "user", content }]);
	}

	function advanceTo(next: Step) {
		setStep(next);
	}

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: "smooth" });
		inputRef.current?.focus();
	}, [messages]);

	const handleSend = (value: string) => {
		const trimmed = value.trim();
		if (!trimmed || step === "SCRAPING" || step === "CREATING") return;

		setInput("");
		addUserMessage(trimmed);

		switch (step) {
			case "INITIAL": {
				const isSkip = SCRAPE_NO.includes(trimmed.toLowerCase());
				if (isSkip) {
					addBotMessage("No problem! Let's do it manually.");
					advanceTo("ASKING_NAME");
					return;
				}
				advanceTo("SCRAPING");
				scrapeAi.mutate(
					{ url: trimmed.startsWith("http") ? trimmed : `https://${trimmed}` },
					{
						onSuccess: (data) => {
							setCollected({
								name: data.name,
								description: data.description,
								scrapedInfo: data,
							});
							addBotMessage(
								[
									`**${data.name}**`,
									`*${data.tagline}*`,
									"",
									`${data.description}`,
									"",
									`Target: ${data.targetAudience}`,
									`Problem: ${data.problemSolved}`,
									`Features: ${data.keyFeatures.join(", ")}`,
									`USPs: ${data.uniqueSellingPoints.join(", ")}`,
									`Vibe: ${data.toneOfVoice}`,
									`Benefits: ${data.keyBenefits.join(", ")}`,
									`Use cases: ${data.useCases.join(", ")}`,
									"",
									"Does this look right? (yes / no)",
								].join("\n"),
							);
							advanceTo("REVIEW_SCRAPED");
						},
						onError: (err) => {
							addBotMessage(
								`Couldn't scrape that link: ${err.message}. Let's fill in the details manually instead.`,
							);
							advanceTo("ASKING_NAME");
						},
					},
				);
				addBotMessage("Scraping your link...");
				break;
			}

			case "REVIEW_SCRAPED": {
				const isYes = SCRAPE_YES.includes(trimmed.toLowerCase());
				const isNo = SCRAPE_NO.includes(trimmed.toLowerCase());
if (isYes) {
					advanceTo("CREATING");
					createApp.mutate({
						name: collected.name,
						description: collected.description || undefined,
						scrapedInfo: collected.scrapedInfo,
					});
					addBotMessage("Creating your app...");
				} else if (isNo) {
					addBotMessage("Let's fill in the details yourself.");
					advanceTo("ASKING_NAME");
				} else {
					addBotMessage(
						'Please type "yes" to confirm or "no" to fill in manually.',
					);
				}
				break;


			case "ASKING_NAME": {
				setCollected((prev) => ({ ...prev, name: trimmed }));
				addBotMessage(
					`Got it! Now tell me -- what does ${trimmed} do? Give me a short description.`,
				);
				advanceTo("ASKING_DESCRIPTION");
				break;
			}

			case "ASKING_DESCRIPTION": {
				setCollected((prev) => ({ ...prev, description: trimmed }));
				addBotMessage(
					`Here's what I have:\n\nName: ${collected.name}\nDescription: ${trimmed}\n\nType "yes" to create the app, or "no" to start over.`,
				);
				advanceTo("REVIEW_MANUAL");
				break;
			}

			case "REVIEW_MANUAL": {
				const isYes = SCRAPE_YES.includes(trimmed.toLowerCase());
				const isNo = SCRAPE_NO.includes(trimmed.toLowerCase());
				if (isYes) {
					advanceTo("CREATING");
					createApp.mutate({
						name: collected.name,
						description: collected.description || undefined,
					});
					addBotMessage("Creating your app...");
				} else if (isNo) {
					setCollected({ name: "", description: "" });
					addBotMessage("Okay, let's start over. What's the name of your app?");
					advanceTo("ASKING_NAME");
				} else {
					addBotMessage('Please type "yes" to confirm or "no" to start over.');
				}
				break;
			}
		}
	};

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend(input);
		}
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
				{(step === "SCRAPING" || step === "CREATING") && (
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
				<div className="flex gap-2">
					<input
						ref={inputRef}
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={
							step === "ASKING_NAME"
								? "Type your app name..."
								: step === "ASKING_DESCRIPTION"
									? "Describe what your app does..."
									: step === "REVIEW_SCRAPED" || step === "REVIEW_MANUAL"
										? "Type yes or no..."
										: "Paste a link or type skip..."
						}
						disabled={
							step === "SCRAPING" || step === "CREATING" || step === "DONE"
						}
						className="block flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
					/>
					<button
						type="button"
						onClick={() => handleSend(input)}
						disabled={
							!input.trim() ||
							step === "SCRAPING" ||
							step === "CREATING" ||
							step === "DONE"
						}
						className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						<Send className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
