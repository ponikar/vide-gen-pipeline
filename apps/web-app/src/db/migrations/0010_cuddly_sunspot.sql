CREATE TYPE "public"."video_type" AS ENUM('brainrot', 'ugc', 'slideshow');--> statement-breakpoint
CREATE TABLE "delete_account_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"reason" text,
	"additional_info" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "scraped_info" jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "video_type" "video_type" DEFAULT 'brainrot' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "platform_post_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "type" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "meta" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "video_job_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "status" text DEFAULT 'published';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "likes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "comments" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "shares" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reach" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD COLUMN "current_phase" text;