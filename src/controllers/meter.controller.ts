import logger from "../config/logger";
import AppError from "../utils/appError";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import MeterService from "../services/meter.service";

export default class MeterController {
  static registerMeter = ControllerHelper.createHandler("register-meter", async (req, res, next) => {
    const { deviceId, userId } = req.body;

    if (!deviceId || !userId) {
      return next(new AppError("deviceId and userId are required", ResponseHelper.BAD_REQUEST));
    }

    const data = await MeterService.registerMeterToUser(deviceId, userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Meter registered successfully",
      data,
    });
  });

  static getMeterByDeviceId = ControllerHelper.createHandler("get-meter-by-device-id", async (req, res, next) => {
    const { deviceId } = req.params;

    const data = await MeterService.getMeterStatus(deviceId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Meter info retrieved successfully",
      data,
    });
  });

  static updateValve = ControllerHelper.createHandler("update-valve", async (req, res, next) => {
    const { deviceId } = req.params;
    const { status } = req.body;

    if (typeof status !== "boolean") {
      return next(new AppError("status must be a boolean", ResponseHelper.BAD_REQUEST));
    }

    const data = await MeterService.updateValveStatus(deviceId, status);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Valve status updated successfully",
      data,
    });
  });
}
