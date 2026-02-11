import { eq, sql, isNull } from "drizzle-orm";
import { getDb } from "../config/db";
import {
  dedicatedVirtualAccounts,
  DedicatedVirtualAccount,
  NewDedicatedVirtualAccount
} from "../db/schema/dedicated-virtual-accounts.schema";
import { users } from "../db/schema/users.schema";

export class DedicatedVirtualAccountRepository {
  private db = getDb();

  async findByUserId(userId: string): Promise<DedicatedVirtualAccount | undefined> {
    const [result] = await this.db
      .select()
      .from(dedicatedVirtualAccounts)
      .where(eq(dedicatedVirtualAccounts.userId, userId))
      .limit(1);
    return result;
  }

  async findByAccountNumber(accountNumber: string): Promise<DedicatedVirtualAccount | undefined> {
    const [result] = await this.db
      .select()
      .from(dedicatedVirtualAccounts)
      .where(eq(dedicatedVirtualAccounts.accountNumber, accountNumber))
      .limit(1);
    return result;
  }

  async findByCustomerCode(customerCode: string): Promise<DedicatedVirtualAccount | undefined> {
    const [result] = await this.db
      .select()
      .from(dedicatedVirtualAccounts)
      .where(eq(dedicatedVirtualAccounts.customerCode, customerCode))
      .limit(1);
    return result;
  }

  async create(data: NewDedicatedVirtualAccount): Promise<DedicatedVirtualAccount> {
    const [result] = await this.db
      .insert(dedicatedVirtualAccounts)
      .values(data)
      .returning();
    return result;
  }

  async update(id: string, data: Partial<NewDedicatedVirtualAccount>): Promise<DedicatedVirtualAccount | undefined> {
    const [result] = await this.db
      .update(dedicatedVirtualAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dedicatedVirtualAccounts.id, id))
      .returning();
    return result;
  }

  async findVerifiedUsersWithoutDVA(): Promise<Array<{ id: string; email: string; firstName: string | null; lastName: string | null; phoneNumber: string | null }>> {
    const result = await this.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .leftJoin(dedicatedVirtualAccounts, eq(users.id, dedicatedVirtualAccounts.userId))
      .where(
        sql`${users.emailVerified} = true AND ${dedicatedVirtualAccounts.id} IS NULL`
      );

    return result;
  }
}
