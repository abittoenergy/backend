import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import GasPurchaseService from "../services/gas-purchase.service";
import AppError from "../utils/appError";
import GasPurchaseValidator from "../validators/gas-purchase.validator";

export default class GasPurchaseController {

  static initializePurchase = ControllerHelper.createHandler(
    "gas-purchase.initialize",
    async (req, res, next) => {
      const validation = GasPurchaseValidator.initializeGasPurchase(req.body);

      if (!validation.success) {
        const error = validation.error.errors[0]?.message || "Invalid input";
        return next(new AppError(error, ResponseHelper.BAD_REQUEST));
      }

      const { meterId, amount } = validation.data;
      const userId = (req as any).user.id;

      const result = await GasPurchaseService.initializeOnlinePurchase(userId, meterId, amount);

      ResponseHelper.sendSuccessResponse(res, {
        message: "Gas purchase initialized successfully",
        data: result,
      });
    }
  );

  static checkPaymentStatus = ControllerHelper.createHandler(
    "gas-purchase.check-payment-status",
    async (req, res, next) => {
      const { reference } = req.params;
      const userId = (req as any).user.id;

      if (!reference) {
        return next(new AppError("Payment reference is required", ResponseHelper.BAD_REQUEST));
      }

      const status = await GasPurchaseService.checkPaymentStatus(reference, userId);

      ResponseHelper.sendSuccessResponse(res, {
        message: "Payment status retrieved successfully",
        data: status,
      });
    }
  );

  static purchaseFromWallet = ControllerHelper.createHandler(
    "gas-purchase.purchase-from-wallet",
    async (req, res, next) => {
      const validation = GasPurchaseValidator.initializeGasPurchase(req.body);

      if (!validation.success) {
        const error = validation.error.errors[0]?.message || "Invalid input";
        return next(new AppError(error, ResponseHelper.BAD_REQUEST));
      }

      const { meterId, amount } = validation.data;
      const userId = (req as any).user.id;

      const result = await GasPurchaseService.purchaseGasFromWallet(userId, meterId, amount);

      ResponseHelper.sendSuccessResponse(res, {
        message: "Gas purchase from wallet successful",
        data: result,
      });
    }
  );
}
