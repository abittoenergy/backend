import { Request, Response, NextFunction } from "express";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import AppError from "../utils/appError";
import TransactionService from "../services/transaction.service";
import TransactionValidator from "../validators/transaction.validator";

export default class TransactionController {

  static adminGetTransactions = ControllerHelper.createHandler("admin-get-transactions", async (req: Request, res: Response, next: NextFunction) => {
    const validation = TransactionValidator.validateAdminGetTransactionsQuery(req.query);

    if (!validation.success) {
      const message = validation.error.errors?.[0]?.message || "Validation failed";
      return next(new AppError(message, ResponseHelper.BAD_REQUEST));
    }

    const data = await TransactionService.adminGetTransactions(validation.data as any);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Transactions retrieved successfully",
      data,
    });
  });

  static adminGetTransactionById = ControllerHelper.createHandler("admin-get-transaction-by-id", async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Transaction ID is required", ResponseHelper.BAD_REQUEST));
    }

    const data = await TransactionService.getTransactionById(id);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Transaction retrieved successfully",
      data,
    });
  });
}
