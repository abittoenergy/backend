import { eq, desc, and } from "drizzle-orm";
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
}
