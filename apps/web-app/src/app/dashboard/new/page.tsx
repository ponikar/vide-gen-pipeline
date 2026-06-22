"use client";

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Sparkles, Globe, X } from "lucide-react";
import Link from "next/link";

export default function NewAppPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scrapeUrl, setScrapeUrl] = useState("");

  const createApp = api.app.create.useMutation({
    onSuccess: (app) => {
      utils.app.list.invalidate();
      router.push(`/dashboard/${app.id}`);
    },
  });

  const scrapeAi = api.app.scrapeUrl.useMutation({
    onSuccess: (data) => {
      setName(data.name);
      setDescription(data.description);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createApp.mutate({ name, description: description || undefined });
  };

  const handleScrape = () => {
    if (!scrapeUrl.trim()) return;
    scrapeAi.mutate({ url: scrapeUrl });
  };

  const clearScrape = () => {
    setScrapeUrl("");
    scrapeAi.reset();
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to apps
        </Link>
        <h1 className="text-2xl font-bold">Create App</h1>
        <p className="text-sm text-muted-foreground">Tell us about the app you want to promote.</p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-blue-500" />
          AI Import
          <span className="text-xs text-muted-foreground font-normal">Paste your app URL to auto-fill details</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="url"
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScrape();
                }
              }}
              placeholder="https://example.com"
              className="block w-full rounded-md border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {scrapeUrl && (
              <button
                type="button"
                onClick={clearScrape}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleScrape}
            disabled={!scrapeUrl.trim() || scrapeAi.isPending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {scrapeAi.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {scrapeAi.isPending ? "Scraping..." : "Scrape"}
          </button>
        </div>
        {scrapeAi.isError && (
          <p className="mt-2 text-xs text-destructive">{scrapeAi.error.message}</p>
        )}
        {scrapeAi.isSuccess && (
          <p className="mt-2 text-xs text-green-600">Fields pre-filled! Review below before creating.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            App Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="My Awesome App"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of your app..."
            rows={3}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={createApp.isPending}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createApp.isPending ? "Creating..." : "Create App"}
        </button>

        {createApp.isError && (
          <p className="text-sm text-destructive">{createApp.error.message}</p>
        )}
      </form>
    </div>
  );
}
