CREATE TABLE "gas_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meter_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"amount_paid" bigint NOT NULL,
	"gas_price_per_kg" numeric(20, 2) NOT NULL,
	"kg_purchased" numeric(10, 3) NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"mqtt_command_sent" boolean DEFAULT false,
	"mqtt_command_sent_at" timestamp,
	"mqtt_command_id" varchar(255),
	"refill_started_at" timestamp,
	"refill_completed_at" timestamp,
	"kg_dispensed" numeric(10, 3),
	"metadata" jsonb,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."transaction_type";--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('WALLET_TOPUP', 'WALLET_DEBIT', 'GAS_PURCHASE_ONLINE');--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" SET DATA TYPE "public"."transaction_type" USING "type"::"public"."transaction_type";--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "wallet_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "gas_purchases" ADD CONSTRAINT "gas_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_purchases" ADD CONSTRAINT "gas_purchases_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_purchases" ADD CONSTRAINT "gas_purchases_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gas_purchases_user_id_index" ON "gas_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gas_purchases_meter_id_index" ON "gas_purchases" USING btree ("meter_id");--> statement-breakpoint
CREATE INDEX "gas_purchases_transaction_id_index" ON "gas_purchases" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "gas_purchases_status_index" ON "gas_purchases" USING btree ("status");