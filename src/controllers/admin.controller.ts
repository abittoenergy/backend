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
}
