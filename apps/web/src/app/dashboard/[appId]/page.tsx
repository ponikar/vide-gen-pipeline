"use client";

import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Key, Copy, Check, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function ApiKeysSection({ appId }: { appId: string }) {
  const utils = api.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys, isLoading } = api.apiKey.list.useQuery({ appId });

  const createKey = api.apiKey.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.keyValue);
      setShowCreate(false);
      setNewKeyName("");
      utils.apiKey.list.invalidate({ appId });
    },
  });

  const revokeKey = api.apiKey.revoke.useMutation({
    onSuccess: () => {
      utils.apiKey.list.invalidate({ appId });
    },
  });

  const copyToClipboard = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">API Keys</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {createdKey && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Key created — copy it now</p>
            <button onClick={() => { setCreatedKey(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            You won&apos;t be able to see this key again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm font-mono">
              {createdKey}
            </code>
            <button
              onClick={copyToClipboard}
              className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="rounded-lg border p-4">
          <div className="mb-3">
            <label htmlFor="keyName" className="block text-sm font-medium">Key Name</label>
            <input
              id="keyName"
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production Agent"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { createKey.mutate({ name: newKeyName, appId }); }}
              disabled={!newKeyName.trim() || createKey.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createKey.isPending ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewKeyName(""); }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : !keys?.length ? (
        <p className="text-sm text-muted-foreground">No API keys yet. Create one for your AI agent.</p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{key.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <code className="font-mono">{key.keyPrefix}...</code>
                    {key.lastUsedAt && (
                      <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                    )}
                    {key.revokedAt && (
                      <span className="text-destructive">Revoked {new Date(key.revokedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
              {!key.revokedAt && (
                <button
                  onClick={() => { if (confirm("Revoke this key?")) revokeKey.mutate({ id: key.id }); }}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="space-y-10">
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

      <div>
        <div className="flex items-center justify-between mb-4">
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

      <hr className="border-t" />

      <ApiKeysSection appId={appId} />
    </div>
  );
}
