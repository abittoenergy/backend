import { Request, Response, NextFunction } from "express";
import { AdminService } from "../services/admin.service";
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
}
