import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users.schema";
import { meters } from "./meters.schema";

export const gasUsageAudits = pgTable(
  "gas_usage_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    meterId: uuid("meter_id").references(() => meters.id, { onDelete: "set null" }),
    deviceId: varchar("device_id", { length: 255 }).notNull(),
    kgUsed: numeric("kg_used", { precision: 10, scale: 3 }).notNull(),
    previousBalance: numeric("previous_balance", { precision: 10, scale: 3 }).notNull(),
    newBalance: numeric("new_balance", { precision: 10, scale: 3 }).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export type GasUsageAudit = typeof gasUsageAudits.$inferSelect;
export type NewGasUsageAudit = typeof gasUsageAudits.$inferInsert;

export const createGasUsageAuditSchema = createInsertSchema(gasUsageAudits);
export const gasUsageAuditSchema = createSelectSchema(gasUsageAudits);
