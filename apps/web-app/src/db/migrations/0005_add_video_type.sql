CREATE TYPE "public"."video_type" AS ENUM('brainrot', 'ugc', 'slideshow');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "video_type" "public"."video_type" DEFAULT 'brainrot' NOT NULL;--> statement-breakpoint
