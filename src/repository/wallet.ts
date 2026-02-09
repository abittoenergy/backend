import { eq } from "drizzle-orm";
import { getDb, DbClient } from "../config/db";
import { wallets, Wallet, NewWallet } from "../db/schema/wallets.schema";

export class WalletRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  get client() {
    return this.db;
  }

  async findById(id: string): Promise<Wallet | undefined> {
    const [result] = await this.db.select().from(wallets).where(eq(wallets.id, id)).limit(1);
    return result;
  }

  async findByUserId(userId: string): Promise<Wallet | undefined> {
    const [result] = await this.db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    return result;
  }

  async create(data: NewWallet): Promise<Wallet> {
    const [result] = await (this.db as any).insert(wallets).values(data).returning();
    return result;
  }

  async updateBalance(walletId: string, amount: number): Promise<Wallet | undefined> {
    const [result] = await (this.db as any)
      .update(wallets)
      .set({
        balance: amount,
        updatedAt: new Date()
      })
      .where(eq(wallets.id, walletId))
      .returning();
    return result;
  }
}
