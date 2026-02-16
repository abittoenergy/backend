import { getDb } from "../config/db";
import { gasUsageAudits, NewGasUsageAudit, GasUsageAudit } from "../db/schema/gas-usage-audits.schema";

export class GasUsageAuditRepository {
  private db = getDb();

  async create(data: NewGasUsageAudit): Promise<GasUsageAudit> {
    const [result] = await this.db.insert(gasUsageAudits).values(data).returning();
    return result;
  }
}
