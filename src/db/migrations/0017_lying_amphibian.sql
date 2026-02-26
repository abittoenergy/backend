ALTER TYPE "public"."transaction_type" ADD VALUE 'GAS_TRANSFER';--> statement-breakpoint
CREATE TABLE "gas_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"source_meter_id" uuid NOT NULL,
	"target_meter_id" uuid NOT NULL,
	"amount_kg" numeric(10, 3) NOT NULL,
	"gas_price_at_time" numeric(20, 2) NOT NULL,
	"total_worth" numeric(20, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gas_transfers" ADD CONSTRAINT "gas_transfers_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_transfers" ADD CONSTRAINT "gas_transfers_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_transfers" ADD CONSTRAINT "gas_transfers_source_meter_id_meters_id_fk" FOREIGN KEY ("source_meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_transfers" ADD CONSTRAINT "gas_transfers_target_meter_id_meters_id_fk" FOREIGN KEY ("target_meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;