import { eq, desc } from "drizzle-orm";
import { getDb, DbClient } from "../config/db";
import { transactions, Transaction, NewTransaction } from "../db/schema/transactions.schema";

export class TransactionRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  get client() {
    return this.db;
  }

  async findById(id: string): Promise<Transaction | undefined> {
    const [result] = await this.db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result;
  }

  async create(data: NewTransaction): Promise<Transaction> {
    const [result] = await (this.db as DbClient).insert(transactions).values(data).returning();
    return result;
  }

  async findByReference(reference: string): Promise<Transaction | undefined> {
    const [result] = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.reference, reference))
      .limit(1);
    return result;
  }

  async updateStatus(id: string, status: "PENDING" | "SUCCESS" | "FAILED", metadata?: any): Promise<Transaction | undefined> {
    const [result] = await (this.db as DbClient)
      .update(transactions)
      .set({
        status,
        metadata: metadata ? metadata : undefined,
        updatedAt: new Date()
      })
      .where(eq(transactions.id, id))
      .returning();
    return result;
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    return await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }
}
