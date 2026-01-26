import { eq } from "drizzle-orm";
import db from "../config/db";
import { users, User, NewUser } from "../db/schema/users.schema";

export const UserRepo = {
    async findById(id: string): Promise<User | undefined> {
        const [result] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result;
    },

    async findByEmail(email: string): Promise<User | undefined> {
        const [result] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return result;
    },

    async create(data: NewUser): Promise<User> {
        const [result] = await db.insert(users).values(data).returning();
        return result;
    },

    async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
        const [result] = await db.update(users).set(data).where(eq(users.id, id)).returning();
        return result;
    },
};

