CREATE TABLE IF NOT EXISTS "video_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "app_id" uuid NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "generation_params" jsonb,
  "video_server_job_id" text,
  "output_url" text,
  "liked" boolean,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_app_id_apps_id_fk"
  FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "apps" ADD COLUMN "fine_tuned" boolean DEFAULT false NOT NULL;
