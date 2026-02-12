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

export const updateProfileOnboardingSchema = z.object({
    firstName: z.string({ required_error: "First name is required" }),
    lastName: z.string({ required_error: "Last name is required" }),
    phoneNumber: z.string({ required_error: "Phone number is required" }),
    gender: z.enum(["male", "female", "other"], { required_error: "Gender is required" }),
    nin: z.string({ required_error: "NIN is required" }).length(11, { message: "NIN must be 11 characters long" }).regex(/^[0-9]+$/, { message: "NIN must be a number" }),
    estateId: z.string({ required_error: "Estate is required" }),
    estateName: z.string().optional(),
    houseNumber: z.string({ required_error: "House number is required" }),

}).superRefine((data, ctx) => {
    if (data.estateId === "OTHER" && !data.estateName) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Estate name is required when 'Other' is selected",
            path: ["EstateName"],
        });
    }
});
export type UpdateProfileOnboardingInput = z.infer<typeof updateProfileOnboardingSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string({ required_error: "Current password is required" }),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: "Confirm password is required" }),
}).superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "New passwords do not match",
            path: ["confirmPassword"],
        });
    }
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

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

    static updateProfileOnboarding(data: unknown) {
        return updateProfileOnboardingSchema.safeParse(data);
    }

    static changePassword(data: unknown) {
        return changePasswordSchema.safeParse(data);
    }

}
