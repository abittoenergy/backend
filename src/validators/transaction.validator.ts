import { z } from "zod";

export default class TransactionValidator {
  static validateAdminGetTransactionsQuery(data: unknown) {
    const schema = z.object({
      page: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
      limit: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
      search: z.string().optional(),
      status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
      type: z.enum(["WALLET_TOPUP", "GAS_PURCHASE_WALLET", "GAS_PURCHASE_ONLINE"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      minAmount: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
      maxAmount: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
    });
    return schema.safeParse(data);
  }

  static validateGetUserTransactionsQuery(data: unknown) {
    const schema = z.object({
      page: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
      limit: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined),
      status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
      type: z.enum(["WALLET_TOPUP", "GAS_PURCHASE_WALLET", "GAS_PURCHASE_ONLINE"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });
    return schema.safeParse(data);
  }
}
