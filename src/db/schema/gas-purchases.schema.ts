import {
  pgTable,
  uuid,
  timestamp,
  bigint,
  decimal,
  text,
  boolean,
  varchar,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users.schema";
import { meters } from "./meters.schema";
import { transactions } from "./transactions.schema";

export enum GasPurchaseStatus {
  PENDING = "PENDING",
  DISPENSING = "DISPENSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export const GAS_PURCHASE_STATUSES = Object.values(GasPurchaseStatus) as [
  GasPurchaseStatus,
  ...GasPurchaseStatus[]
];

export const gasPurchases = pgTable(
  "gas_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    meterId: uuid("meter_id")
      .notNull()
      .references(() => meters.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),

    // Purchase details
    amountPaid: bigint("amount_paid", { mode: "number" }).notNull(), // in kobo
    gasPricePerKg: decimal("gas_price_per_kg", { precision: 20, scale: 2 }).notNull(),
    kgPurchased: decimal("kg_purchased", { precision: 10, scale: 3 }).notNull(),

    // Refill status
    status: text("status", { enum: GAS_PURCHASE_STATUSES })
      .$type<GasPurchaseStatus>()
      .notNull()
      .default(GasPurchaseStatus.PENDING),

    // MQTT command tracking
    mqttCommandSent: boolean("mqtt_command_sent").default(false),
    mqttCommandSentAt: timestamp("mqtt_command_sent_at"),
    mqttCommandId: varchar("mqtt_command_id", { length: 255 }),

    // Refill confirmation from meter
    refillStartedAt: timestamp("refill_started_at"),
    refillCompletedAt: timestamp("refill_completed_at"),
    kgDispensed: decimal("kg_dispensed", { precision: 10, scale: 3 }), // Actual amount from meter

    // Audit trail
    metadata: jsonb("metadata"), // Store full MQTT responses, errors, etc.
    failureReason: text("failure_reason"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("gas_purchases_user_id_index").on(t.userId),
    index("gas_purchases_meter_id_index").on(t.meterId),
    index("gas_purchases_transaction_id_index").on(t.transactionId),
    index("gas_purchases_status_index").on(t.status),
  ]
);

export type GasPurchase = typeof gasPurchases.$inferSelect;
export type NewGasPurchase = typeof gasPurchases.$inferInsert;

export const createGasPurchaseSchema = createInsertSchema(gasPurchases);
export const gasPurchaseSchema = createSelectSchema(gasPurchases);
