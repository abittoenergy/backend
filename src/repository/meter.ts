import { eq, and, or, ilike, count, sql } from "drizzle-orm";
import db from "../config/db";
import { meters, Meter, NewMeter, MeterStatus } from "../db/schema/meters.schema";
import { users } from "../db/schema/users.schema";

export interface AdminMeterQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  isLinked?: boolean;
}

export const MeterRepo = {
  async findByDeviceId(deviceId: string): Promise<Meter | undefined> {
    const [result] = await db.select().from(meters).where(eq(meters.deviceId, deviceId)).limit(1);
    return result;
  },

  async findByMeterNumber(meterNumber: string): Promise<Meter | undefined> {
    const [result] = await db.select().from(meters).where(eq(meters.meterNumber, meterNumber)).limit(1);
    return result;
  },

  async findById(id: string): Promise<Meter | undefined> {
    const [result] = await db.select().from(meters).where(eq(meters.id, id)).limit(1);
    return result;
  },

  async create(data: NewMeter): Promise<Meter> {
    const [result] = await db.insert(meters).values(data).returning();
    return result;
  },

  async updateStatus(deviceId: string, status: MeterStatus): Promise<Meter | undefined> {
    const [result] = await db
      .update(meters)
      .set({ status, updatedAt: new Date() })
      .where(eq(meters.deviceId, deviceId))
      .returning();
    return result;
  },

  async updateValveStatus(deviceId: string, status: boolean): Promise<Meter | undefined> {
    const [result] = await db
      .update(meters)
      .set({ valveStatus: status, updatedAt: new Date() })
      .where(eq(meters.deviceId, deviceId))
      .returning();
    return result;
  },

  async linkUser(deviceId: string, userId: string, propertyData?: { estateId?: string, houseNumber?: string, estateName?: string }, meterNumber?: string): Promise<Meter | undefined> {
    const [result] = await db
      .update(meters)
      .set({
        userId,
        meterNumber,
        status: MeterStatus.REGISTERED,
        estateId: propertyData?.estateId,
        houseNumber: propertyData?.houseNumber,
        estateName: propertyData?.estateName,
        updatedAt: new Date()
      })
      .where(eq(meters.deviceId, deviceId))
      .returning();
    return result;
  },

  async findByUserId(userId: string): Promise<Meter[]> {
    const results = await db.select().from(meters).where(eq(meters.userId, userId));
    return results;
  },

  async findAllAdmin(options: AdminMeterQueryOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options.search) {
      const searchPattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(meters.deviceId, searchPattern),
          ilike(meters.meterNumber, searchPattern),
          ilike(users.firstName, searchPattern),
          ilike(users.lastName, searchPattern)
        )
      );
    }

    if (options.isLinked !== undefined) {
      if (options.isLinked) {
        conditions.push(sql`${meters.userId} IS NOT NULL`);
      } else {
        conditions.push(sql`${meters.userId} IS NULL`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select({
        meter: meters,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(meters)
      .leftJoin(users, eq(meters.userId, users.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${meters.createdAt} DESC`);

    const results = await query;

    const totalCountQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(meters)
      .leftJoin(users, eq(meters.userId, users.id))
      .where(whereClause);

    const [totalResult] = await totalCountQuery;

    return {
      results,
      total: Number(totalResult.count),
      page,
      limit,
    };
  },

  async getStats() {
    const [totalMeters] = await db.select({ count: sql<number>`count(*)` }).from(meters);
    const [linkedMeters] = await db.select({ count: sql<number>`count(*)` }).from(meters).where(sql`${meters.userId} IS NOT NULL`);
    const [unlinkedMeters] = await db.select({ count: sql<number>`count(*)` }).from(meters).where(sql`${meters.userId} IS NULL`);

    return {
      total: Number(totalMeters.count),
      linked: Number(linkedMeters.count),
      unlinked: Number(unlinkedMeters.count),
    };
  },

  async unlinkUser(deviceId: string): Promise<Meter | undefined> {
    const [result] = await db
      .update(meters)
      .set({
        userId: null,
        status: MeterStatus.UNREGISTERED,
        estateId: null,
        houseNumber: null,
        estateName: null,
        updatedAt: new Date()
      })
      .where(eq(meters.deviceId, deviceId))
      .returning();
    return result;
  },

  async updateGasBalance(meterId: string, amountKg: number, dbInstance?: any): Promise<number> {
    const client = dbInstance || db;
    const [result] = await client
      .update(meters)
      .set({
        availableGasKg: sql`${meters.availableGasKg} + ${amountKg}`,
        updatedAt: new Date(),
      })
      .where(eq(meters.id, meterId))
      .returning({ availableGasKg: meters.availableGasKg });

    return parseFloat(result.availableGasKg);
  },
};
