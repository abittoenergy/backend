ALTER TABLE "leak_audits" RENAME TO "incident_audits";--> statement-breakpoint
ALTER TABLE "leak_reports" RENAME TO "incident_reports";--> statement-breakpoint
ALTER TABLE "incident_audits" DROP CONSTRAINT "leak_audits_report_id_leak_reports_id_fk";
--> statement-breakpoint
ALTER TABLE "incident_audits" DROP CONSTRAINT "leak_audits_meter_id_meters_id_fk";
--> statement-breakpoint
ALTER TABLE "incident_audits" DROP CONSTRAINT "leak_audits_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "incident_reports" DROP CONSTRAINT "leak_reports_meter_id_meters_id_fk";
--> statement-breakpoint
ALTER TABLE "incident_reports" DROP CONSTRAINT "leak_reports_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "incident_reports" DROP CONSTRAINT "leak_reports_resolved_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "leak_audits_report_id_index";--> statement-breakpoint
DROP INDEX "leak_audits_meter_id_index";--> statement-breakpoint
DROP INDEX "leak_reports_meter_id_index";--> statement-breakpoint
DROP INDEX "leak_reports_device_id_index";--> statement-breakpoint
DROP INDEX "leak_reports_status_index";--> statement-breakpoint
ALTER TABLE "incident_reports" ADD COLUMN "type" text DEFAULT 'leakage_detection' NOT NULL;--> statement-breakpoint
ALTER TABLE "incident_audits" ADD CONSTRAINT "incident_audits_report_id_incident_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."incident_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_audits" ADD CONSTRAINT "incident_audits_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_audits" ADD CONSTRAINT "incident_audits_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "incident_audits_report_id_index" ON "incident_audits" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "incident_audits_meter_id_index" ON "incident_audits" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "incident_reports_meter_id_index" ON "incident_reports" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "incident_reports_device_id_index" ON "incident_reports" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "incident_reports_status_index" ON "incident_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incident_reports_type_index" ON "incident_reports" USING btree ("type");