import { SystemSettingsService } from "../services/system-settings.service";
import ResponseHelper from "../utils/helpers/response.helper";
import ControllerHelper from "../utils/helpers/controller.helper";
import SystemSettingsValidator from "../validators/system-settings.validator";
import AppError from "../utils/appError";
import logger from "../config/logger";

export default class SystemSettingsController {

  static getSettings = ControllerHelper.createHandler("system-settings.get", async (req, res, next) => {
    const settings = await SystemSettingsService.getSettings();
    ResponseHelper.sendSuccessResponse(res, {
      data: settings,
      message: "System settings retrieved successfully"
    });
  });

  static updateSettings = ControllerHelper.createHandler("system-settings.update", async (req, res, next) => {
    const parsed = SystemSettingsValidator.updateSettings(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      logger.debug(`${req.headers.reqName} request body validation failed [${req.headers.reqId}]`, {
        data: req.body,
        errors: parsed.error.flatten(),
      });
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const settings = await SystemSettingsService.updateSettings(parsed.data);
    ResponseHelper.sendSuccessResponse(res, {
      data: settings,
      message: "System settings updated successfully"
    });
  });
}
