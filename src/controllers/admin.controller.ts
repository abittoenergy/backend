import { Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service";
import LeakReportService from "../services/leak-report.service";
import { LeakReportStatus } from "../db/schema/leak-reports.schema";
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

  static getLeakReports = ControllerHelper.createHandler("get-leak-reports", async (req: Request, res: Response, next: NextFunction) => {
    const query = {
      page: req.query.page as string,
      limit: req.query.limit as string,
      status: req.query.status as LeakReportStatus,
      search: req.query.search as string,
    };
    const reports = await LeakReportService.getLeakReports(query);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Leak reports retrieved successfully",
      data: reports,
    });
  });

  static resolveLeakReport = ControllerHelper.createHandler("resolve-leak-report", async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = (req as any).user.id;

    const report = await LeakReportService.resolveLeak(id, adminId, notes);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Leak report resolved successfully",
      data: report,
    });
  });
}
