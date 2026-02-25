import { z } from "zod";

export default class UserValidator {
  static validateAdminGetUsersQuery(data: unknown) {
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      isActive: z.enum(["true", "false"]).optional(),
    });
    return schema.safeParse(data);
  }

  static validateAdminRegisterUser(data: unknown) {
    const schema = z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      gender: z.enum(["male", "female", "other"]),
      phoneNumber: z.string().min(1, "Phone number is required"),
      estateId: z.string({ required_error: "Estate is required" }),
      estateName: z.string().optional(),
      houseNumber: z.string().min(1, "House number is required"),
      nin: z.string().length(11, "NIN must be 11 characters"),
      user_email: z.string().email("Invalid user email address"),
      meterNumber: z.string().optional(),
    }).superRefine((data, ctx) => {
      if (data.estateId === "OTHER" && !data.estateName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estate name is required when 'Other' is selected",
          path: ["EstateName"],
        });
      }
    });
    return schema.safeParse(data);
  }
}
