import { z } from "zod";
import { Role } from "../db/schema/users.schema";
import { passwordSchema } from "./auth.validator";
import { IncidentReportStatus, IncidentType } from "../db/schema/incident-reports.schema";
import { InvitationStatus } from "../db/schema/admin/invitations.schema";

export const sendInvitationSchema = z.object({
  adminEmail: z.string({ required_error: "Email is required" }).email("Please provide a valid email address"),
  roleId: z.string({ required_error: "Role ID is required" }).uuid("Invalid Role ID format"),
  groupId: z.string({ required_error: "Group ID is required" }).uuid("Invalid Group ID format"),
});

export const changeAdminRoleSchema = z.object({
  adminRoleId: z.string({ required_error: "Admin Role ID is required" }).uuid("Invalid Role ID format")
});

export const verifyInvitationSchema = z.object({
  token: z.string({ required_error: "Invitation token is required" }),
});

export const completeSetupSchema = z.object({
  token: z.string({ required_error: "Token is required" }),
  password: passwordSchema,
  firstName: z.string({ required_error: "First name is required" }),
  lastName: z.string({ required_error: "Last name is required" }),
});

export const createGroupSchema = z.object({
  name: z.string({ required_error: "Name is required" }).min(2, "Name must be at least 2 characters long"),
  description: z.string().optional(),
});

export const cancelInvitationSchema = z.object({
  id: z.string({ required_error: "Invitation ID is required" }).uuid("Invalid Invitation ID format"),
});

export const invitationQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
  status: z.nativeEnum(InvitationStatus).optional(),
  search: z.string().optional(),
});

export const incidentReportQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
  status: z.nativeEnum(IncidentReportStatus).optional(),
  type: z.nativeEnum(IncidentType).optional(),
  search: z.string().optional(),
});

export const resolveIncidentSchema = z.object({
  notes: z.string({ required_error: "Resolution notes are required" }).min(5, "Notes must be at least 5 characters long"),
});

export const platformStatsQuerySchema = z.object({
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
});

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type ChangeAdminRoleInput = z.infer<typeof changeAdminRoleSchema>;
export type VerifyInvitationInput = z.infer<typeof verifyInvitationSchema>;
export type CompleteSetupInput = z.infer<typeof completeSetupSchema>;
export type AcceptInvitationInput = z.infer<typeof completeSetupSchema>;

export default class AdminValidator {
  static sendInvitation(data: unknown) {
    return sendInvitationSchema.safeParse(data);
  }

  static changeAdminRole(data: unknown) {
    return changeAdminRoleSchema.safeParse(data);
  }

  static verifyInvitation(data: unknown) {
    return verifyInvitationSchema.safeParse(data);
  }

  static completeSetup(data: unknown) {
    return completeSetupSchema.safeParse(data);
  }

  static acceptInvitation(data: unknown) {
    return completeSetupSchema.safeParse(data);
  }

  static incidentReportQuery(data: unknown) {
    return incidentReportQuerySchema.safeParse(data);
  }

  static resolveIncident(data: unknown) {
    return resolveIncidentSchema.safeParse(data);
  }

  static platformStatsQuery(data: unknown) {
    return platformStatsQuerySchema.safeParse(data);
  }

  static createGroup(data: unknown) {
    return createGroupSchema.safeParse(data);
  }

  static cancelInvitation(data: unknown) {
    return cancelInvitationSchema.safeParse(data);
  }

  static invitationQuery(data: unknown) {
    return invitationQuerySchema.safeParse(data);
  }
}
