import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "../config/db";
import { gasTransfers, NewGasTransfer, GasTransfer } from "../db/schema/gas-transfers.schema";

export class GasTransferRepository {
  private db = getDb();

  async create(data: NewGasTransfer, dbInstance?: any): Promise<GasTransfer> {
    const client = dbInstance || this.db;
    const [result] = await client.insert(gasTransfers).values(data).returning();
    return result;
  }

  async findById(id: string): Promise<GasTransfer | undefined> {
    const [result] = await this.db.select().from(gasTransfers).where(eq(gasTransfers.id, id)).limit(1);
    return result;
  }

  async findBySenderId(senderId: string): Promise<GasTransfer[]> {
    return await this.db
      .select()
      .from(gasTransfers)
      .where(eq(gasTransfers.senderId, senderId))
      .orderBy(desc(gasTransfers.createdAt));
  }

  async findByRecipientId(recipientId: string): Promise<GasTransfer[]> {
    return await this.db
      .select()
      .from(gasTransfers)
      .where(eq(gasTransfers.recipientId, recipientId))
      .orderBy(desc(gasTransfers.createdAt));
  }
}
