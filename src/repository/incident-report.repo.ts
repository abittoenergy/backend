import db from "../config/db";
import { incidentReports, incidentAudits, IncidentReport, NewIncidentReport, IncidentReportStatus, NewIncidentAudit, IncidentType } from "../db/schema/incident-reports.schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { meters } from "../db/schema/meters.schema";
import { users } from "../db/schema/users.schema";

export class IncidentReportRepo {
  static async create(data: NewIncidentReport) {
    const [report] = await db.insert(incidentReports).values(data).returning();
    return report;
  }

  static async findUnresolvedByDeviceId(deviceId: string) {
    const [report] = await db
      .select()
      .from(incidentReports)
      .where(
        and(
          eq(incidentReports.deviceId, deviceId),
          eq(incidentReports.status, IncidentReportStatus.DETECTED)
        )
      )
      .limit(1);
    return report;
  }

  static async update(id: string, data: Partial<IncidentReport>) {
    const [report] = await db
      .update(incidentReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(incidentReports.id, id))
      .returning();
    return report;
  }

  static async findById(id: string) {
    const [result] = await db
      .select({
        incidentReport: incidentReports,
        meter: meters,
        user: users,
      })
      .from(incidentReports)
      .innerJoin(meters, eq(incidentReports.meterId, meters.id))
      .leftJoin(users, eq(incidentReports.userId, users.id))
      .where(eq(incidentReports.id, id))
      .limit(1);
    return result;
  }

  static async findAllAdmin(options: {
    page: number;
    limit: number;
    status?: IncidentReportStatus;
    type?: IncidentType;
    search?: string;
  }) {
    const offset = (options.page - 1) * options.limit;

    let whereClause = undefined;
    if (options.status) {
      whereClause = eq(incidentReports.status, options.status);
    }

    if (options.type) {
      const typeCondition = eq(incidentReports.type, options.type);
      whereClause = whereClause ? and(whereClause, typeCondition) : typeCondition;
    }

    if (options.search) {
      const searchPattern = `%${options.search}%`;
      const searchCondition = or(
        sql`${incidentReports.deviceId} ILIKE ${searchPattern}`,
        sql`${meters.meterNumber} ILIKE ${searchPattern}`
      );
      whereClause = whereClause ? and(whereClause, searchCondition) : searchCondition;
    }

    const results = await db
      .select({
        report: incidentReports,
        meter: meters,
        user: { firstname: users.firstName, lastname: users.lastName, email: users.email },
      })
      .from(incidentReports)
      .innerJoin(meters, eq(incidentReports.meterId, meters.id))
      .leftJoin(users, eq(incidentReports.userId, users.id))
      .where(whereClause)
      .orderBy(desc(incidentReports.detectedAt))
      .limit(options.limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidentReports)
      .innerJoin(meters, eq(incidentReports.meterId, meters.id))
      .where(whereClause);

    return { results, total: Number(count) };
  }

  static async createAudit(data: NewIncidentAudit) {
    const [audit] = await db.insert(incidentAudits).values(data).returning();
    return audit;
  }

  static async countUnresolved() {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidentReports)
      .where(eq(incidentReports.status, IncidentReportStatus.DETECTED));
    return Number(count);
  }
}
