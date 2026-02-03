import { eq } from "drizzle-orm";
import  { getDb } from "../config/db";
import { users, User, NewUser } from "../db/schema/users.schema";

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

    async update(id: string, data: Partial<NewUser>): Promise<Pick<User, "id" | "email" | "firstName" | "lastName" | "phoneNumber" | "gender" | "nin" | "estateId" | "houseNumber" | "onboardingEstateName" | "updatedAt"> | undefined> {
        const [result] = await this.db.update(users).set(data).where(eq(users.id, id)).returning({id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName, phoneNumber: users.phoneNumber, gender: users.gender, nin: users.nin, estateId: users.estateId, houseNumber: users.houseNumber, onboardingEstateName: users.onboardingEstateName, updatedAt: users.updatedAt});
        return result;
    }
};

