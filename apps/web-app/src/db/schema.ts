import { pgTable, text, uuid, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

export const apps = pgTable("apps", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  fineTuned: boolean("fine_tuned").default(false).notNull(),
  fineTunePreference: jsonb("fine_tune_preference").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  appId: uuid("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  link: text("link"),
  stats: jsonb("stats").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull().unique(),
  keyHash: text("key_hash").notNull(),
  appId: uuid("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const videoJobs = pgTable("video_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  appId: uuid("app_id").notNull().references(() => apps.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  generationParams: jsonb("generation_params").$type<Record<string, unknown>>(),
  videoServerJobId: text("video_server_job_id"),
  outputUrl: text("output_url"),
  liked: boolean("liked"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export const connectedAccounts = pgTable("connected_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerUserId: text("provider_user_id").notNull().unique(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  appId: uuid("app_id").references(() => apps.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});
