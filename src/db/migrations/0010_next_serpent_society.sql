CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC',
	"currency" varchar(10) DEFAULT 'NGN',
	"min_wallet_topup" numeric(20, 2) DEFAULT '1000.00',
	"gas_price_per_kg" numeric(20, 2),
	"meter_resync_interval_minutes" integer DEFAULT 15,
	"auto_unlink_inactive_meter_days" integer DEFAULT 30,
	"enable_admin_alerts" boolean DEFAULT true,
	"notify_admin_type" text DEFAULT 'ALL',
	"specific_admin_ids" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
