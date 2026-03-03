CREATE TABLE "leak_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid,
	"meter_id" uuid,
	"action" varchar(100) NOT NULL,
	"actor_id" uuid,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leak_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meter_id" uuid NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"status" text DEFAULT 'detected' NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leak_audits" ADD CONSTRAINT "leak_audits_report_id_leak_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."leak_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leak_audits" ADD CONSTRAINT "leak_audits_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leak_audits" ADD CONSTRAINT "leak_audits_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leak_reports" ADD CONSTRAINT "leak_reports_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leak_reports" ADD CONSTRAINT "leak_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leak_reports" ADD CONSTRAINT "leak_reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leak_audits_report_id_index" ON "leak_audits" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "leak_audits_meter_id_index" ON "leak_audits" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "leak_reports_meter_id_index" ON "leak_reports" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "leak_reports_device_id_index" ON "leak_reports" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "leak_reports_status_index" ON "leak_reports" USING btree ("status");