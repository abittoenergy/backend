CREATE TABLE "admin_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	CONSTRAINT "admin_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100),
	"password_hash" varchar(255),
	"unlock_pin_hash" varchar(255),
	"txn_pin_hash" varchar(255),
	"biometric_enabled" boolean DEFAULT false,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone_number" varchar(20),
	"avatar" varchar(255),
	"country" varchar(2),
	"referral_code" varchar(14),
	"referred_by" uuid,
	"is_active" boolean DEFAULT true,
	"is_ambassador" boolean DEFAULT false,
	"email_verified" boolean DEFAULT false,
	"email_verified_at" timestamp,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"lockout_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret_enc" text,
	"delete_requested_at" timestamp,
	"delete_effective_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"archive_reason" text,
	"push_notification_enabled" boolean DEFAULT false NOT NULL,
	"email_notification_enabled" boolean DEFAULT true NOT NULL,
	"telegram_notification_enabled" boolean DEFAULT true NOT NULL,
	"role" text DEFAULT 'basic-user' NOT NULL,
	"telegram_chat_id" varchar(64),
	"telegram_linked_at" timestamp with time zone,
	"admin_role_id" uuid,
	"admin_group_id" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "meters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"status" text DEFAULT 'unregistered' NOT NULL,
	"user_id" uuid,
	"valve_status" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meters_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_role_id_admin_roles_id_fk" FOREIGN KEY ("admin_role_id") REFERENCES "public"."admin_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_group_id_admin_groups_id_fk" FOREIGN KEY ("admin_group_id") REFERENCES "public"."admin_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_groups_name_lower_unique" ON "admin_groups" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "admin_roles_name_lower_unique" ON "admin_roles" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_unique" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "users_telegram_chat_id_index" ON "users" USING btree ("telegram_chat_id");--> statement-breakpoint
CREATE INDEX "meters_device_id_index" ON "meters" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "meters_user_id_index" ON "meters" USING btree ("user_id");