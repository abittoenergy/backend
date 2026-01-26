import { z } from "zod";

export const deviceInfoSchema = z.object({
    name: z.string({ required_error: "Device name is required" }),
    os: z.string({ required_error: "Device OS is required" }),
    uniqueId: z.string({ required_error: "Device unique ID is required" })
});

export const passwordSchema = z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .refine((v) => /[A-Za-z]/.test(v), {
        message: "Password must contain at least one letter"
    })
    .refine((v) => /\d/.test(v), {
        message: "Password must contain at least one number"
    })
    .refine((v) => /[^A-Za-z0-9\s]/.test(v), {
        message: "Password must contain at least one special character"
    });

export const signupSchema = z.object({
    email: z.string({ required_error: "Email is required" }).email("Please provide a valid email address"),
    password: passwordSchema,
    referralCode: z
        .string()
        .regex(/^(JP-[A-Z0-9_]{10}|[A-Z0-9]+)$/, "Invalid referral code format")
        .optional(),
    deviceInfo: deviceInfoSchema.optional()
});

export type SignupInput = z.infer<typeof signupSchema>;

export const signinSchema = z.object({
    email: z.string({ required_error: "Email is required" }).email("Please provide a valid email address"),
    password: passwordSchema,
    deviceInfo: deviceInfoSchema.optional(),
});
export type SigninInput = z.infer<typeof signinSchema>;

export const verifyOTPSchema = z.object({
    email: z.string({ required_error: "Email is required" }).email("Please provide a valid email address"),
    otp: z.string({ required_error: "OTP is required" }),
    type: z.enum(["signup", "signin", "password_reset"]),
});
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;

export default class AuthValidator {
   
    static signup(data: unknown) {
        return signupSchema.safeParse(data);
    }

    static signin(data: unknown) {
        return signinSchema.safeParse(data);
    }
    static verifyOTP(data: unknown) {
        return verifyOTPSchema.safeParse(data);
    }

}
