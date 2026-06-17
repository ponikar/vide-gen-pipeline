"use client";

import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPostPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const utils = api.useUtils();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [statsJson, setStatsJson] = useState("");

  const createPost = api.post.create.useMutation({
    onSuccess: () => {
      utils.post.listByApp.invalidate({ appId });
      router.push(`/dashboard/${appId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let stats: Record<string, unknown> | undefined;
    if (statsJson.trim()) {
      try {
        stats = JSON.parse(statsJson);
      } catch {
        return;
      }
    }

    createPost.mutate({
      appId,
      title,
      link: link || undefined,
      stats,
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/dashboard/${appId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
        <h1 className="text-2xl font-bold">New Post</h1>
        <p className="text-sm text-muted-foreground">Add a post to track its performance.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Post title"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="link" className="block text-sm font-medium">Link</label>
          <input
            id="link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com/post"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="stats" className="block text-sm font-medium">Stats (JSON)</label>
          <textarea
            id="stats"
            value={statsJson}
            onChange={(e) => setStatsJson(e.target.value)}
            placeholder='{"views": 1200, "likes": 45}'
            rows={4}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={createPost.isPending}
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createPost.isPending ? "Creating..." : "Create Post"}
        </button>

        {createPost.isError && (
          <p className="text-sm text-destructive">{createPost.error.message}</p>
        )}
      </form>
    </div>
  );
}
