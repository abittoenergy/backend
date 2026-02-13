import { z } from "zod";

export default class EstateValidator {
  static validateAdminGetEstatesQuery(data: unknown) {
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
    });
    return schema.safeParse(data);
  }
}
