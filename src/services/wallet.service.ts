import { WalletRepository } from "../repository/wallet";
import { TransactionRepository } from "../repository/transaction";
import PaystackService from "./paystack.service";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import { UserRepository } from "../repository/user";
import logger from "../config/logger";
import { getDb } from "../config/db";
import envConfig from "../config/env";

export default class WalletService {
  private static walletRepo = new WalletRepository();
  private static transactionRepo = new TransactionRepository();
  private static userRepo = new UserRepository();

  static async getOrCreateWallet(userId: string) {
    let wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      wallet = await this.walletRepo.create({ userId, balance: 0 });
    }
    return wallet;
  }

  static async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: wallet.balance.toString(),
      currency: wallet.currency,
    };
  }

  static async initializeTopup(userId: string, amount: number) {
    if (amount <= 0) {
      throw new AppError("Amount must be greater than zero", ResponseHelper.BAD_REQUEST);
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const wallet = await this.getOrCreateWallet(userId);

    const paystackData = await PaystackService.initializeTransaction(user.email, amount, {
      userId,
      walletId: wallet.id,
      type: "WALLET_TOPUP",
    }, `${envConfig.app.url}/dashboard`);

    await this.transactionRepo.create({
      userId,
      walletId: wallet.id,
      amount: Math.round(amount * 100), // Convert to kobo
      type: "WALLET_TOPUP",
      status: "PENDING",
      reference: paystackData.reference,
      provider: "PAYSTACK",
      description: "Wallet top-up via Paystack",
    });

    return paystackData;
  }

  static async verifyTopup(reference: string) {
    const transaction = await this.transactionRepo.findByReference(reference);
    if (!transaction) {
      throw new AppError("Transaction not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (transaction.status === "SUCCESS") {
      return { status: "SUCCESS", transaction };
    }

    const paystackData = await PaystackService.verifyTransaction(reference);

    if (paystackData.status === "success" && transaction.status === "PENDING") {
      await this.processSuccessfulTopup(transaction, paystackData);
      return { status: "SUCCESS", transaction: { ...transaction, status: "SUCCESS" } };
    }

    return { status: transaction.status, transaction };
  }

  static async processSuccessfulTopup(transaction: any, paystackData: any) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      const walletRepo = new WalletRepository(tx as any);
      const transactionRepo = new TransactionRepository(tx as any);

      const wallet = await walletRepo.findById(transaction.walletId);
      if (!wallet) throw new Error("Wallet not found");

      const currentTx = await transactionRepo.findById(transaction.id);
      if (!currentTx || currentTx.status === "SUCCESS") return;

      const newBalance = Number(wallet.balance) + Number(transaction.amount);

      await walletRepo.updateBalance(wallet.id, newBalance);
      await transactionRepo.updateStatus(transaction.id, "SUCCESS", paystackData);

      logger.info(`Wallet top-up successful for user ${transaction.userId}. New balance: ${newBalance}`);
    });
  }

  static async processFailedTopup(transaction: any, paystackData: any) {
    await this.transactionRepo.updateStatus(transaction.id, "FAILED", paystackData);
    logger.warn(`Wallet top-up failed for user ${transaction.userId}. Reference: ${transaction.reference}`);
  }

  static async getTransactions(userId: string) {
    const transactions = await this.transactionRepo.findByUserId(userId);
    return transactions.map(tx => ({
      ...tx,
      amount: tx.amount.toString(), // Convert bigint to string
    }));
  }
}
