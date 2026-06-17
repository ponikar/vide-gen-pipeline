"use client";

import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AppDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const router = useRouter();
  const utils = api.useUtils();

  const { data: app, isLoading: appLoading } = api.app.getById.useQuery({ id: appId });
  const { data: posts, isLoading: postsLoading } = api.post.listByApp.useQuery({ appId });

  const deleteApp = api.app.delete.useMutation({
    onSuccess: () => {
      utils.app.list.invalidate();
      router.push("/dashboard");
    },
  });

  const deletePost = api.post.delete.useMutation({
    onSuccess: () => {
      utils.post.listByApp.invalidate({ appId });
    },
  });

  if (appLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium">App not found</p>
        <Link href="/dashboard" className="mt-2 text-sm text-muted-foreground hover:text-foreground">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to apps
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{app.name}</h1>
            {app.description && (
              <p className="text-sm text-muted-foreground">{app.description}</p>
            )}
          </div>
          <button
            onClick={() => { if (confirm("Delete this app and all its posts?")) deleteApp.mutate({ id: appId }); }}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Posts</h2>
        <Link
          href={`/dashboard/${appId}/posts/new`}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {postsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : !posts?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-sm text-muted-foreground">No posts yet</p>
          <Link
            href={`/dashboard/${appId}/posts/new`}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{post.title}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {post.link && (
                    <a href={post.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {new URL(post.link).hostname}
                    </a>
                  )}
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  {post.stats && Object.keys(post.stats).length > 0 && (
                    <span>{Object.keys(post.stats).length} stat(s)</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { if (confirm("Delete this post?")) deletePost.mutate({ id: post.id }); }}
                className="ml-2 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
