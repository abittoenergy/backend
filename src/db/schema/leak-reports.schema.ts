import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users.schema";
import { meters } from "./meters.schema";

export enum LeakReportStatus {
  DETECTED = "detected",
  RESOLVED = "resolved",
}

export const LEAK_REPORT_STATUSES = Object.values(LeakReportStatus) as [LeakReportStatus, ...LeakReportStatus[]];

export const leakReports = pgTable(
  "leak_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meterId: uuid("meter_id").references(() => meters.id, { onDelete: "cascade" }).notNull(),
    deviceId: varchar("device_id", { length: 255 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Owner at time of leak
    status: text("status", { enum: LEAK_REPORT_STATUSES }).$type<LeakReportStatus>().notNull().default(LeakReportStatus.DETECTED),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("leak_reports_meter_id_index").on(t.meterId),
    index("leak_reports_device_id_index").on(t.deviceId),
    index("leak_reports_status_index").on(t.status),
  ]
);

export const leakAudits = pgTable(
  "leak_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id").references(() => leakReports.id, { onDelete: "cascade" }),
    meterId: uuid("meter_id").references(() => meters.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g., 'LEAK_DETECTED', 'VALVE_CLOSED', 'LEAK_RESOLVED', 'VALVE_OPEN_ATTEMPT'
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }), // Admin or System
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("leak_audits_report_id_index").on(t.reportId),
    index("leak_audits_meter_id_index").on(t.meterId),
  ]
);

export type LeakReport = typeof leakReports.$inferSelect;
export type NewLeakReport = typeof leakReports.$inferInsert;
export type LeakAudit = typeof leakAudits.$inferSelect;
export type NewLeakAudit = typeof leakAudits.$inferInsert;

export const createLeakReportSchema = createInsertSchema(leakReports);
export const leakReportSchema = createSelectSchema(leakReports);
export const createLeakAuditSchema = createInsertSchema(leakAudits);
export const leakAuditSchema = createSelectSchema(leakAudits);
