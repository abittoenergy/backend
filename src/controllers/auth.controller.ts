import logger from "../config/logger";
import AppError from "../utils/appError";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import AuthValidator from "../validators/auth.validator";
import AuthService from "../services/auth.service";


export default class AuthController {

    private static authService = new AuthService();

    static signup = ControllerHelper.createHandler("signup", async (req, res, next) => {
        try {
            const parsed = AuthValidator.signup(req.body);
            if (!parsed.success) {
                const message = parsed.error.errors?.[0]?.message || "Validation failed";
                logger.debug(`${req.headers.reqName} request body validation failed [${req.headers.reqId}]`, {
                    data: req.body,
                    errors: parsed.error.flatten()
                });
                return next(new AppError(message, ResponseHelper.BAD_REQUEST));
            }

            const otp = await AuthController.authService.signup(parsed.data);

            ResponseHelper.sendSuccessResponse(res, {
                message: "OTP sent to your email for verification",
                data: {
                    otp: process.env.NODE_ENV !== "production" ? otp : undefined,
                }
            });
        } catch (error) {
            logger.error(`${req.headers.reqName} request failed [${req.headers.reqId}]`, {
                error,
            });
            next(error);
        }
    });

    static signin = ControllerHelper.createHandler("signin", async (req, res, next) => {
        try {
            const parsed = AuthValidator.signin(req.body);
            if (!parsed.success) {
                const message = parsed.error.errors?.[0]?.message || "Validation failed";
                logger.debug(`${req.headers.reqName} request body validation failed [${req.headers.reqId}]`, {
                    data: req.body,
                    errors: parsed.error.flatten()
                });
                return next(new AppError(message, ResponseHelper.BAD_REQUEST));
            }

            const otp = await AuthController.authService.signin(parsed.data);

            ResponseHelper.sendSuccessResponse(res, {
                message: "OTP sent to your email for verification",
                data: {
                    otp: process.env.NODE_ENV !== "production" ? otp : undefined,
                }
            });
        } catch (error) {
            logger.error(`${req.headers.reqName} request failed [${req.headers.reqId}]`, {
                error,
            });
            next(error);
        }
    });

    static changePassword = ControllerHelper.createHandler("change-password", async (req, res, next) => {
        try {
            const userId = (req as any).user.id;
            const parsed = AuthValidator.changePassword(req.body);

            if (!parsed.success) {
                const message = parsed.error.errors?.[0]?.message || "Validation failed";
                return next(new AppError(message, ResponseHelper.BAD_REQUEST));
            }

            await AuthController.authService.changePassword(userId, parsed.data);

            ResponseHelper.sendSuccessResponse(res, {
                message: "Password changed successfully",
            });
        } catch (error) {
            logger.error(`${req.headers.reqName} request failed [${req.headers.reqId}]`, {
                error,
            });
            next(error);
        }
    });
}
