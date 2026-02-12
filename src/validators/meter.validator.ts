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
}
