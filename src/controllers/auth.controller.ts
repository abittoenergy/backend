import logger from "../config/logger";
import AppError from "../utils/appError";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import AuthValidator from "../validators/auth.validator";
import AuthService from "../services/auth.service";


export default class AuthController {
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

            void await AuthService.signup(parsed.data);

            ResponseHelper.sendSuccessResponse(res, {
                message: "OTP sent to your email for verification",
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

            await AuthService.signin(parsed.data);

            ResponseHelper.sendSuccessResponse(res, {
                message: "OTP sent to your email for verification",
            });
        } catch (error) {
            logger.error(`${req.headers.reqName} request failed [${req.headers.reqId}]`, {
                error,
            });
            next(error);
        }
    });
}
