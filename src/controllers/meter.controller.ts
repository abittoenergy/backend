import logger from "../config/logger";
import AppError from "../utils/appError";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import MeterService from "../services/meter.service";
import MeterValidator from "../validators/meter.validator";

export default class MeterController {

  static requestMeterLink = ControllerHelper.createHandler("request-meter-link", async (req, res, next) => {
    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.FORBIDDEN));
    }

    const { meterNumber } = req.params;
    if (!meterNumber) {
      return next(new AppError("meterNumber is required", ResponseHelper.BAD_REQUEST));
    }

    const validation = MeterValidator.validateRequestMeterLink(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, ResponseHelper.BAD_REQUEST));
    }

    const data = await MeterService.requestMeterLink(userId, meterNumber, validation.data);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Meter link request sent successfully",
      data,
    });
  });

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

  static listMeterLinkRequests = ControllerHelper.createHandler("list-meter-link-requests", async (req, res, next) => {
    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.FORBIDDEN));
    }

    const validation = MeterValidator.validateAdminGetLinkRequestsQuery(req.query);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, ResponseHelper.BAD_REQUEST));
    }

    const data = await MeterService.getMeterLinkRequests(validation.data as any);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Meter link requests retrieved successfully",
      data,
    });
  });

  static processMeterLinkRequest = ControllerHelper.createHandler("process-meter-link-request", async (req, res, next) => {
    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.FORBIDDEN));
    }

    const validation = MeterValidator.validateProcessMeterLinkRequest(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, ResponseHelper.BAD_REQUEST));
    }

    const { status, reason } = validation.data;
    const { id: adminId } = (req as any).user;

    const { id } = req.params;
    const data = await MeterService.processMeterLinkRequest(id, adminId, status, reason);

    ResponseHelper.sendSuccessResponse(res, {
      message: `Meter link request ${status} successfully`,
      data,
    });
  });

  static checkMeterRegistration = ControllerHelper.createHandler("check-meter-registration", async (req, res, next) => {

    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }

    const { meterNumber } = req.params;

    if (!meterNumber) {
      return next(new AppError("meterNumber is required", ResponseHelper.BAD_REQUEST));
    }

    const data = await MeterService.checkMeterRegistration(meterNumber);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Meter registration verified",
      data,
    });
  });

  static getUsersMeters = ControllerHelper.createHandler("get-users-meters", async (req, res, next) => {
    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.FORBIDDEN));
    }

    const data = await MeterService.getUserMeters(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "User meters retrieved successfully",
      data,
    });
  });

  static adminGetMeters = ControllerHelper.createHandler("admin-get-meters", async (req, res, next) => {
    const data = await MeterService.adminGetMeters(req.query as any);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Admin meters list retrieved successfully",
      data,
    });
  });

  static adminUnlinkMeter = ControllerHelper.createHandler("admin-unlink-meter", async (req, res, next) => {
    const { deviceId } = req.params;

    if (!deviceId) {
      return next(new AppError("deviceId is required", ResponseHelper.BAD_REQUEST));
    }

    const data = await MeterService.adminUnlinkMeter(deviceId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Meter unlinked successfully",
      data,
    });
  });

}
