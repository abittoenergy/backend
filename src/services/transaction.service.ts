import { TransactionRepository, AdminTransactionQueryOptions } from "../repository/transaction";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";

export default class TransactionService {
  private static transactionRepo = new TransactionRepository();

  static async adminGetTransactions(query: AdminTransactionQueryOptions) {
    const [stats, { results, total }] = await Promise.all([
      this.transactionRepo.getAdminStats(),
      this.transactionRepo.findAllAdmin(query),
    ]);

    return {
      stats,
      transactions: results.map(tx => ({
        ...tx,
        amount: tx.amount.toString(), // Convert bigint to string
      })),
      pagination: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  static async getTransactionById(id: string) {
    const result = await this.transactionRepo.findByIdWithUser(id);
    if (!result) {
      throw new AppError("Transaction not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    return {
      ...result.transaction,
      amount: result.transaction.amount.toString(),
      user: result.user,
    };
  }
}
