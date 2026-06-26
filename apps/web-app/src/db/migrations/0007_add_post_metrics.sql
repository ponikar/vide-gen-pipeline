ALTER TABLE posts ADD COLUMN published_at timestamp with time zone;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN views integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN likes integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN comments integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN shares integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN reach integer;
