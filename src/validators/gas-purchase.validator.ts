import { z } from "zod";

export const initializeGasPurchaseSchema = z.object({
  meterId: z.string().uuid("Invalid meter ID"),
  amount: z.number().positive("Amount must be greater than zero"),
});

export type InitializeGasPurchaseInput = z.infer<typeof initializeGasPurchaseSchema>;

export default class GasPurchaseValidator {
  static initializeGasPurchase(data: unknown) {
    return initializeGasPurchaseSchema.safeParse(data);
  }
}
