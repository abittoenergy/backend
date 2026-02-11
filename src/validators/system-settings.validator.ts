import { z } from "zod";
import { NotifyAdminType } from "../db/schema/system-settings.schema";

export const updateSystemSettingsSchema = z.object({
  // General Settings
  timezone: z.string().optional(),
  currency: z.string().length(3, "Currency code must be 3 characters").optional(),

  // Payment Settings
  minWalletTopup: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),
  gasPricePerKg: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format").optional(),

  // Meter Settings
  meterResyncIntervalMinutes: z.number().int().positive("Resync interval must be a positive integer").optional(),
  autoUnlinkInactiveMeterDays: z.number().int().positive("Auto unlink days must be a positive integer").optional(),

  // Notification Settings
  enableAdminAlerts: z.boolean().optional(),
  notifyAdminType: z.nativeEnum(NotifyAdminType).optional(),
  specificAdminIds: z.array(z.string().uuid("Invalid admin ID format")).optional(),
}).superRefine((data, ctx) => {
  if (data.notifyAdminType === NotifyAdminType.SPECIFIC && (!data.specificAdminIds || data.specificAdminIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one admin ID is required when notify type is SPECIFIC",
      path: ["specificAdminIds"],
    });
  }
});

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;

export default class SystemSettingsValidator {
  static updateSettings(data: unknown) {
    return updateSystemSettingsSchema.safeParse(data);
  }
}
