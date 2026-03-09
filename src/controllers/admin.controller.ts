import { Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service";
import IncidentReportService from "../services/incident-report.service";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import AppError from "../utils/appError";
import AdminValidator from "../validators/admin.validator";

export class AdminController {
  static getStats = ControllerHelper.createHandler("get-platform-stats", async (req: Request, res: Response, next: NextFunction) => {
    const stats = await AdminService.getPlatformStats();

    ResponseHelper.sendSuccessResponse(res, {
      message: "Platform statistics retrieved successfully",
      data: stats,
    });
  });

  static getRecentActivity = ControllerHelper.createHandler("get-recent-activity", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.platformStatsQuery(req.query);
    const limit = parsed.success ? parsed.data.limit : 10;
    const activities = await AdminService.getRecentActivity(limit);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Recent activities retrieved successfully",
      data: activities,
    });
  });

  static getIncidentReports = ControllerHelper.createHandler("get-incident-reports", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.incidentReportQuery(req.query);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const data = await IncidentReportService.getIncidentReports(parsed.data as any);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Incident reports retrieved successfully",
      data,
    });
  });

  static resolveIncidentReport = ControllerHelper.createHandler("resolve-incident-report", async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const parsed = AdminValidator.resolveIncident(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const { notes } = parsed.data;
    const adminId = (req as any).user.id;

    const report = await IncidentReportService.resolveIncident(id, adminId, notes);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Incident report resolved successfully",
      data: report,
    });
  });

  static getAdminRoles = ControllerHelper.createHandler("get-admin-roles", async (req: Request, res: Response) => {
    const roles = await AdminService.getAdminRoles();

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admin roles retrieved successfully",
      data: roles,
    });
  });

  static getAllAdmins = ControllerHelper.createHandler("get-all-admins", async (req: Request, res: Response) => {
    const currentUserId = (req as any).user.id;
    const admins = await AdminService.getAllAdmins(currentUserId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admins retrieved successfully",
      data: admins,
    });
  });

  static changeAdminRole = ControllerHelper.createHandler("change-admin-role", async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const parsed = AdminValidator.changeAdminRole(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const { adminRoleId } = parsed.data;

    const result = await AdminService.updateAdminRole(id, adminRoleId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admin role updated successfully",
      data: result,
    });
  });

  static deleteAdmin = ControllerHelper.createHandler("delete-admin", async (req: Request, res: Response) => {
    const { id } = req.params;

    await AdminService.deleteAdmin(id);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admin deleted successfully",
    });
  });

  static sendInvitation = ControllerHelper.createHandler("send-admin-invitation", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.sendInvitation(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const { adminEmail, roleId, groupId } = parsed.data;
    const adminId = (req as any).user.id;

    const result = await AdminService.sendAdminInvitation(adminEmail, roleId, adminId, groupId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Invitation sent successfully",
      data: result,
    });
  });

  static verifyInvitation = ControllerHelper.createHandler("verify-admin-invitation", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.verifyInvitation(req.query);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Invalid invitation link";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const { token } = parsed.data;

    const { redirect } = await AdminService.verifyAdminInvitation(token);
    res.redirect(redirect);
  });

  static completeAdminSetup = ControllerHelper.createHandler("complete-admin-setup", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.completeSetup(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const { token, ...userData } = parsed.data;

    const result = await AdminService.completeAdminSetup(token, userData);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Account setup successfully",
      data: result,
    });
  });

  static getAdminGroups = ControllerHelper.createHandler("get-admin-groups", async (req: Request, res: Response) => {
    const groups = await AdminService.getAdminGroups();

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admin groups retrieved successfully",
      data: groups,
    });
  });

  static createAdminGroup = ControllerHelper.createHandler("create-admin-group", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.createGroup(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const result = await AdminService.createAdminGroup(parsed.data);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admin group created successfully",
      data: result,
    });
  });

  static cancelInvitation = ControllerHelper.createHandler("cancel-admin-invitation", async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    // Validate ID is a UUID
    const parsed = AdminValidator.cancelInvitation({ id });
    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Invalid invitation ID";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    await AdminService.cancelAdminInvitation(id);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Invitation cancelled successfully",
    });
  });

  static getInvitations = ControllerHelper.createHandler("get-admin-invitations", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.invitationQuery(req.query);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const result = await AdminService.getAllInvitations(parsed.data);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admin invitations retrieved successfully",
      data: result,
    });
  });

  static acceptInvitation = ControllerHelper.createHandler("accept-admin-invitation", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = AdminValidator.acceptInvitation(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const { token, ...userData } = parsed.data;

    const result = await AdminService.acceptAdminInvitation(token, userData);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Invitation accepted successfully",
      data: result,
    });
  });
}
