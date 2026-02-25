import { TransactionRepository, AdminTransactionQueryOptions } from "../repository/transaction";
import { GasPurchaseRepository } from "../repository/gas-purchase.repo";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";

export default class TransactionService {
  private static transactionRepo = new TransactionRepository();
  private static gasPurchaseRepo = new GasPurchaseRepository();

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

  static async getUserTransactions(userId: string, query: AdminTransactionQueryOptions) {
    const { results, total } = await this.transactionRepo.findAllByUser(userId, query);

    return {
      transactions: results.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
      })),
      pagination: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  static async getMeterTransactions(userId: string, meterId: string, query: AdminTransactionQueryOptions) {
    const { results, total } = await this.transactionRepo.getMeterTransactions(userId, meterId, query);

    return {
      transactions: results.map((tx: any) => ({
        ...tx,
        amount: tx.amount.toString(),
      })),
      pagination: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  static async getUserStats(userId: string) {
    const [transactionStats, gasStats] = await Promise.all([
      this.transactionRepo.getUserStats(userId),
      this.gasPurchaseRepo.getUserGasStats(userId),
    ]);

    return {
      totalSpentAllTime: transactionStats.totalSpentAllTime.toString(),
      totalSpentLast30d: transactionStats.totalSpentLast30d.toString(),
      totalTransactions: transactionStats.totalTransactions,
      percentageIncreasePastMonth: transactionStats.percentageIncreasePastMonth,
      totalGasPurchasedKgLast30d: gasStats.totalKgPurchasedLast30d.toString(),
    };
  }
}
