import { pgTable, uuid, timestamp, bigint, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const wallets = pgTable("wallets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("NGN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
