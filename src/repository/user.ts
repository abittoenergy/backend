import { eq, or, ilike, and, sql, desc, gte, getTableColumns, isNull, isNotNull } from "drizzle-orm";
import { getDb } from "../config/db";
import { users, User, NewUser } from "../db/schema/users.schema";
import { meters} from "../db/schema";
import { DbClient } from "../config/db";
import { gasPurchases, GasPurchaseStatus } from "../db/schema/gas-purchases.schema";

export interface AdminUserQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

export class UserRepository {

    private db: DbClient;

    constructor(db?: DbClient) {
        this.db = db || getDb();
    }

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

        const last30d = new Date();
        last30d.setDate(last30d.getDate() - 30);
        const isoLast30d = last30d.toISOString();

        const [{ totalUsers }] = await this.db.select({ totalUsers: sql<string>`count(*)` }).from(users);

        const [{ joinedToday }] = await this.db
            .select({ joinedToday: sql<string>`count(*)` })
            .from(users)
            .where(sql`${users.createdAt} >= ${isoToday}`);

        const [{ userIncreasePastMonth }] = await this.db
            .select({ userIncreasePastMonth: sql<string>`count(*)` })
            .from(users)
            .where(sql`${users.createdAt} >= ${isoLast30d}`);

        const [{ activeToday }] = await this.db
            .select({ activeToday: sql<string>`count(*)` })
            .from(users)
            .where(sql`${users.updatedAt} >= ${isoToday}`);

        const [{ withoutMeters }] = await this.db
            .select({ withoutMeters: sql<string>`count(*)` })
            .from(users)
            .leftJoin(meters, eq(users.id, meters.userId))
            .where(isNull(meters.id));

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
            userIncreasePastMonth: Number(userIncreasePastMonth),
            activeToday: Number(activeToday),
            usersWithoutMeters: Number(withoutMeters),
            totalKgBoughtToday: parseFloat(totalKgToday),
        };
    }

    async findAllAdmins(): Promise<User[]> {
        return await this.db
            .select()
            .from(users)
            .where(
                or(
                    eq(users.role, "admin" as any),
                    eq(users.role, "super-admin" as any)
                )
            );
    }
}
