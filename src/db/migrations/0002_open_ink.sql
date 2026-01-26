ALTER TABLE "users" DROP CONSTRAINT "users_username_unique";--> statement-breakpoint
DROP INDEX "users_username_lower_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "username";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "unlock_pin_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "txn_pin_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "biometric_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mfa_enabled";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mfa_secret_enc";