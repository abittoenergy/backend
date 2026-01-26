import logger from "../config/logger";
import OtpService from "../services/otp.service";
import { OtpGenerationResult, OtpValidationResult, OtpResendResult } from "../types/otp.types";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import AppError from "../utils/appError";
import OtpValidator from "../validators/otp.validator";
import { OtpType } from "../utils/constants/otp";

export default class OtpController {
  static otpService =  OtpService;

  static generateOtp = ControllerHelper.createHandler("otp.generate", async (req, res, next) => {
    const parsed = OtpValidator.generate(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      logger.debug(`${req.headers.reqName} request body validation failed [${req.headers.reqId}]`, {
        data: req.body,
        errors: parsed.error.flatten(),
      });
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const {  type, email, } = parsed.data;
    await this.otpService.sendOTP(email, type as OtpType);

    ResponseHelper.sendSuccessResponse(res, {
      message: "OTP sent successfully",
      data: {
        type,
      },
    });
  });

  static validateOtp = ControllerHelper.createHandler("otp.validate", async (req, res, next) => {
    const parsed = OtpValidator.validate(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors?.[0]?.message || "Validation failed";
      logger.debug(`${req.headers.reqName} request body validation failed [${req.headers.reqId}]`, {
        data: req.body,
        errors: parsed.error.flatten(),
      });
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const {  type, otp, email } = parsed.data;
    const response = await this.otpService.verifyOTP(email, type as OtpType, otp);

    ResponseHelper.sendSuccessResponse(res, {
      message: "OTP verified successfully",
      data: {
        type,
        validated: true,
        ...response,
      },
    });
  });
}
