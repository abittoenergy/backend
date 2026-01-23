import logger from "../config/logger";
import AppError from "../utils/appError";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import MeterService from "../services/meter.service";

export default class MeterController {
  static registerMeter = ControllerHelper.createHandler("register-meter", async (req, res, next) => {
    const { deviceId } = req.body;

    if (!deviceId) {
      return next(new AppError("deviceId is required", ResponseHelper.BAD_REQUEST));
    }

    const data = await MeterService.registerMeter(deviceId);

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

}
