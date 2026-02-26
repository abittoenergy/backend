import { z } from "zod";
import { LinkRequestStatus } from "../db/schema/meter-link-requests.schema";

export const baseMeterLinkSchema = z.object({
  estateId: z.union([
    z.string().uuid({ message: "Invalid estate ID" }),
    z.literal("OTHER")
  ], { required_error: "Estate is required" }),
  estateName: z.string().optional(),
  houseNumber: z.string({ required_error: "House number is required" }),
});

const meterLinkRefinement = (data: { estateId: string, estateName?: string }, ctx: z.RefinementCtx) => {
  if (data.estateId === "OTHER" && !data.estateName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Estate name is required when 'Other' is selected",
      path: ["estateName"],
    });
  }
};

export const requestMeterLinkSchema = baseMeterLinkSchema.superRefine(meterLinkRefinement);

export type RequestMeterLinkInput = z.infer<typeof requestMeterLinkSchema>;

export const processMeterLinkRequestSchema = z.object({
  status: z.nativeEnum(LinkRequestStatus).refine((val) => val !== LinkRequestStatus.PENDING, {
    message: "Status must be either 'approved' or 'rejected'",
  }),
  reason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status === LinkRequestStatus.REJECTED && !data.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reason is required when a request is rejected",
      path: ["reason"],
    });
  }
});

export type ProcessMeterLinkRequestInput = z.infer<typeof processMeterLinkRequestSchema>;

export const adminLinkMeterSchema = baseMeterLinkSchema.extend({
  userId: z.string({ required_error: "User ID is required" }).uuid({
    message: "Invalid user ID",
  }),
}).superRefine(meterLinkRefinement);

export type AdminLinkMeterInput = z.infer<typeof adminLinkMeterSchema>;

export default class MeterValidator {
  static validateRequestMeterLink(data: unknown) {
    return requestMeterLinkSchema.safeParse(data);
  }

  static validateAdminLinkMeter(data: unknown) {
    return adminLinkMeterSchema.safeParse(data);
  }

  static validateProcessMeterLinkRequest(data: unknown) {
    return processMeterLinkRequestSchema.safeParse(data);
  }

  static validateAdminGetLinkRequestsQuery(data: unknown) {
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      status: z.nativeEnum(LinkRequestStatus).optional(),
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });
    return schema.safeParse(data);
  }

  static validateAdminGetMetersQuery(data: unknown) {
    const schema = z.object({
      page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
      search: z.string().optional(),
      isLinked: z.string().optional().transform(val => val === "true" ? true : val === "false" ? false : undefined),
    });
    return schema.safeParse(data);
  }

  static validateGiftGas(data: unknown) {
    return giftGasSchema.safeParse(data);
  }
}

export const giftGasSchema = z.object({
  sourceMeterId: z.string({ required_error: "Source meter ID is required" }).uuid({ message: "Invalid source meter ID" }),
  recipientMeterNumber: z.string({ required_error: "Recipient meter number is required" }),
  amountKg: z.number({ required_error: "Amount in kg is required" }).positive({ message: "Amount must be greater than 0" }),
  otp: z.string({ required_error: "OTP is required" }).length(6, { message: "OTP must be 6 digits" }),
});

export type GiftGasInput = z.infer<typeof giftGasSchema>;
