import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../config/db";
import { gasUsageAudits, NewGasUsageAudit, GasUsageAudit } from "../db/schema/gas-usage-audits.schema";

export class GasUsageAuditRepository {
  private db = getDb();

  async create(data: NewGasUsageAudit): Promise<GasUsageAudit> {
    const [result] = await this.db.insert(gasUsageAudits).values(data).returning();
    return result;
  }

  async findByUserId(userId: string, limit: number = 10, meterId?: string): Promise<GasUsageAudit[]> {
    const conditions = [eq(gasUsageAudits.userId, userId)];
    if (meterId) {
      conditions.push(eq(gasUsageAudits.meterId, meterId));
    }

    return await this.db
      .select()
      .from(gasUsageAudits)
      .where(and(...conditions))
      .orderBy(desc(gasUsageAudits.createdAt))
      .limit(limit);
  }

  async getUsageStats(meterId: string, startDate: Date, endDate: Date): Promise<number> {
    const [result] = await this.db
      .select({ total: sql<string>`sum(${gasUsageAudits.kgUsed})` })
      .from(gasUsageAudits)
      .where(
        and(
          eq(gasUsageAudits.meterId, meterId),
          gte(gasUsageAudits.createdAt, startDate),
          lte(gasUsageAudits.createdAt, endDate)
        )
      );

    return parseFloat(result?.total || "0");
  }

  async getDailyUsageBreakdown(meterId: string, days: number = 7): Promise<{ date: string; total: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${gasUsageAudits.createdAt})::date`,
        total: sql<string>`sum(${gasUsageAudits.kgUsed})`,
      })
      .from(gasUsageAudits)
      .where(and(eq(gasUsageAudits.meterId, meterId), gte(gasUsageAudits.createdAt, startDate)))
      .groupBy(sql`date_trunc('day', ${gasUsageAudits.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${gasUsageAudits.createdAt})::date`);

    return result.map((r) => ({
      date: new Date(r.date).toISOString().split("T")[0],
      total: parseFloat(r.total || "0"),
    }));
  }
}
