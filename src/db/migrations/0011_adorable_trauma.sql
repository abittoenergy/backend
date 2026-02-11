CREATE TABLE "dedicated_virtual_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"customer_code" varchar(255),
	"account_number" varchar(20),
	"account_name" varchar(255),
	"bank_name" varchar(100),
	"bank_id" integer,
	"bank_slug" varchar(100),
	"currency" varchar(10) DEFAULT 'NGN',
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned" boolean DEFAULT false NOT NULL,
	"assignment_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dedicated_virtual_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "dedicated_virtual_accounts" ADD CONSTRAINT "dedicated_virtual_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dva_user_id_index" ON "dedicated_virtual_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dva_account_number_index" ON "dedicated_virtual_accounts" USING btree ("account_number");