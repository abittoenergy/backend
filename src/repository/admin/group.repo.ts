import { eq, sql } from "drizzle-orm";
import { getDb } from "../../config/db";
import { adminGroups, AdminGroup, NewAdminGroup } from "../../db/schema/admin/groups.schema";
import { DbClient } from "../../config/db";

export class GroupRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  async findById(id: string): Promise<AdminGroup | undefined> {
    const [result] = await this.db
      .select()
      .from(adminGroups)
      .where(eq(adminGroups.id, id))
      .limit(1);
    return result;
  }

  async findAll() {
    return await this.db
      .select()
      .from(adminGroups)
      .where(eq(adminGroups.isArchived, false));
  }

  async create(data: NewAdminGroup): Promise<AdminGroup> {
    const [result] = await this.db.insert(adminGroups).values(data).returning();
    return result;
  }

  async findByName(name: string): Promise<AdminGroup | undefined> {
    const [result] = await this.db
      .select()
      .from(adminGroups)
      .where(sql`lower(${adminGroups.name}) = ${name.toLowerCase()}`)
      .limit(1);
    return result;
  }
}
