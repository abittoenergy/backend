ALTER TABLE "meters" ADD COLUMN "available_gas_kg" numeric(10, 3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "available_gas_kg";