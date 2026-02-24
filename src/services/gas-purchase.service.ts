import { GasPurchaseRepository } from "../repository/gas-purchase.repo";
import { TransactionRepository } from "../repository/transaction";
import { MeterRepo } from "../repository/meter";
import PaystackService from "./paystack.service";
import mqttService from "./mqtt.service";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";
import { GasPurchaseStatus } from "../db/schema/gas-purchases.schema";
import { SystemSettingsRepository } from "../repository/system-settings.repo";
import EmailService from "./email.service";
import envConfig from "../config/env";
import { UserRepository } from "../repository/user";
import { GasUsageAuditRepository } from "../repository/gas-usage-audit.repo";
import { getDb, DbClient } from "../config/db";
import { WalletRepository } from "../repository/wallet";
import MeterService from "./meter.service";
import NotificationService from "./notification.service";

export default class GasPurchaseService {
  private static gasPurchaseRepo = new GasPurchaseRepository();
  private static transactionRepo = new TransactionRepository();
  private static settingsRepo = new SystemSettingsRepository();
  private static userRepo = new UserRepository();
  private static gasUsageAuditRepo = new GasUsageAuditRepository();
  private static walletRepo = new WalletRepository();
  /**
   * Initialize online gas purchase
   * Creates transaction and purchase record, returns Paystack payment URL
   */
  static async initializeOnlinePurchase(
    userId: string,
    meterId: string,
    amount: number
  ): Promise<{ authorizationUrl: string; reference: string; kgPurchased: number }> {
    if (amount <= 0) {
      throw new AppError("Amount must be greater than zero", ResponseHelper.BAD_REQUEST);
    }

    const meter = await MeterRepo.findById(meterId);
    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (meter.userId !== userId) {
      throw new AppError(
        "You do not have permission to purchase gas for this meter",
        ResponseHelper.FORBIDDEN
      );
    }


    const settings = await this.settingsRepo.getSettings();
    if (!settings || !settings.gasPricePerKg) {
      throw new AppError(
        "Gas price not configured. Please contact support.",
        ResponseHelper.INTERNAL_SERVER_ERROR
      );
    }



    const gasPricePerKg = parseFloat(settings.gasPricePerKg);

    if (amount < gasPricePerKg) {
      throw new AppError(`Minimum gas purchase amount is ${gasPricePerKg}/kg`, ResponseHelper.BAD_REQUEST);
    }

    const amountInKobo = amount * 100;
    const kgPurchased = amount / gasPricePerKg;

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const paystackData = await PaystackService.initializeTransaction(user.email, amount, {
      userId,
      meterId,
      type: "GAS_PURCHASE_ONLINE",
      kgPurchased: kgPurchased.toFixed(3),
      gasPricePerKg: gasPricePerKg.toFixed(2),
    }, `${envConfig.app.url}/dashboard`);

    const transaction = await this.transactionRepo.create({
      userId,
      walletId: null,
      amount: amountInKobo,
      type: "GAS_PURCHASE_ONLINE",
      status: "PENDING",
      reference: paystackData.reference,
      provider: "PAYSTACK",
      description: `Online gas purchase for meter ${meter.meterNumber || meter.deviceId}`,
      metadata: {
        meterId,
        kgPurchased: kgPurchased.toFixed(3),
        gasPricePerKg: gasPricePerKg.toFixed(2),
      },
    });

    await this.gasPurchaseRepo.create({
      userId,
      meterId,
      transactionId: transaction.id,
      amountPaid: amountInKobo,
      gasPricePerKg: gasPricePerKg.toFixed(2),
      kgPurchased: kgPurchased.toFixed(3),
      status: GasPurchaseStatus.PENDING,
    });

    logger.info(`Gas purchase initialized`, {
      userId,
      meterId,
      amount,
      kgPurchased: kgPurchased.toFixed(3),
      reference: paystackData.reference,
    });

    return {
      authorizationUrl: paystackData.authorization_url,
      reference: paystackData.reference,
      kgPurchased: parseFloat(kgPurchased.toFixed(3)),
    };
  }

