import logger from "../config/logger";

import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import AppError from "../utils/appError";
import AuthValidator from "../validators/auth.validator";
import UserService from "../services/user.service";
import UserValidator from "../validators/user.validator";
import MeterService from "../services/meter.service";

export default class UserController {

  static updateProfileOnboarding = ControllerHelper.createHandler("user.update-profile-onboarding", async (req, res, next) => {
    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }
    const parsed = AuthValidator.updateProfileOnboarding(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      logger.debug(`${req.headers.reqName} request body validation failed [${req.headers.reqId}]`, {
        data: req.body,
        errors: parsed.error.flatten(),
      });
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const result = await UserService.updateProfileOnboarding(userId, parsed.data);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Profile updated successfully",
      data: {
        user: result
      },
    });
  });

  static getProfile = ControllerHelper.createHandler("user.get-profile", async (req, res, next) => {
    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }

    const user = await UserService.getProfile(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Profile retrieved successfully",
      data: {
        user,
      },
    });
  });

  static adminGetUsers = ControllerHelper.createHandler("user.admin-get-users", async (req, res, next) => {
    const { id: userId } = (req as any).user;
    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }

    const validation = UserValidator.validateAdminGetUsersQuery(req.query);
    if (!validation.success) {
      const message = validation.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const result = await UserService.adminGetUsers(validation.data as any);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Users retrieved successfully",
      data: result,
    });
  });

  static adminGetUserMeters = ControllerHelper.createHandler("user.admin-get-user-meters", async (req, res, next) => {
    const { userId } = req.params;
    if (!userId) {
      return next(new AppError("User ID is required", ResponseHelper.BAD_REQUEST));
    }

    const result = await MeterService.getUserMeters(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "User meters retrieved successfully",
      data: result,
    });
  });

  static getActivities = ControllerHelper.createHandler("user.get-activities", async (req, res, next) => {
    const { id: userId } = (req as any).user;

    if (!userId) {
      return next(new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND));
    }

    const activities = await UserService.getUserActivities(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Activities retrieved successfully",
      data: activities,
    });
  });
}
