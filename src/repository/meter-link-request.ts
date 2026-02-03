import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../config/db";
import { meterLinkRequests, MeterLinkRequest, NewMeterLinkRequest, LinkRequestStatus } from "../db/schema/meter-link-requests.schema";

export class MeterLinkRequestRepo {
  private db = getDb();

  async create(data: NewMeterLinkRequest): Promise<MeterLinkRequest> {
    const [result] = await this.db.insert(meterLinkRequests).values(data).returning();
    return result;
  }

  async findById(id: string): Promise<MeterLinkRequest | undefined> {
    const [result] = await this.db.select().from(meterLinkRequests).where(eq(meterLinkRequests.id, id)).limit(1);
    return result;
  }

  async findPendingByMeterId(meterId: string): Promise<MeterLinkRequest | undefined> {
    const [result] = await this.db
      .select()
      .from(meterLinkRequests)
      .where(
        and(
          eq(meterLinkRequests.meterId, meterId),
          eq(meterLinkRequests.status, LinkRequestStatus.PENDING)
        )
      )
      .limit(1);
    return result;
  }

  async findAll(filters?: { status?: LinkRequestStatus }): Promise<MeterLinkRequest[]> {
    let query = this.db.select().from(meterLinkRequests).orderBy(desc(meterLinkRequests.createdAt));

    if (filters?.status) {
      query = query.where(eq(meterLinkRequests.status, filters.status)) as any;
    }

    return await query;
  }

  async update(id: string, data: Partial<NewMeterLinkRequest>): Promise<MeterLinkRequest | undefined> {
    const [result] = await this.db
      .update(meterLinkRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(meterLinkRequests.id, id))
      .returning();
    return result;
  }
}
