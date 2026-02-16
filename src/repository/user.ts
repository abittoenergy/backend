import { eq, or, ilike, and, sql, desc, gte, getTableColumns, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "../config/db";
import { users, User, NewUser } from "../db/schema/users.schema";
import { meters, gasPurchases, GasPurchaseStatus } from "../db/schema";

export interface AdminUserQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

export class UserRepository {

    private db = getDb();

    get client() {
        return this.db;
    }

    async findById(id: string): Promise<User | undefined> {
        const [result] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
        return result;
    }

    async findByEmail(email: string): Promise<User | undefined> {
        const [result] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
        return result;
    }

    async create(data: NewUser): Promise<User> {
        const [result] = await this.db.insert(users).values(data).returning();
        return result;
    }

    async update(id: string, data: Partial<NewUser>): Promise<Pick<User, "id" | "email" | "firstName" | "lastName" | "phoneNumber" | "gender" | "nin" | "estateId" | "houseNumber" | "onboardingEstateName" | "onboardingCompleted" | "updatedAt"> | undefined> {
        const [result] = await this.db.update(users).set(data).where(eq(users.id, id)).returning({ id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, phoneNumber: users.phoneNumber, gender: users.gender, nin: users.nin, estateId: users.estateId, houseNumber: users.houseNumber, onboardingEstateName: users.onboardingEstateName, onboardingCompleted: users.onboardingCompleted, updatedAt: users.updatedAt });
        return result;
    }

    async findAllAdmin(options: AdminUserQueryOptions = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const offset = (page - 1) * limit;

        const { passwordHash, ...userColumns } = getTableColumns(users);
        const conditions = [];

        if (options.search) {
            const searchPattern = `%${options.search}%`;
            conditions.push(
                or(
                    ilike(users.firstName, searchPattern),
                    ilike(users.lastName, searchPattern),
                    ilike(users.email, searchPattern),
                    ilike(users.phoneNumber, searchPattern),
                    ilike(users.nin, searchPattern)
                )
            );
        }

        if (options.isActive !== undefined) {
            conditions.push(eq(users.isActive, options.isActive));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await this.db
            .select({
                ...userColumns,
                hasLinkedMeter: sql<boolean>`CASE WHEN ${meters.id} IS NOT NULL THEN true ELSE false END`,
            })
            .from(users)
            .leftJoin(meters, eq(users.id, meters.userId))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(users.createdAt));

        const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause);

        return {
            results,
            total: Number(count),
            page,
            limit,
        };
    }

    async getGlobalStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isoToday = today.toISOString();

        // 1. Total Users
        const [{ totalUsers }] = await this.db.select({ totalUsers: sql<number>`count(*)` }).from(users);

        // 2. Joined Today
        const [{ joinedToday }] = await this.db
            .select({ joinedToday: sql<number>`count(*)` })
            .from(users)
            .where(sql`${users.createdAt} >= ${isoToday}`);

        // 3. Active Today (proxied by updatedAt)
        const [{ activeToday }] = await this.db
            .select({ activeToday: sql<number>`count(*)` })
            .from(users)
            .where(sql`${users.updatedAt} >= ${isoToday}`);

        // 4. Users without linked meters
        const [{ withoutMeters }] = await this.db
            .select({ withoutMeters: sql<number>`count(*)` })
            .from(users)
            .leftJoin(meters, eq(users.id, meters.userId))
            .where(isNull(meters.id));

        // 5. Total Kg purchased today
        const [{ totalKgToday }] = await this.db
            .select({ totalKgToday: sql<string>`coalesce(sum(${gasPurchases.kgPurchased}), '0')` })
            .from(gasPurchases)
            .where(and(
                eq(gasPurchases.status, GasPurchaseStatus.COMPLETED),
                sql`${gasPurchases.createdAt} >= ${isoToday}`
            ));

        return {
            totalUsers: Number(totalUsers),
            joinedToday: Number(joinedToday),
            activeToday: Number(activeToday),
            usersWithoutMeters: Number(withoutMeters),
            totalKgBoughtToday: parseFloat(totalKgToday),
        };
    }

    async updateGasBalance(userId: string, amountKg: number): Promise<number> {
        const [result] = await this.db
            .update(users)
            .set({
                availableGasKg: sql`${users.availableGasKg} + ${amountKg}`,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({ availableGasKg: users.availableGasKg });

        return parseFloat(result.availableGasKg);
    }
};

