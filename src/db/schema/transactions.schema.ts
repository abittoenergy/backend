import { pgTable, uuid, timestamp, bigint, varchar, text, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { wallets } from "./wallets.schema";

export const transactionTypeEnum = pgEnum("transaction_type", ["WALLET_TOPUP", "GAS_PURCHASE_WALLET","GAS_PURCHASE_ONLINE"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["PENDING", "SUCCESS", "FAILED"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["PAYSTACK"]);

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "cascade" }),
  amount: bigint("amount", { mode: "number" }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("PENDING"),
  reference: varchar("reference", { length: 255 }).unique(),
  provider: paymentProviderEnum("provider"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
