import { eq, desc, and, or, ilike, sql, gte, lte, getTableColumns } from "drizzle-orm";
import { getDb, DbClient } from "../config/db";
import { transactions, Transaction, NewTransaction } from "../db/schema/transactions.schema";
import { users } from "../db/schema/users.schema";

export interface AdminTransactionQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

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

  async findByIdWithUser(id: string) {
    const { passwordHash, ...userColumns } = getTableColumns(users);
    const [result] = await this.db
      .select({
        transaction: getTableColumns(transactions),
        user: userColumns,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(eq(transactions.id, id))
      .limit(1);
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

  async findAllAdmin(options: AdminTransactionQueryOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (options.search) {
      const searchPattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(transactions.reference, searchPattern),
          ilike(transactions.id, searchPattern),
          ilike(transactions.description, searchPattern)
        )
      );
    }

    if (options.status) {
      conditions.push(eq(transactions.status, options.status as any));
    }

    if (options.type) {
      conditions.push(eq(transactions.type, options.type as any));
    }

    if (options.startDate) {
      conditions.push(gte(transactions.createdAt, new Date(options.startDate)));
    }

    if (options.endDate) {
      conditions.push(lte(transactions.createdAt, new Date(options.endDate)));
    }

    if (options.minAmount !== undefined) {
      conditions.push(gte(transactions.amount, options.minAmount));
    }

    if (options.maxAmount !== undefined) {
      conditions.push(lte(transactions.amount, options.maxAmount));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.db
      .select({
        ...getTableColumns(transactions),
        userName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.createdAt));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause);

    return {
      results,
      total: Number(count),
      page,
      limit,
    };
  }

  async getAdminStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Total Revenue (SUCCESS)
    const [{ totalRevenue }] = await this.db
      .select({ totalRevenue: sql<string>`coalesce(sum(${transactions.amount}), '0')` })
      .from(transactions)
      .where(eq(transactions.status, "SUCCESS"));

    // Processed in last 24h
    const [{ processedLast24hrs }] = await this.db
      .select({ processedLast24hrs: sql<string>`coalesce(sum(${transactions.amount}), '0')` })
      .from(transactions)
      .where(and(eq(transactions.status, "SUCCESS"), gte(transactions.createdAt, last24h)));

    // Total Transactions
    const [{ totalTransactions }] = await this.db.select({ totalTransactions: sql<number>`count(*)` }).from(transactions);

    // Current month count
    const [{ currentMonthCount }] = await this.db
      .select({ currentMonthCount: sql<number>`count(*)` })
      .from(transactions)
      .where(gte(transactions.createdAt, last30d));

    // Previous month count
    const [{ prevMonthCount }] = await this.db
      .select({ prevMonthCount: sql<number>`count(*)` })
      .from(transactions)
      .where(and(gte(transactions.createdAt, last60d), lte(transactions.createdAt, last30d)));

    // Average transaction time (SUCCESS or FAILED)
    const [{ avgTimeSeconds }] = await this.db
      .select({
        avgTimeSeconds: sql<number>`coalesce(avg(extract(epoch from (${transactions.updatedAt} - ${transactions.createdAt}))), 0)`
      })
      .from(transactions)
      .where(or(eq(transactions.status, "SUCCESS"), eq(transactions.status, "FAILED")));

    // Total Failed
    const [{ totalFailed }] = await this.db
      .select({ totalFailed: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.status, "FAILED"));

    const percentageIncrease = prevMonthCount > 0
      ? ((currentMonthCount - prevMonthCount) / prevMonthCount) * 100
      : currentMonthCount > 0 ? 100 : 0;

    return {
      totalRevenue: parseFloat(totalRevenue),
      processedLast24hrs: parseFloat(processedLast24hrs),
      totalTransactions: Number(totalTransactions),
      percentageIncreasePastMonth: parseFloat(percentageIncrease.toFixed(2)),
      averageTransactionTimeSeconds: Number(avgTimeSeconds),
      totalFailedTransactions: Number(totalFailed),
    };
  }

  async findAllByUser(userId: string, options: AdminTransactionQueryOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(transactions.userId, userId)];

    if (options.status) {
      conditions.push(eq(transactions.status, options.status as any));
    }

    if (options.type) {
      conditions.push(eq(transactions.type, options.type as any));
    }

    if (options.startDate) {
      conditions.push(gte(transactions.createdAt, new Date(options.startDate)));
    }

    if (options.endDate) {
      conditions.push(lte(transactions.createdAt, new Date(options.endDate)));
    }

    const whereClause = and(...conditions);

    const results = await this.db
      .select()
      .from(transactions)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.createdAt));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause);

    return {
      results,
      total: Number(count),
      page,
      limit,
    };
  }

  async findAllByMeter(userId: string, meterId: string, options: AdminTransactionQueryOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(transactions.userId, userId),
      sql`${transactions.metadata}->>'meterId' = ${meterId}`
    ];

    if (options.status) {
      conditions.push(eq(transactions.status, options.status as any));
    }

    if (options.type) {
      conditions.push(eq(transactions.type, options.type as any));
    }

    if (options.startDate) {
      conditions.push(gte(transactions.createdAt, new Date(options.startDate)));
    }

    if (options.endDate) {
      conditions.push(lte(transactions.createdAt, new Date(options.endDate)));
    }

    const whereClause = and(...conditions);

    const results = await this.db
      .select()
      .from(transactions)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(transactions.createdAt));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause);

    return {
      results,
      total: Number(count),
      page,
      limit,
    };
  }
}
