import { User } from "../repository/user";

declare module "express-serve-static-core" {
    interface Request {
        user?: User & {
            username?: string;
        };
        userId?: string;
    }
}
