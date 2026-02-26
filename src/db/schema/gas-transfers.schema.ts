import { pgTable, uuid, timestamp, numeric } from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { meters } from "./meters.schema";

export const gasTransfers = pgTable("gas_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceMeterId: uuid("source_meter_id")
    .notNull()
    .references(() => meters.id, { onDelete: "cascade" }),
  targetMeterId: uuid("target_meter_id")
    .notNull()
    .references(() => meters.id, { onDelete: "cascade" }),
  amountKg: numeric("amount_kg", { precision: 10, scale: 3 }).notNull(),
  gasPriceAtTime: numeric("gas_price_at_time", { precision: 20, scale: 2 }).notNull(),
  totalWorth: numeric("total_worth", { precision: 20, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GasTransfer = typeof gasTransfers.$inferSelect;
export type NewGasTransfer = typeof gasTransfers.$inferInsert;
