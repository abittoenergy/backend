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

  async getGlobalUsageStats(days: number = 7) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    const chart = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${gasUsageAudits.createdAt})::date`,
        totalKg: sql<string>`sum(${gasUsageAudits.kgUsed})`,
      })
      .from(gasUsageAudits)
      .where(gte(gasUsageAudits.createdAt, startDate))
      .groupBy(sql`date_trunc('day', ${gasUsageAudits.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${gasUsageAudits.createdAt})::date`);

    const [{ totalKgThisWeek }] = await this.db
      .select({ totalKgThisWeek: sql<string>`coalesce(sum(${gasUsageAudits.kgUsed}), '0')` })
      .from(gasUsageAudits)
      .where(gte(gasUsageAudits.createdAt, startDate));

    const [{ totalKgToday }] = await this.db
      .select({ totalKgToday: sql<string>`coalesce(sum(${gasUsageAudits.kgUsed}), '0')` })
      .from(gasUsageAudits)
      .where(gte(gasUsageAudits.createdAt, today));

    const [{ totalKgPrevWeek }] = await this.db
      .select({ totalKgPrevWeek: sql<string>`coalesce(sum(${gasUsageAudits.kgUsed}), '0')` })
      .from(gasUsageAudits)
      .where(and(gte(gasUsageAudits.createdAt, prevStartDate), lte(gasUsageAudits.createdAt, startDate)));

    const thisWeek = parseFloat(totalKgThisWeek);
    const prevWeek = parseFloat(totalKgPrevWeek);

    const percentageChangeUsage = prevWeek > 0
      ? ((thisWeek - prevWeek) / prevWeek) * 100
      : thisWeek > 0 ? 100 : 0;

    return {
      usageChart: chart.map(r => ({
        date: new Date(r.date).toISOString().split('T')[0],
        totalKg: parseFloat(r.totalKg || '0')
      })),
      totalKgUsedThisWeek: thisWeek,
      totalKgUsedToday: parseFloat(totalKgToday),
      percentageChangeUsage: parseFloat(percentageChangeUsage.toFixed(2)),
    };
  }

  async getPaginatedDailyUsage(meterId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const data = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${gasUsageAudits.createdAt})::date`,
        kgUsed: sql<string>`sum(${gasUsageAudits.kgUsed})`,
        durationMinutes: sql<number>`count(*)`
      })
      .from(gasUsageAudits)
      .where(eq(gasUsageAudits.meterId, meterId))
      .groupBy(sql`date_trunc('day', ${gasUsageAudits.createdAt})::date`)
      .orderBy(desc(sql`date_trunc('day', ${gasUsageAudits.createdAt})::date`))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await this.db
      .select({ count: sql<number>`count(distinct date_trunc('day', ${gasUsageAudits.createdAt})::date)` })
      .from(gasUsageAudits)
      .where(eq(gasUsageAudits.meterId, meterId));

    return {
      results: data.map(r => ({
        date: new Date(r.date).toISOString().split('T')[0],
        kgUsed: parseFloat(r.kgUsed),
        duration: `${r.durationMinutes} mins`
      })),
      total: Number(totalResult.count),
      page,
      limit
    };
  }
}
