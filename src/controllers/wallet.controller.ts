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

  static getTransactions = ControllerHelper.createHandler("wallet.get-transactions", async (req, res) => {
    const { id: userId } = (req as any).user;
    const transactions = await WalletService.getTransactions(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Transactions retrieved successfully",
      data: { transactions },
    });
  });
}
