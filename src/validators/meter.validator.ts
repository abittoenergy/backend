import { z } from "zod";

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

export default class MeterValidator {
  static validateRequestMeterLink(data: unknown) {
    return requestMeterLinkSchema.safeParse(data);
  }
}
