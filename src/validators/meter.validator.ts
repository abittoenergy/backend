import { z } from "zod";
import { LinkRequestStatus } from "../db/schema/meter-link-requests.schema";

export const requestMeterLinkSchema = z.object({
  estateId: z.string({ required_error: "Estate is required" }).uuid({
    message: "Invalid estate ID",
  }),
  estateName: z.string().optional(),
  houseNumber: z.string({ required_error: "House number is required" }),
}).superRefine((data, ctx) => {
  if (data.estateId === "OTHER" && !data.estateName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Estate name is required when 'Other' is selected",
      path: ["estateName"],
    });
  }
});

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

export default class MeterValidator {
  static validateRequestMeterLink(data: unknown) {
    return requestMeterLinkSchema.safeParse(data);
  }

  static validateProcessMeterLinkRequest(data: unknown) {
    return processMeterLinkRequestSchema.safeParse(data);
  }
}
