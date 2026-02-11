import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import GasPurchaseService from "../services/gas-purchase.service";
import AppError from "../utils/appError";

export default class GasPurchaseController {

  static initializePurchase = ControllerHelper.createHandler(
    "gas-purchase.initialize",
    async (req, res, next) => {
      const { meterId, amount } = req.body;
      const userId = (req as any).user.id;

      if (!meterId || !amount) {
        return next(new AppError("Meter ID and amount are required", ResponseHelper.BAD_REQUEST));
      }

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
}
