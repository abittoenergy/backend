CREATE TABLE "gas_usage_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meter_id" uuid,
	"device_id" varchar(255) NOT NULL,
	"kg_used" numeric(10, 3) NOT NULL,
	"previous_balance" numeric(10, 3) NOT NULL,
	"new_balance" numeric(10, 3) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "available_gas_kg" numeric(10, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "gas_usage_audits" ADD CONSTRAINT "gas_usage_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_usage_audits" ADD CONSTRAINT "gas_usage_audits_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE set null ON UPDATE no action;