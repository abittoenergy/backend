import { Request, Response, NextFunction } from "express";
import { DedicatedVirtualAccountService } from "../services/dedicated-virtual-account.service";
import ResponseHelper from "../utils/helpers/response.helper";
import ControllerHelper from "../utils/helpers/controller.helper";
import AppError from "../utils/appError";
import logger from "../config/logger";

export default class DVAController {

  static getDVA = ControllerHelper.createHandler("dva.get", async (req: any, res, next) => {
    const { id: userId } = req.user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }

    const dva = await DedicatedVirtualAccountService.getUserDVA(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Dedicated virtual account retrieved successfully",
      data: {
        account: dva,
      },
    });
  });

  static requeryDVA = ControllerHelper.createHandler("dva.requery", async (req: any, res, next) => {
    const { id: userId } = req.user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }

    const result = await DedicatedVirtualAccountService.requeryUserDVA(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Dedicated virtual account requeried successfully",
      data: result,
    });
  });
}
