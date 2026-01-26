import { z } from "zod";
import type { OtpType } from "../utils/constants/otp"
import { OTP_TYPES } from "../utils/constants/otp";

const emailSchema = z.string({ required_error: "Email is required" }).email("Please provide a valid email address");

const otpTypeSchema = z.enum(Object.values(OTP_TYPES) as [OtpType, ...OtpType[]]);

const otpCodeSchema = z
  .string({ required_error: "OTP is required" })
  .regex(/^\d{6}$/, "OTP must be a 6-digit numeric code");


export const generateOtpSchema = z.object({

  type: otpTypeSchema,
  email: emailSchema,
});
export type GenerateOtpInput = z.infer<typeof generateOtpSchema>;

export const validateOtpSchema = z.object({
  type: otpTypeSchema,
  otp: otpCodeSchema,
  email: emailSchema,
});
export type ValidateOtpInput = z.infer<typeof validateOtpSchema>;

export const resendOtpSchema = z.object({
  type: otpTypeSchema,
  email: emailSchema,
});
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export default class OtpValidator {
  static generate(data: unknown) {
    return generateOtpSchema.safeParse(data);
  }

  static validate(data: unknown) {
    return validateOtpSchema.safeParse(data);
  }

  static resend(data: unknown) {
    return resendOtpSchema.safeParse(data);
  }
}
