import { NextFunction, Response } from "express";

class AuthMiddleware {
    static async protect(req: any, res: Response, next: NextFunction) {
        try {
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
                token = req.headers.authorization.split(" ")[1];
            }
        } catch (error) {
            next(error);
        }
    }

    static restrictTo(...roles: Array<"admin" | "super-admin" | "basic-user" | "merchant">) {
        return (req: any, res: Response, next: NextFunction) => {
            next();
        };
    }
}

export default AuthMiddleware;
