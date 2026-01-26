import otpGenerator from "otp-generator";
import { redis } from "../config/redis";
import EmailService from "./email.service";
import logger from "../config/logger";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import { OTP_TYPES, OtpType } from "../utils/constants/otp";
import { UserRepo } from "../repository/user";
import AuthHelper from "../utils/helpers/auth.helper";



export default class OTPService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_TTL = 600; // 10 minutes

  /**
   * Generates a 6-digit OTP, stores it in Redis, and sends it via email.
   */
  static async sendOTP(email: string, type: OtpType): Promise<void> {
    const otp = otpGenerator.generate(this.OTP_LENGTH, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    const key = this.getRedisKey(email, type);
    await redis.set(key, otp, this.OTP_TTL);

    logger.info(`Generated OTP for ${email} (${type}): ${otp}`);

    await EmailService.sendEmail({
      to: email,
      subject: "Your OTP Code",
      template: "otp",
      context: {
        otp,
        expiryMinutes: this.OTP_TTL / 60,
      },
    });
  }

  /**
   * Verifies the OTP provided by the user.
   */
  static async verifyOTP(email: string, type: OtpType, providedOtp: string): Promise<any> {
    const key = this.getRedisKey(email, type);
    const storedOtp = await redis.get(key);

    if (!storedOtp) {
      throw new AppError("OTP expired or not found", ResponseHelper.BAD_REQUEST);
    }

    if (storedOtp !== providedOtp) {
      throw new AppError("Invalid OTP provided", ResponseHelper.BAD_REQUEST);
    }

    logger.info(`Verifying OTP for ${email} (${type})`);


    if (type === OTP_TYPES.SIGNUP_VERIFICATION) {
      const user = await UserRepo.findByEmail(email);
      if (!user) {
        throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      if(user.emailVerified){
        throw new AppError("User already verified", ResponseHelper.BAD_REQUEST);
      }

      await UserRepo.update(user.id, {
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      await EmailService.sendEmail({
        to: email,
        subject: "Welcome to Abittoenergy!",
        template: "welcome",
        context: {
          email,
        },
      });
      const token = AuthHelper.createAuthToken(user.id);
      await redis.del(key);

      return {
        token,
      };
    }

    if (type === OTP_TYPES.LOGIN_DEVICE_VERIFICATION) {
      const user = await UserRepo.findByEmail(email);
      if (!user) {
        throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }
      const token = AuthHelper.createAuthToken(user.id);
      await redis.del(key);

      return {
        token,
      };
    }

    await redis.del(key);

  }

  private static getRedisKey(email: string, type: OtpType): string {
    return `otp:${type}:${email}`;
  }
}
