import db from "../config/db";
import { leakReports, leakAudits, LeakReport, NewLeakReport, LeakReportStatus, NewLeakAudit } from "../db/schema/leak-reports.schema";
import { eq, and, desc, sql, or } from "drizzle-orm";
import { meters } from "../db/schema/meters.schema";
import { users } from "../db/schema/users.schema";

export class LeakReportRepo {
  static async create(data: NewLeakReport) {
    const [report] = await db.insert(leakReports).values(data).returning();
    return report;
  }

  static async findUnresolvedByDeviceId(deviceId: string) {
    const [report] = await db
      .select()
      .from(leakReports)
      .where(
        and(
          eq(leakReports.deviceId, deviceId),
          eq(leakReports.status, LeakReportStatus.DETECTED)
        )
      )
      .limit(1);
    return report;
  }

  static async update(id: string, data: Partial<LeakReport>) {
    const [report] = await db
      .update(leakReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leakReports.id, id))
      .returning();
    return report;
  }

  static async findById(id: string) {
    const [result] = await db
      .select({
        leakReport: leakReports,
        meter: meters,
        user: users,
      })
      .from(leakReports)
      .innerJoin(meters, eq(leakReports.meterId, meters.id))
      .leftJoin(users, eq(leakReports.userId, users.id))
      .where(eq(leakReports.id, id))
      .limit(1);
    return result;
  }

  static async findAllAdmin(options: {
    page: number;
    limit: number;
    status?: LeakReportStatus;
    search?: string;
  }) {
    const offset = (options.page - 1) * options.limit;

    let whereClause = undefined;
    if (options.status) {
      whereClause = eq(leakReports.status, options.status);
    }

    if (options.search) {
      const searchPattern = `%${options.search}%`;
      const searchCondition = or(
        sql`${leakReports.deviceId} ILIKE ${searchPattern}`,
        sql`${meters.meterNumber} ILIKE ${searchPattern}`
      );
      whereClause = whereClause ? and(whereClause, searchCondition) : searchCondition;
    }

    const results = await db
      .select({
        leakReport: leakReports,
        meter: meters,
        user: users,
      })
      .from(leakReports)
      .innerJoin(meters, eq(leakReports.meterId, meters.id))
      .leftJoin(users, eq(leakReports.userId, users.id))
      .where(whereClause)
      .orderBy(desc(leakReports.detectedAt))
      .limit(options.limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leakReports)
      .innerJoin(meters, eq(leakReports.meterId, meters.id))
      .where(whereClause);

    return { results, total: Number(count) };
  }

  static async createAudit(data: NewLeakAudit) {
    const [audit] = await db.insert(leakAudits).values(data).returning();
    return audit;
  }
}
