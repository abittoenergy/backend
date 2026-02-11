import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users.schema";

export const dedicatedVirtualAccounts = pgTable(
  "dedicated_virtual_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),

    // Paystack customer details
    customerCode: varchar("customer_code", { length: 255 }),

    // Bank account details
    accountNumber: varchar("account_number", { length: 20 }),
    accountName: varchar("account_name", { length: 255 }),
    bankName: varchar("bank_name", { length: 100 }),
    bankId: integer("bank_id"),
    bankSlug: varchar("bank_slug", { length: 100 }),

    // Account metadata
    currency: varchar("currency", { length: 10 }).default("NGN"),
    isActive: boolean("is_active").default(true).notNull(),
    assigned: boolean("assigned").default(false).notNull(),

    // Store full assignment response from Paystack
    assignmentData: jsonb("assignment_data"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("dva_user_id_index").on(t.userId),
    index("dva_account_number_index").on(t.accountNumber),
  ]
);

export type DedicatedVirtualAccount = typeof dedicatedVirtualAccounts.$inferSelect;
export type NewDedicatedVirtualAccount = typeof dedicatedVirtualAccounts.$inferInsert;

export const createDedicatedVirtualAccountSchema = createInsertSchema(dedicatedVirtualAccounts);
export const dedicatedVirtualAccountSchema = createSelectSchema(dedicatedVirtualAccounts);
