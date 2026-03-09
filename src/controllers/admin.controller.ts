import { Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service";
import IncidentReportService from "../services/incident-report.service";
import { IncidentReportStatus, IncidentType } from "../db/schema/incident-reports.schema";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";

export class AdminController {
  static getStats = ControllerHelper.createHandler("get-platform-stats", async (req: Request, res: Response, next: NextFunction) => {
    const stats = await AdminService.getPlatformStats();

    ResponseHelper.sendSuccessResponse(res, {
      message: "Platform statistics retrieved successfully",
      data: stats,
    });
  });

  static getRecentActivity = ControllerHelper.createHandler("get-recent-activity", async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt(req.query.limit as string || "10", 10);
    const activities = await AdminService.getRecentActivity(limit);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Recent activities retrieved successfully",
      data: activities,
    });
  });

  static getIncidentReports = ControllerHelper.createHandler("get-incident-reports", async (req: Request, res: Response, next: NextFunction) => {
    const query = {
      page: req.query.page as string,
      limit: req.query.limit as string,
      status: req.query.status as IncidentReportStatus,
      type: req.query.type as IncidentType,
      search: req.query.search as string,
    };
    const data = await IncidentReportService.getIncidentReports(query);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Incident reports retrieved successfully",
      data,
    });
  });

  static resolveIncidentReport = ControllerHelper.createHandler("resolve-incident-report", async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = (req as any).user.id;

    const report = await IncidentReportService.resolveIncident(id, adminId, notes);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Incident report resolved successfully",
      data: report,
    });
  });
}
