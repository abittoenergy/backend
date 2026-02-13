import { eq, desc, sql, and, or, ilike, getTableColumns } from "drizzle-orm";
import { getDb } from "../config/db";
import { estate, Estate, NewEstate } from "../db/schema/estate.schema";
import { meters, MeterStatus } from "../db/schema/meters.schema";

export interface AdminEstateQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export class EstateRepo {


  private db = getDb();

  get client() {
    return this.db;
  }

  async create(data: NewEstate): Promise<Estate> {
    const [result] = await this.db.insert(estate).values(data).returning();
    return result;
  }

  async update(id: string, data: Partial<NewEstate>): Promise<Estate | undefined> {
    const [result] = await this.db
      .update(estate)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(estate.id, id))
      .returning();
    return result;
  }

  async findAll(): Promise<Estate[]> {
    return await this.db.select().from(estate).orderBy(desc(estate.createdAt));
  }

  async findById(id: string): Promise<Estate | undefined> {
    const [result] = await this.db.select().from(estate).where(eq(estate.id, id)).limit(1);
    return result;
  }

  async findAllAdmin(options: AdminEstateQueryOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (options.search) {
      const searchPattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(estate.name, searchPattern),
          ilike(estate.address, searchPattern),
          ilike(estate.city, searchPattern),
          ilike(estate.state, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await this.db
      .select({
        ...getTableColumns(estate),
        totalMeters: sql<number>`count(${meters.id})`,
        onlineMeters: sql<number>`sum(case when ${meters.status} = ${MeterStatus.ACTIVE} then 1 else 0 end)`,
      })
      .from(estate)
      .leftJoin(meters, eq(estate.id, meters.estateId))
      .where(whereClause)
      .groupBy(estate.id)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(estate.createdAt));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(estate)
      .where(whereClause);

    return {
      results,
      total: Number(count),
      page,
      limit,
    };
  }

  async getGlobalStats() {
    const [{ totalEstates }] = await this.db.select({ totalEstates: sql<number>`count(*)` }).from(estate);

    const [{ totalMetersOnline }] = await this.db
      .select({ totalMetersOnline: sql<number>`count(*)` })
      .from(meters)
      .where(eq(meters.status, MeterStatus.ACTIVE));

    const inactiveEstatesQuery = this.db
      .select({ id: estate.id })
      .from(estate)
      .leftJoin(meters, eq(estate.id, meters.estateId))
      .groupBy(estate.id)
      .having(sql`sum(case when ${meters.status} = ${MeterStatus.ACTIVE} then 1 else 0 end) = 0`);

    const inactiveEstatesResults = await inactiveEstatesQuery;

    return {
      totalEstates: Number(totalEstates),
      totalMetersOnline: Number(totalMetersOnline),
      inactiveEstates: inactiveEstatesResults.length,
    };
  }
};
