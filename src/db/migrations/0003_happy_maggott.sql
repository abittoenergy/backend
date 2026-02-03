CREATE TABLE "estate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text NOT NULL,
	"zip_code" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estate" ADD CONSTRAINT "estate_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estate_id_idx" ON "estate" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "estate_longitude_latitude_idx" ON "estate" USING btree ("longitude","latitude");