ALTER TABLE "meters" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "meters" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;