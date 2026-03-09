import { eq } from "drizzle-orm";
import { getDb } from "../../config/db";
import { adminRoles, AdminRole } from "../../db/schema/admin/role.schema";
import { DbClient } from "../../config/db";

export class RoleRepository {
  private db: DbClient;

  constructor(db?: DbClient) {
    this.db = db || getDb();
  }

  async findById(id: string): Promise<AdminRole | undefined> {
    const [result] = await this.db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.id, id))
      .limit(1);
    return result;
  }

  async findAll() {
    return await this.db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.isArchived, false));
  }
}
