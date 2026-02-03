import { User } from "../repository/user";

export { };

declare module "express-serve-static-core" {
    interface Request {
        user?: Partial<User> & { username?: string };
        userId?: string;
        id?: string;
    }
}