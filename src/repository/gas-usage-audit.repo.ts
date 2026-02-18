import { eq, desc } from "drizzle-orm";
import { getDb } from "../config/db";
import { gasUsageAudits, NewGasUsageAudit, GasUsageAudit } from "../db/schema/gas-usage-audits.schema";

export class GasUsageAuditRepository {
  private db = getDb();

  async create(data: NewGasUsageAudit): Promise<GasUsageAudit> {
    const [result] = await this.db.insert(gasUsageAudits).values(data).returning();
    return result;
  }

  async findByUserId(userId: string, limit: number = 10): Promise<GasUsageAudit[]> {
    return await this.db
      .select()
      .from(gasUsageAudits)
      .where(eq(gasUsageAudits.userId, userId))
      .orderBy(desc(gasUsageAudits.createdAt))
      .limit(limit);
  }
}
