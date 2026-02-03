
import { eq, desc } from "drizzle-orm";
import { getDb } from "../config/db";
import { estate, Estate, NewEstate } from "../db/schema/estate.schema";

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
};
