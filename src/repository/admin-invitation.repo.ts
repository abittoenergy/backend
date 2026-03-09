import { eq, and, desc, sql } from "drizzle-orm";
import db from "../config/db";
import { adminInvitations, AdminInvitation, NewAdminInvitation, InvitationStatus } from "../db/schema/admin/invitations.schema";

export class AdminInvitationRepository {

  static async update(id: string, data: Partial<NewAdminInvitation>) {
    const [invitation] = await db.update(adminInvitations).set(data).where(eq(adminInvitations.id, id)).returning();
    return invitation;
  }
  static async create(data: NewAdminInvitation) {
    const [invitation] = await db.insert(adminInvitations).values(data).returning();
    return invitation;
  }

  static async findByToken(tokenHash: string) {
    const [invitation] = await db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.tokenHash, tokenHash))
      .limit(1);
    return invitation;
  }

  static async findById(id: string) {
    const [invitation] = await db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.id, id))
      .limit(1);
    return invitation;
  }

  static async findByEmail(email: string) {
    const [invitation] = await db
      .select()
      .from(adminInvitations)
      .where(and(
        eq(adminInvitations.email, email),
        eq(adminInvitations.status, InvitationStatus.PENDING)
      ))
      .orderBy(adminInvitations.createdAt)
      .limit(1);
    return invitation;
  }

  static async updateStatus(id: string, status: InvitationStatus) {
    const [invitation] = await db
      .update(adminInvitations)
      .set({ status, updatedAt: new Date() })
      .where(eq(adminInvitations.id, id))
      .returning();
    return invitation;
  }

  static async delete(id: string) {
    await db.delete(adminInvitations).where(eq(adminInvitations.id, id));
  }

  static async findAll(options: { page?: number; limit?: number; status?: InvitationStatus; search?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options.status) {
      conditions.push(eq(adminInvitations.status, options.status));
    }
    if (options.search) {
      conditions.push(sql`${adminInvitations.email} ILIKE ${`%${options.search}%`}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(adminInvitations)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(adminInvitations.createdAt));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminInvitations)
      .where(whereClause);

    return {
      results,
      total: Number(count),
      page,
      limit,
    };
  }
}
