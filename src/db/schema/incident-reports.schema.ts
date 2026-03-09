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

export enum IncidentReportStatus {
  DETECTED = "detected",
  RESOLVED = "resolved",
}

export enum IncidentType {
  LEAKAGE_DETECTION = "leakage_detection",
  DEVICE_TAMPERING = "device_tampering",
}

export const INCIDENT_REPORT_STATUSES = Object.values(IncidentReportStatus) as [IncidentReportStatus, ...IncidentReportStatus[]];
export const INCIDENT_TYPES = Object.values(IncidentType) as [IncidentType, ...IncidentType[]];

export const incidentReports = pgTable(
  "incident_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meterId: uuid("meter_id").references(() => meters.id, { onDelete: "cascade" }).notNull(),
    deviceId: varchar("device_id", { length: 255 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Owner at time of incident
    status: text("status", { enum: INCIDENT_REPORT_STATUSES }).$type<IncidentReportStatus>().notNull().default(IncidentReportStatus.DETECTED),
    type: text("type", { enum: INCIDENT_TYPES }).$type<IncidentType>().notNull().default(IncidentType.LEAKAGE_DETECTION),
    detectedAt: timestamp("detected_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("incident_reports_meter_id_index").on(t.meterId),
    index("incident_reports_device_id_index").on(t.deviceId),
    index("incident_reports_status_index").on(t.status),
    index("incident_reports_type_index").on(t.type),
  ]
);

export const incidentAudits = pgTable(
  "incident_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id").references(() => incidentReports.id, { onDelete: "cascade" }),
    meterId: uuid("meter_id").references(() => meters.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g., 'INCIDENT_DETECTED', 'VALVE_CLOSED', 'INCIDENT_RESOLVED', 'VALVE_OPEN_ATTEMPT'
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }), // Admin or System
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("incident_audits_report_id_index").on(t.reportId),
    index("incident_audits_meter_id_index").on(t.meterId),
  ]
);

export type IncidentReport = typeof incidentReports.$inferSelect;
export type NewIncidentReport = typeof incidentReports.$inferInsert;
export type IncidentAudit = typeof incidentAudits.$inferSelect;
export type NewIncidentAudit = typeof incidentAudits.$inferInsert;

export const createIncidentReportSchema = createInsertSchema(incidentReports);
export const incidentReportSchema = createSelectSchema(incidentReports);
export const createIncidentAuditSchema = createInsertSchema(incidentAudits);
export const incidentAuditSchema = createSelectSchema(incidentAudits);
