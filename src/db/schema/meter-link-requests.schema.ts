import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users.schema";
import { meters } from "./meters.schema";
import { estate } from "./estate.schema";

export enum LinkRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const LINK_REQUEST_STATUSES = Object.values(LinkRequestStatus) as [LinkRequestStatus, ...LinkRequestStatus[]];

export const meterLinkRequests = pgTable(
  "meter_link_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    meterId: uuid("meter_id").notNull().references(() => meters.id, { onDelete: "cascade" }),
    status: text("status", { enum: LINK_REQUEST_STATUSES }).$type<LinkRequestStatus>().notNull().default(LinkRequestStatus.PENDING),
    adminId: uuid("admin_id").references(() => users.id, { onDelete: "set null" }),
    estateId: uuid("estate_id").references(() => estate.id, { onDelete: "set null" }),
    houseNumber: varchar("house_number", { length: 20 }),
    estateName: text("estate_name"),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("link_requests_user_id_index").on(t.userId),
    index("link_requests_meter_id_index").on(t.meterId),
    index("link_requests_status_index").on(t.status),
  ]
);

export type MeterLinkRequest = typeof meterLinkRequests.$inferSelect;
export type NewMeterLinkRequest = typeof meterLinkRequests.$inferInsert;

export const createMeterLinkRequestSchema = createInsertSchema(meterLinkRequests);
export const meterLinkRequestSchema = createSelectSchema(meterLinkRequests);
