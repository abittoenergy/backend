CREATE TABLE "meter_link_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meter_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_id" uuid,
	"estate_id" uuid,
	"house_number" varchar(20),
	"estate_name" text,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meters" ADD COLUMN "estate_id" uuid;--> statement-breakpoint
ALTER TABLE "meters" ADD COLUMN "house_number" varchar(20);--> statement-breakpoint
ALTER TABLE "meters" ADD COLUMN "estate_name" text;--> statement-breakpoint
ALTER TABLE "meter_link_requests" ADD CONSTRAINT "meter_link_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_link_requests" ADD CONSTRAINT "meter_link_requests_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_link_requests" ADD CONSTRAINT "meter_link_requests_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_link_requests" ADD CONSTRAINT "meter_link_requests_estate_id_estate_id_fk" FOREIGN KEY ("estate_id") REFERENCES "public"."estate"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_requests_user_id_index" ON "meter_link_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "link_requests_meter_id_index" ON "meter_link_requests" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "link_requests_status_index" ON "meter_link_requests" USING btree ("status");--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_estate_id_estate_id_fk" FOREIGN KEY ("estate_id") REFERENCES "public"."estate"("id") ON DELETE set null ON UPDATE no action;