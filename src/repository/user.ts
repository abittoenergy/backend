import db from "../config/db";

export interface User {
    id: string;
    email: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    created_at: Date;
}

export const UserRepo = {
    async findById(id: string): Promise<User | undefined> {
        return db<User>("users").where({ id }).first();
    },

    async findByEmail(email: string): Promise<User | undefined> {
        return db<User>("users").where({ email }).first();
    },

    async create(data: Omit<User, "id" | "created_at">): Promise<User> {
        const [user] = await db<User>("users").insert(data).returning("*"); 
        return user;
    },
};
