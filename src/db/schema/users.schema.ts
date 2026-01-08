import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  text,
  AnyPgColumn,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { adminRoles } from "./admin/role.schema";
import { adminGroups } from "./admin/group.schema";

export enum Role {
  BASIC_USER = "basic-user",
  MERCHANT = "merchant",
  ADMIN = "admin",
  SUPER_ADMIN = "super-admin"
}

export const ROLES = Object.values(Role) as [Role, ...Role[]];

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 100 }).unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    unlockPinHash: varchar("unlock_pin_hash", { length: 255 }),
    txnPinHash: varchar("txn_pin_hash", { length: 255 }),
    biometricEnabled: boolean("biometric_enabled").default(false),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    phoneNumber: varchar("phone_number", { length: 20 }),
    avatar: varchar("avatar", { length: 255 }),
    country: varchar("country", { length: 2 }),
    referralCode: varchar("referral_code", { length: 14 }).unique(),
    referredBy: uuid("referred_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").default(true),
    isAmbassador: boolean("is_ambassador").default(false),
    emailVerified: boolean("email_verified").default(false),
    emailVerifiedAt: timestamp("email_verified_at"),
    failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
    lockoutUntil: timestamp("lockout_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaSecretEnc: text("mfa_secret_enc"),
    deleteRequestedAt: timestamp("delete_requested_at"),
    deleteEffectiveAt: timestamp("delete_effective_at"),
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at"),
    archiveReason: text("archive_reason"),
    pushNotificationEnabled: boolean("push_notification_enabled").notNull().default(false),
    emailNotificationEnabled: boolean("email_notification_enabled").notNull().default(true),
    telegramNotificationEnabled: boolean("telegram_notification_enabled").notNull().default(true),
    role: text("role", { enum: ROLES }).$type<Role>().notNull().default(Role.BASIC_USER),
    telegramChatId: varchar("telegram_chat_id", { length: 64 }),
    telegramLinkedAt: timestamp("telegram_linked_at", { withTimezone: true }),
    adminRoleId: uuid("admin_role_id").references(() => adminRoles.id, { onDelete: "set null" }),
    adminGroupId: uuid("admin_group_id").references(() => adminGroups.id, { onDelete: "set null" })
  },
  (t) => [
    uniqueIndex("users_username_lower_unique").on(sql`lower(${t.username})`),
    index("users_telegram_chat_id_index").on(t.telegramChatId),
   
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const createUserSchema = createInsertSchema(users);
export const userSchema = createSelectSchema(users);