  /**
   * Purchase gas from wallet balance
   */
  static async purchaseGasFromWallet(
    userId: string,
    meterId: string,
    amount: number
  ): Promise<{ kgPurchased: number; newBalance: number }> {
    // 1. Validate amount
    if (amount <= 0) {
      throw new AppError("Amount must be greater than zero", ResponseHelper.BAD_REQUEST);
    }

    // 2. Verify meter ownership
    const meter = await MeterRepo.findById(meterId);
    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (meter.userId !== userId) {
      throw new AppError(
        "You do not have permission to purchase gas for this meter",
        ResponseHelper.FORBIDDEN
      );
    }

    // 3. Get gas price from settings
    const settings = await this.settingsRepo.getSettings();
    if (!settings || !settings?.gasPricePerKg) {
      throw new AppError(
        "Gas price not configured. Please contact support.",
        ResponseHelper.INTERNAL_SERVER_ERROR
      );
    }

    const gasPricePerKg = parseFloat(settings.gasPricePerKg);
    if (amount < gasPricePerKg) {
      throw new AppError(`Minimum gas purchase amount is ${gasPricePerKg}/kg`, ResponseHelper.BAD_REQUEST);
    }

    const kgPurchased = amount / gasPricePerKg;
    const amountInKobo = Math.round(amount * 100);

    const db = getDb();

    return await db.transaction(async (tx: DbClient) => {

      const transactionRepo = new TransactionRepository(tx);
      const gasPurchaseRepo = new GasPurchaseRepository(tx);
      const userRepo = new UserRepository(tx);

      // 4. Verify wallet balance
      const wallet = await this.walletRepo.findByUserId(userId);
      if (!wallet) {
        throw new AppError("Wallet not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      if (Number(wallet.balance) < amountInKobo) {
        throw new AppError("Insufficient wallet balance", ResponseHelper.BAD_REQUEST);
      }

      // 5. Deduct from wallet
      const updatedWallet = await this.walletRepo.updateBalance(wallet.id, Number(wallet.balance) - amountInKobo);
      if (!updatedWallet) throw new Error("Failed to update wallet balance");

      // 6. Create success transaction
      const transaction = await transactionRepo.create({
        userId,
        walletId: wallet.id,
        amount: amountInKobo,
        type: "GAS_PURCHASE_WALLET",
        status: "SUCCESS",
        description: `Gas purchase from wallet for meter ${meter.meterNumber || meter.deviceId}`,
        metadata: {
          meterId,
          kgPurchased: kgPurchased.toFixed(3),
          gasPricePerKg: gasPricePerKg.toFixed(2),
        },
      });

      // 7. Create completed gas purchase record
      const purchase = await gasPurchaseRepo.create({
        userId,
        meterId,
        transactionId: transaction.id,
        amountPaid: amountInKobo,
        gasPricePerKg: gasPricePerKg.toFixed(2),
        kgPurchased: kgPurchased.toFixed(3),
        status: GasPurchaseStatus.COMPLETED,
        refillCompletedAt: new Date(),
        kgDispensed: kgPurchased.toFixed(3),
      });

      // 8. Update meter's availableGasKg
      const newGasBalance = await MeterRepo.updateGasBalance(meterId, kgPurchased, tx);

      // Post-transaction notifications
      this.sendPurchaseNotificationToDevice(purchase.id, newGasBalance).catch((err) => {
        logger.error("Failed to send device notification for wallet purchase", { error: err.message, purchaseId: purchase.id });
      });

      this.sendPurchaseSuccessEmail(purchase.id, newGasBalance).catch((err) => {
        logger.error("Failed to send email for wallet purchase", { error: err.message, purchaseId: purchase.id });
      });

      logger.info(`Gas purchase from wallet successful`, {
        userId,
        meterId,
        amount,
        kgPurchased: kgPurchased.toFixed(3),
        newGasBalance,
      });

      return {
        kgPurchased: parseFloat(kgPurchased.toFixed(3)),
        newBalance: newGasBalance,
      };
    });
  }

  /**
   * Process successful payment from webhook
   * Updates transaction and triggers MQTT dispense command
   */
  static async processSuccessfulPurchase(
    transactionId: string,
    paystackData: any
  ): Promise<void> {
    try {
      await this.transactionRepo.updateStatus(transactionId, "SUCCESS", paystackData);

      const purchase = await this.gasPurchaseRepo.findByTransactionId(transactionId);

      if (!purchase) {
        logger.error(`Gas purchase not found for transaction: ${transactionId}`);
        return;
      }

      const newBalance = await MeterRepo.updateGasBalance(purchase.meterId, parseFloat(purchase.kgPurchased));

      await this.gasPurchaseRepo.markRefillCompleted(purchase.id, purchase.kgPurchased);

      this.sendPurchaseNotificationToDevice(purchase.id, newBalance).catch((error) => {
        logger.error("Failed to send gas purchase notification to device", {
          error: error.message,
          purchaseId: purchase.id,
        });
      });

      this.sendPurchaseSuccessEmail(purchase.id, newBalance).catch((error) => {
        logger.error("Failed to send gas purchase success email", {
          error: error.message,
          purchaseId: purchase.id,
        });
      });

      logger.info(`Gas purchase balance updated and completed`, {
        purchaseId: purchase.id,
        transactionId,
        userId: purchase.userId,
        kgPurchased: purchase.kgPurchased,
        newBalance,
        reference: paystackData.reference,
      });
    } catch (error: any) {
      logger.error("Failed to process successful gas purchase", {
        error: error.message,
        stack: error.stack,
        transactionId,
      });
      throw error;
    }
  }


  /**
   * Handle gas usage report from IoT device
   */
  static async handleGasUsage(deviceId: string, kgUsed: number): Promise<void> {
    try {
      const meter = await MeterRepo.findByDeviceId(deviceId);
      if (!meter || !meter.userId) {
        logger.warn(`Usage reported for unknown or unlinked meter: ${deviceId}`);
        return;
      }

      const previousBalance = parseFloat(meter.availableGasKg || "0");
      let actualKgUsed = kgUsed;

      if (previousBalance <= 0) {
        logger.warn(`Usage reported for meter with zero/negative balance: ${deviceId}`, {
          deviceId,
          previousBalance,
          kgUsed,
        });
        await MeterService.closeValve(deviceId);
        return;
      }

      if (kgUsed > previousBalance) {
        logger.warn(`Usage exceeds balance for meter ${deviceId}. Capping usage from ${kgUsed}kg to ${previousBalance}kg`, {
          deviceId,
          previousBalance,
          kgUsed,
        });
        actualKgUsed = previousBalance;
      }

      const newBalance = await MeterRepo.updateGasBalance(meter.id, -actualKgUsed);

      await this.gasUsageAuditRepo.create({
        userId: meter.userId,
        meterId: meter.id,
        deviceId: deviceId,
        kgUsed: actualKgUsed.toFixed(3),
        previousBalance: previousBalance.toFixed(3),
        newBalance: newBalance.toFixed(3),
        metadata: { timestamp: new Date(), requestedUsage: kgUsed.toFixed(3) },
      });

      if (newBalance <= 0) {
        await MeterService.closeValve(deviceId);
        await this.sendExhaustedBalanceNotification(meter.id).catch((err) =>
          logger.error("Failed to send exhausted balance notification:", err)
        );
      }

      logger.info(`Gas usage processed and audited`, {
        deviceId,
        userId: meter.userId,
        kgUsed,
        previousBalance,
        newBalance,
      });
    } catch (error: any) {
      logger.error("Failed to handle gas usage report", {
        error: error.message,
        deviceId,
        kgUsed,
      });
    }
  }

  /**
   * Handle balance request from IoT device
   */
  static async handleBalanceRequest(deviceId: string): Promise<void> {
    try {
      const meter = await MeterRepo.findByDeviceId(deviceId);
      if (!meter || !meter.userId) {
        logger.warn(`Balance requested for unknown or unlinked meter: ${deviceId}`);
        return;
      }

      const userRepo = new UserRepository();
      const user = await userRepo.findById(meter.userId);

      if (!user) return;

      const availableBalance = parseFloat(meter.availableGasKg || "0");

      // Send MQTT response
      mqttService.sendCommand(deviceId, {
        commandId: `balance_resp_${Date.now()}`,
        action: "BALANCE_RESPONSE",
        params: {
          availableGasKg: availableBalance,
        },
      });

      logger.info(`Balance response sent to meter`, {
        deviceId,
        userId: user.id,
        availableBalance,
      });
    } catch (error: any) {
      logger.error("Failed to handle balance request", {
        error: error.message,
        deviceId,
      });
    }
  }

  /**
   * Get user's purchase history
   */
  static async getUserPurchaseHistory(userId: string) {
    return await this.gasPurchaseRepo.findByUserId(userId);
  }

  /**
   * Get meter's purchase history
   */
  static async getMeterPurchaseHistory(meterId: string) {
    return await this.gasPurchaseRepo.findByMeterId(meterId);
  }

  /**
   * Get purchase details by ID
   */
  static async getPurchaseDetails(purchaseId: string, userId: string) {
    const purchase = await this.gasPurchaseRepo.findById(purchaseId);

    if (!purchase) {
      throw new AppError("Purchase not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    // Verify ownership
    if (purchase.userId !== userId) {
      throw new AppError(
        "You do not have permission to view this purchase",
        ResponseHelper.FORBIDDEN
      );
    }

    return purchase;
  }

  /**
   * Send MQTT notification to device about successful purchase
   * @private
   */
  private static async sendPurchaseNotificationToDevice(purchaseId: string, newBalance?: number): Promise<void> {
    try {
      const purchase = await this.gasPurchaseRepo.findById(purchaseId);
      if (!purchase) {
        logger.warn(`Purchase not found for device notification: ${purchaseId}`);
        return;
      }

      const meter = await MeterRepo.findById(purchase.meterId);
      if (!meter) {
        logger.warn(`Meter not found for device notification: ${purchaseId}`);
        return;
      }

      let balance = newBalance;
      if (balance === undefined) {
        balance = parseFloat(meter.availableGasKg || "0");
      }

      mqttService.sendCommand(meter.deviceId, {
        commandId: `purchase_conf_${purchaseId}_${Date.now()}`,
        action: "PURCHASE_CONFIRMED",
        params: {
          purchaseId: purchase.id,
          kgPurchased: parseFloat(purchase.kgPurchased),
          availableGasKg: balance,
        },
      });

      logger.info(`Device purchase notification sent`, {
        purchaseId,
        deviceId: meter.deviceId,
        kgPurchased: purchase.kgPurchased,
        availableGasKg: balance,
      });
    } catch (error: any) {
      logger.error("Error sending device purchase notification", {
        error: error.message,
        stack: error.stack,
        purchaseId,
      });
    }
  }

  /**
   * Send purchase success email to user
   * @private
   */
  private static async sendPurchaseSuccessEmail(purchaseId: string, newBalance?: number): Promise<void> {
    try {
      const purchase = await this.gasPurchaseRepo.findById(purchaseId);
      if (!purchase) {
        logger.warn(`Purchase not found for email: ${purchaseId}`);
        return;
      }

      const userRepo = new UserRepository();
      const user = await userRepo.findById(purchase.userId);

      if (!user || !user.email) {
        logger.warn(`User or email not found for purchase: ${purchaseId}`);
        return;
      }

      const meter = await MeterRepo.findById(purchase.meterId);
      if (!meter) {
        logger.warn(`Meter not found for purchase: ${purchaseId}`);
        return;
      }

      const transaction = await this.transactionRepo.findById(purchase.transactionId);

      const amountInNaira = (Number(purchase.amountPaid) / 100).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      await EmailService.sendEmail({
        to: user.email,
        subject: `Your Gas Balance has been Updated - Payment Confirmed`,
        template: "gas-purchase-success",
        context: {
          firstName: user.firstName || "Valued Customer",
          amountPaid: amountInNaira,
          kgPurchased: purchase.kgPurchased,
          newBalance: newBalance?.toFixed(3) || parseFloat(meter.availableGasKg || "0").toFixed(3),
          gasPricePerKg: parseFloat(purchase.gasPricePerKg).toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          reference: transaction?.reference || "N/A",
          purchaseDate: new Date(purchase.createdAt).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          meterNumber: meter.meterNumber || meter.deviceId,
          estateName: meter.estateName,
          houseNumber: meter.houseNumber,
          dashboardUrl: `${envConfig.app.url}/dashboard`,
          buyGasUrl: `${envConfig.app.url}/gas-purchase`,
        },
      });

      const NotificationService = (await import("./notification.service")).default;
      await NotificationService.createNotification(purchase.userId, {
        title: "Gas Purchase Successful",
        description: `${purchase.kgPurchased} kg of gas has been added to your available balance. New balance: ${newBalance?.toFixed(3) || parseFloat(meter.availableGasKg || "0").toFixed(3)} kg.`,
        category: "GAS_PURCHASE",
      });

      logger.info(`Gas purchase success email sent`, {
        purchaseId,
        userId: purchase.userId,
        email: user.email,
      });
    } catch (error: any) {
      logger.error("Error sending gas purchase success email", {
        error: error.message,
        stack: error.stack,
        purchaseId,
      });
    }
  }

  /**
   * Send notification and email when gas balance is exhausted
   * @private
   */
  private static async sendExhaustedBalanceNotification(meterId: string): Promise<void> {
    try {
      const meter = await MeterRepo.findById(meterId);
      if (!meter || !meter.userId) return;

      const user = await this.userRepo.findById(meter.userId);
      if (!user) return;

      await NotificationService.createNotification(user.id, {
        title: "Gas Balance Exhausted",
        description: `The valve on meter ${meter.meterNumber || meter.deviceId} has been closed because your gas balance is exhausted. Please refill to continue usage.`,
        category: "GAS_PURCHASE",
      });

      if (user.email) {
        await EmailService.sendEmail({
          to: user.email,
          subject: `Urgent: Gas Balance Exhausted - Valve Closed`,
          template: "balance-exhausted",
          context: {
            firstName: user.firstName || "Valued Customer",
            meterNumber: meter.meterNumber || meter.deviceId,
            estateName: meter.estateName,
            houseNumber: meter.houseNumber,
            buyGasUrl: `${envConfig.app.url}/gas-purchase`,
          },
        });
      }

      logger.info(`Exhausted balance notifications sent for meter ${meterId}`, {
        userId: user.id,
        email: user.email,
      });
    } catch (error: any) {
      logger.error("Error sending exhausted balance notification", {
        error: error.message,
        meterId,
      });
    }
  }

  /**
   * Check payment status by transaction reference
   */
  static async checkPaymentStatus(reference: string, userId: string) {
    try {
      const transaction = await this.transactionRepo.findByReference(reference);

      if (!transaction) {
        throw new AppError("Transaction not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      if (transaction.userId !== userId) {
        throw new AppError(
          "You do not have permission to view this transaction",
          ResponseHelper.FORBIDDEN
        );
      }

      if (transaction.type !== "GAS_PURCHASE_ONLINE") {
        throw new AppError("Invalid transaction type", ResponseHelper.BAD_REQUEST);
      }

      const purchase = await this.gasPurchaseRepo.findByTransactionId(transaction.id);

      if (!purchase) {
        return {
          reference: transaction.reference,
          paymentStatus: transaction.status,
          amount: transaction.amount,
          purchaseStatus: null,
          message: "Payment transaction found but purchase record not created yet",
        };
      }

      const meter = await MeterRepo.findById(purchase.meterId);

      const userRepo = new UserRepository();
      const user = await userRepo.findById(purchase.userId);

      return {
        reference: transaction.reference,
        paymentStatus: transaction.status,
        purchaseStatus: purchase.status,
        amount: transaction.amount,
        kgPurchased: purchase.kgPurchased,
        availableGasKg: meter ? parseFloat(meter.availableGasKg || "0") : null,
        meterNumber: meter?.meterNumber || meter?.deviceId,
        createdAt: purchase.createdAt,
      };
    } catch (error: any) {
      logger.error("Error checking payment status", {
        error: error.message,
        reference,
        userId,
      });
      throw error;
    }
  }
}
