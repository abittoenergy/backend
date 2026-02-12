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
}
