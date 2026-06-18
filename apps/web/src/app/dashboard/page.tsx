"use client";

import { api } from "@/trpc/react";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: apps, isLoading } = api.app.list.useQuery();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
        ))}
      </div>
    );
  }

  if (!apps?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="mb-2 text-lg font-medium">No apps yet</p>
        <p className="mb-6 text-sm text-muted-foreground">Create your first app to get started.</p>
        <Link
          href="/dashboard/onboard"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create App
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Apps</h1>
        <Link
          href="/dashboard/onboard"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New App
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={`/dashboard/${app.id}`}
            className="group rounded-lg border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <h3 className="font-semibold group-hover:text-primary">{app.name}</h3>
            {app.description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{app.description}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
