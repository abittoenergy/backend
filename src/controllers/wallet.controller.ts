import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import WalletService from "../services/wallet.service";
import AppError from "../utils/appError";

export default class WalletController {

  static getBalance = ControllerHelper.createHandler("wallet.get-balance", async (req, res) => {
    const { id: userId } = (req as any).user;
    const balanceData = await WalletService.getBalance(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Wallet balance retrieved successfully",
      data: balanceData,
    });
  });

  static initializeTopup = ControllerHelper.createHandler("wallet.topup.initialize", async (req, res) => {
    const { id: userId } = (req as any).user;
    const { amount } = req.body;

    if (!amount) {
      throw new AppError("Amount is required", ResponseHelper.BAD_REQUEST);
    }

    if (amount < 1000) {
      throw new AppError("Amount must be at least 1000", ResponseHelper.BAD_REQUEST);
    }

    const paystackData = await WalletService.initializeTopup(userId, amount);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Top-up initialized successfully",
      data: paystackData,
    });
  });

  static verifyTopup = ControllerHelper.createHandler("wallet.topup.verify", async (req, res) => {
    const { reference } = req.params;

    if (!reference) {
      throw new AppError("Reference is required", ResponseHelper.BAD_REQUEST);
    }

    const verification = await WalletService.verifyTopup(reference);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Top-up status verified",
      data: verification,
    });
  });

  static getTransactions = ControllerHelper.createHandler("wallet.get-transactions", async (req, res) => {
    const { id: userId } = (req as any).user;
    const transactions = await WalletService.getTransactions(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Transactions retrieved successfully",
      data: { transactions },
    });
  });
}
