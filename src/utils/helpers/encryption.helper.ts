import * as crypto from "crypto";
import envConfig from "../../config/env";
import AppError from "../appError";
import ResponseHelper from "./response.helper";

const algorithm = "aes-256-cbc";
const key = Buffer.from(envConfig.encryption.key, "hex"); // Expect a 32-byte hex key in envConfig

if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes long");
}

export const encrypt = (text: string): { encryptedData: string; iv: string } => {
    try {
        const iv = crypto.randomBytes(16); // 16 bytes IV for AES
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, "utf8", "base64");
        encrypted += cipher.final("base64");
        return { encryptedData: encrypted, iv: iv.toString("base64") };
    } catch (error: any) {
        throw new AppError(`Encryption failed: ${error.message}`, ResponseHelper.INTERNAL_SERVER_ERROR);
    }
};

export const decrypt = (encryptedData: string, iv: string): string => {
    try {
        const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, "base64"));
        let decrypted = decipher.update(encryptedData, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error: any) {
        throw new AppError(`Decryption failed: ${error.message}`, ResponseHelper.INTERNAL_SERVER_ERROR);
    }
};
