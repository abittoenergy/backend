import { eq, desc, and, or, ilike, gte, lte, sql, getTableColumns } from "drizzle-orm";
import { getDb } from "../config/db";
import { meterLinkRequests, MeterLinkRequest, NewMeterLinkRequest, LinkRequestStatus } from "../db/schema/meter-link-requests.schema";
import { meters, users, Meter, User } from "../db/schema";

export type MeterLinkRequestWithDetails = {
  meter_link_requests: MeterLinkRequest;
  meters: Meter;
  users: Omit<User, "passwordHash">;
};

export interface AdminLinkRequestQueryOptions {
  page?: number;
  limit?: number;
  status?: LinkRequestStatus;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

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

  async findAll(filters?: { status?: LinkRequestStatus }): Promise<MeterLinkRequestWithDetails[]> {
    const { passwordHash, ...userColumns } = getTableColumns(users);

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(meterLinkRequests.status, filters.status));
    }

    const query = this.db
      .select({
        meter_link_requests: getTableColumns(meterLinkRequests),
        meters: getTableColumns(meters),
        users: userColumns,
      })
      .from(meterLinkRequests)
      .innerJoin(meters, eq(meterLinkRequests.meterId, meters.id))
      .innerJoin(users, eq(meterLinkRequests.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(meterLinkRequests.createdAt));

    return await query;
  }

  async findAllAdmin(options: AdminLinkRequestQueryOptions) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const { passwordHash, ...userColumns } = getTableColumns(users);
    const conditions = [];

    if (options.status) {
      conditions.push(eq(meterLinkRequests.status, options.status));
    }

    if (options.startDate) {
      conditions.push(gte(meterLinkRequests.createdAt, options.startDate));
    }

    if (options.endDate) {
      conditions.push(lte(meterLinkRequests.createdAt, options.endDate));
    }

    if (options.search) {
      const searchPattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(meters.meterNumber, searchPattern),
          ilike(meters.deviceId, searchPattern),
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern),
          ilike(users.email, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.db
      .select({
        meter_link_requests: getTableColumns(meterLinkRequests),
        meters: getTableColumns(meters),
        users: userColumns,
      })
      .from(meterLinkRequests)
      .innerJoin(meters, eq(meterLinkRequests.meterId, meters.id))
      .innerJoin(users, eq(meterLinkRequests.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(meterLinkRequests.createdAt));

    const [{ count: total }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(meterLinkRequests)
      .innerJoin(meters, eq(meterLinkRequests.meterId, meters.id))
      .innerJoin(users, eq(meterLinkRequests.userId, users.id))
      .where(whereClause);

    return {
      results,
      total: Number(total),
      page,
      limit,
    };
  }

  async getGlobalStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statsQuery = this.db.select({
      pendingCount: sql<number>`count(*) filter (where ${meterLinkRequests.status} = ${LinkRequestStatus.PENDING})`,
      sentTodayCount: sql<number>`count(*) filter (where ${meterLinkRequests.createdAt} >= ${today.toISOString()})`,
      rejectedCount: sql<number>`count(*) filter (where ${meterLinkRequests.status} = ${LinkRequestStatus.REJECTED})`,
      rejectedTodayCount: sql<number>`count(*) filter (where ${meterLinkRequests.status} = ${LinkRequestStatus.REJECTED} and ${meterLinkRequests.updatedAt} >= ${today.toISOString()})`,
    }).from(meterLinkRequests);

    const [counts] = await statsQuery;

    const [{ linkedMetersCount }] = await this.db
      .select({ linkedMetersCount: sql<number>`count(*)` })
      .from(meters)
      .where(sql`${meters.userId} is not null`);

    return {
      pendingLinkRequests: Number(counts.pendingCount),
      linkRequestsToday: Number(counts.sentTodayCount),
      totalLinkedMeters: Number(linkedMetersCount),
      rejectedRequests: Number(counts.rejectedCount),
      rejectedToday: Number(counts.rejectedTodayCount),
    };
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
