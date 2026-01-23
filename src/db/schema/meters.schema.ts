import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users.schema";

export enum MeterStatus {
  ACTIVE = "active",
  DEACTIVATED = "deactivated",
  UNREGISTERED = "unregistered",
  REGISTERED = "registered",
}

export const METER_STATUSES = Object.values(MeterStatus) as [MeterStatus, ...MeterStatus[]];

export const meters = pgTable(
  "meters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: varchar("device_id", { length: 255 }).notNull().unique(),
    status: text("status", { enum: METER_STATUSES }).$type<MeterStatus>().notNull().default(MeterStatus.UNREGISTERED),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    valveStatus: boolean("valve_status").notNull().default(false),
    meterNumber: varchar("meter_number", { length: 50 }).unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("meters_device_id_index").on(t.deviceId),
    index("meters_user_id_index").on(t.userId),
    index("meters_meter_number_index").on(t.meterNumber),
  ]
);

export type Meter = typeof meters.$inferSelect;
export type NewMeter = typeof meters.$inferInsert;

export const createMeterSchema = createInsertSchema(meters);
export const meterSchema = createSelectSchema(meters);
