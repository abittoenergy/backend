import { eq, and, desc, sql, gte } from "drizzle-orm";
import { getDb } from "../config/db";
import {
  gasPurchases,
  NewGasPurchase,
  GasPurchase,
  GasPurchaseStatus,
} from "../db/schema/gas-purchases.schema";


export class GasPurchaseRepository {
  private db: any;

  constructor(db?: any) {
    this.db = db || getDb();
  }

  async create(data: NewGasPurchase): Promise<GasPurchase> {
    const [purchase] = await this.db.insert(gasPurchases).values(data).returning();
    return purchase;
  }

  async findById(id: string): Promise<GasPurchase | undefined> {
    const [purchase] = await this.db
      .select()
      .from(gasPurchases)
      .where(eq(gasPurchases.id, id))
      .limit(1);
    return purchase;
  }

  async findByTransactionId(transactionId: string): Promise<GasPurchase | undefined> {
    const [purchase] = await this.db
      .select()
      .from(gasPurchases)
      .where(eq(gasPurchases.transactionId, transactionId))
      .limit(1);
    return purchase;
  }

  async findByUserId(userId: string): Promise<GasPurchase[]> {
    return await this.db
      .select()
      .from(gasPurchases)
      .where(eq(gasPurchases.userId, userId))
      .orderBy(desc(gasPurchases.createdAt));
  }

  async findByMeterId(meterId: string): Promise<GasPurchase[]> {
    return await this.db
      .select()
      .from(gasPurchases)
      .where(eq(gasPurchases.meterId, meterId))
      .orderBy(desc(gasPurchases.createdAt));
  }

  async updateStatus(
    id: string,
    status: GasPurchaseStatus,
    metadata?: any
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (metadata) {
      updateData.metadata = metadata;
    }

    await this.db.update(gasPurchases).set(updateData).where(eq(gasPurchases.id, id));
  }

  async markMqttCommandSent(id: string, commandId: string): Promise<void> {
    await this.db
      .update(gasPurchases)
      .set({
        mqttCommandSent: true,
        mqttCommandSentAt: new Date(),
        mqttCommandId: commandId,
        updatedAt: new Date(),
      })
      .where(eq(gasPurchases.id, id));
  }

  async markRefillStarted(id: string): Promise<void> {
    await this.db
      .update(gasPurchases)
      .set({
        status: GasPurchaseStatus.DISPENSING,
        refillStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gasPurchases.id, id));
  }

  async markRefillCompleted(id: string, kgDispensed: string): Promise<void> {
    await this.db
      .update(gasPurchases)
      .set({
        status: GasPurchaseStatus.COMPLETED,
        refillCompletedAt: new Date(),
        kgDispensed,
        updatedAt: new Date(),
      })
      .where(eq(gasPurchases.id, id));
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.db
      .update(gasPurchases)
      .set({
        status: GasPurchaseStatus.FAILED,
        failureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(gasPurchases.id, id));
  }

  async findPendingRefills(): Promise<GasPurchase[]> {
    return await this.db
      .select()
      .from(gasPurchases)
      .where(
        and(
          eq(gasPurchases.status, GasPurchaseStatus.PENDING),
          eq(gasPurchases.mqttCommandSent, true)
        )
      )
      .orderBy(desc(gasPurchases.createdAt));
  }

  async findByMqttCommandId(commandId: string): Promise<GasPurchase | undefined> {
    const [purchase] = await this.db
      .select()
      .from(gasPurchases)
      .where(eq(gasPurchases.mqttCommandId, commandId))
      .limit(1);
    return purchase;
  }

  async getUserGasStats(userId: string) {
    const last30d = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

    const [{ totalKgPurchasedLast30d }] = await this.db
      .select({
        totalKgPurchasedLast30d: sql<string>`coalesce(sum(${gasPurchases.kgPurchased}), '0')`,
      })
      .from(gasPurchases)
      .where(
        and(
          eq(gasPurchases.userId, userId),
          eq(gasPurchases.status, GasPurchaseStatus.COMPLETED),
          gte(gasPurchases.createdAt, last30d)
        )
      );

    return {
      totalKgPurchasedLast30d: parseFloat(totalKgPurchasedLast30d),
    };
  }
}
