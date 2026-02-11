import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  decimal,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export enum NotifyAdminType {
  ALL = "ALL",
  SPECIFIC = "SPECIFIC",
}

export const NOTIFY_ADMIN_TYPES = Object.values(NotifyAdminType) as [NotifyAdminType, ...NotifyAdminType[]];

export const systemSettings = pgTable("system_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  currency: varchar("currency", { length: 10 }).default("NGN"),

  // Payment Settings
  minWalletTopup: decimal("min_wallet_topup", { precision: 20, scale: 2 }).default("1000.00"),
  gasPricePerKg: decimal("gas_price_per_kg", { precision: 20, scale: 2 }),

  // Meter Settings
  meterResyncIntervalMinutes: integer("meter_resync_interval_minutes").default(15),
  autoUnlinkInactiveMeterDays: integer("auto_unlink_inactive_meter_days").default(30),

  // Notification Settings
  enableAdminAlerts: boolean("enable_admin_alerts").default(true),
  notifyAdminType: text("notify_admin_type", { enum: NOTIFY_ADMIN_TYPES })
    .default(NotifyAdminType.ALL),
  specificAdminIds: jsonb("specific_admin_ids").$type<string[]>().default([]),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SystemSettings = typeof systemSettings.$inferSelect;
export type NewSystemSettings = typeof systemSettings.$inferInsert;

export const createSystemSettingsSchema = createInsertSchema(systemSettings);
export const systemSettingsSchema = createSelectSchema(systemSettings);
