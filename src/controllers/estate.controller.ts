import { Request, Response, NextFunction } from "express";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import EstateService from "../services/estate.service";
import AppError from "../utils/appError";

export default class EstateController {
  private static estateService = new EstateService();
  static createEstate = ControllerHelper.createHandler("create-estate", async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, address, city, state, country, zipCode, latitude, longitude } = req.body;
    const { id: userId } = (req as any).user;
    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }
    const data = await EstateController.estateService.createEstate({
      name,
      description,
      address,
      city,
      state,
      country,
      zipCode,
      latitude,
      longitude,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    ResponseHelper.sendSuccessResponse(res, {
      message: "Estate created successfully",
      data,
    });
  });

  static updateEstate = ControllerHelper.createHandler("update-estate", async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const body = req.body;

    const data = await EstateController.estateService.updateEstate(id, body);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Estate updated successfully",
      data,
    });
  });

  static getEstates = ControllerHelper.createHandler("get-estates", async (req: Request, res: Response, next: NextFunction) => {
    const data = await EstateController.estateService.getEstates();

    ResponseHelper.sendSuccessResponse(res, {
      message: "Estates retrieved successfully",
      data,
    });
  });
}
