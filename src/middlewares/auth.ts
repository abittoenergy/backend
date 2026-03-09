import { NextFunction, Response } from "express";
import logger from "../config/logger";
import { withContext } from "../utils/loggerWithContext";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import AuthHelper from "../utils/helpers/auth.helper";
import { requestContextManager } from "../config/async-context";
import { UserRepository } from "../repository/user";

class AuthMiddleware {
    static async protect(req: any, res: Response, next: NextFunction) {
        try {
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
                token = req.headers.authorization.split(" ")[1];
            }
            if (!token) {
                logger.warn(
                    "Unauthorized request without token",
                    withContext({
                        userAgent: req.headers["user-agent"],
                        path: req.path,
                        ip: req.ip,
                        action: "unauthorized_request_without_token",
                    })
                );
                return next(
                    new AppError("You are not logged in. Please provide a valid token.", ResponseHelper.UNAUTHORIZED)
                );
            }
            const decoded = await AuthHelper.verifyAndDecodeToken(token);
            req.userId = decoded.id;

            const context = requestContextManager.getContext();
            if (context) {
                context.userId = decoded.id;
            }

            const userRepository = new UserRepository();
            const user = await userRepository.findById(decoded.id);

            if (!user) {
                logger.warn(
                    "Authentication failed - user not found",
                    withContext({
                        userId: decoded.id,
                        ip: req.ip,
                        path: req.path,
                        action: "authentication_failed_user_not_found",
                    })
                );
                throw new AppError("User not found", ResponseHelper.UNAUTHORIZED);
            }

            logger.info(
                "User authenticated successfully",
                withContext({
                    userId: user.id,
                    email: user.email,
                    ip: req.ip,
                    userAgent: req.get("User-Agent"),
                    path: req.path,
                    action: "authentication_success",
                })
            );

            if (user?.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
                logger.warn(
                    "Authentication blocked - account locked",
                    withContext({
                        userId: user.id,
                        email: user.email,
                        ip: req.ip,
                        lockoutUntil: user.lockoutUntil,
                        action: "authentication_blocked_account_locked",
                    })
                );

                throw new AppError(
                    "Account locked due to too many failed attempts. Try again later.",
                    ResponseHelper.FORBIDDEN
                );
            }

            if (user?.isArchived) {
                logger.warn(
                    "Authentication blocked - account archived",
                    withContext({
                        userId: user.id,
                        email: user.email,
                        ip: req.ip,
                        action: "authentication_blocked_account_archived",
                    })
                );
                throw new AppError("Account archieved. Contact Support", ResponseHelper.FORBIDDEN);
            }

            if (!user?.isActive) {
                logger.warn(
                    "Authentication blocked - account suspended",
                    withContext({
                        userId: user.id,
                        email: user.email,
                        ip: req.ip,
                        action: "authentication_blocked_account_suspended",
                    })
                );
                throw new AppError("Account suspended. Contact Support", ResponseHelper.FORBIDDEN);
            }

            req.user = user;
            req.body.email = user.email;

            return next();
        } catch (error) {
            logger.error(
                "Authentication failed",
                withContext({
                    ip: req.ip,
                    path: req.path,
                    error: error instanceof Error ? error.message : "Unknown error",
                    stack: error instanceof Error ? error.stack : undefined,
                    action: "authentication_failed",
                })
            );
            next(error);
        }
    }

    static restrictTo(...roles: Array<"admin" | "super-admin" | "basic-user" | "merchant" | "installer">) {
        return (req: any, res: Response, next: NextFunction) => {
            if (!roles.includes(req.user.role)) {
                return next(new AppError("You do not have permission to perform this action", ResponseHelper.FORBIDDEN));
            }
            next();
        };
    }
}

export default AuthMiddleware;
