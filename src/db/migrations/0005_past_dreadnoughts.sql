ALTER TABLE "users" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "nin" varchar(12);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "estate_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "house_number" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_estate_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_estate_id_estate_id_fk" FOREIGN KEY ("estate_id") REFERENCES "public"."estate"("id") ON DELETE set null ON UPDATE no action;