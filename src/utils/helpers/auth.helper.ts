import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import envConfig from "../../config/env";
import AppError from "../appError";
import { redis } from "../../config/redis";

interface DecodedToken {
    id: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
}

class AuthHelper {
    static initialize() {
        if (!envConfig.jwt.secret || envConfig.jwt.secret.trim() === "") {
            throw new Error("JWT_SECRET is not defined in environment configuration");
        }
        if (!envConfig.jwt.expiresIn || envConfig.jwt.expiresIn.trim() === "") {
            throw new Error("JWT_EXPIRES_IN is not defined in environment configuration");
        }
        if (!envConfig.jwt.issuer || envConfig.jwt.issuer.trim() === "") {
            throw new Error("JWT_ISSUER is not defined in environment configuration");
        }
        if (!envConfig.jwt.audience || envConfig.jwt.audience.trim() === "") {
            throw new Error("JWT_AUDIENCE is not defined in environment configuration");
        }
        if (!envConfig.bcryptSaltRounds || isNaN(Number(envConfig.bcryptSaltRounds))) {
            throw new Error("BCRYPT_SALT_ROUNDS is not defined or invalid in environment configuration");
        }
    }
    static async passwordToHash(text: string): Promise<string> {
        const saltRounds = Number(envConfig.bcryptSaltRounds) || 12;
        try {
            return await bcrypt.hash(text, saltRounds);
        } catch (error) {
            throw new AppError("Failed to hash password", 500);
        }
    }
    static createAuthToken(id: string): string {
        const payload = {
            id,
            iss: envConfig.jwt.issuer,
            aud: envConfig.jwt.audience,
        };
        return jwt.sign(payload, envConfig.jwt.secret, {
            expiresIn: envConfig.jwt.expiresIn,
            algorithm: "HS256",
        });
    }
    static async verifyBcryptPassword(password: string, hash: string): Promise<boolean> {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            throw new AppError("Failed to verify password", 500);
        }
    }
    static async verifyAndDecodeToken(token: string): Promise<DecodedToken> {
        try {
            // Check if the token is blacklisted
            const isBlacklisted = await redis.get(`blacklist:${token}`);
            if (isBlacklisted) {
                throw new AppError("Token has been revoked, please log in again", 401);
            }

            const decoded = jwt.verify(token, envConfig.jwt.secret, {
                issuer: envConfig.jwt.issuer,
                audience: envConfig.jwt.audience,
                algorithms: ["HS256"],
            }) as DecodedToken;

            if (!decoded.id) {
                throw new AppError("Invalid token payload: missing id", 401);
            }

            return decoded;
        } catch (error) {
            if (error instanceof Error && error.name === "TokenExpiredError") {
                throw new AppError("Token has expired, please log in again", 401);
            }
            if (error instanceof Error && error.name === "JsonWebTokenError") {
                throw new AppError("Invalid token, please log in again", 401);
            }
            throw error instanceof AppError ? error : new AppError("Token verification failed", 401);
        }
    }
}

AuthHelper.initialize();

export default AuthHelper;
