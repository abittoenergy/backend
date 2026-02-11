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

export default class GasPurchaseService {
  private static gasPurchaseRepo = new GasPurchaseRepository();
  private static transactionRepo = new TransactionRepository();
  private static settingsRepo = new SystemSettingsRepository();

  /**
   * Initialize online gas purchase
   * Creates transaction and purchase record, returns Paystack payment URL
   */
  static async initializeOnlinePurchase(
    userId: string,
    meterId: string,
    amount: number
  ): Promise<{ authorizationUrl: string; reference: string; kgPurchased: number }> {
    // Validate amount
    if (amount <= 0) {
      throw new AppError("Amount must be greater than zero", ResponseHelper.BAD_REQUEST);
    }

    // Verify meter exists and belongs to user
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


    // Get gas price from settings
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
    // Calculate kg purchased (amount is in Naira, convert to kobo for calculation)
    const amountInKobo = amount * 100;
    const kgPurchased = amount / gasPricePerKg;

    // Get user for Paystack initialization
    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    // Initialize Paystack transaction
    const paystackData = await PaystackService.initializeTransaction(user.email, amount, {
      userId,
      meterId,
      type: "GAS_PURCHASE_ONLINE",
      kgPurchased: kgPurchased.toFixed(3),
      gasPricePerKg: gasPricePerKg.toFixed(2),
    });

    // Create transaction record (without walletId for online purchase)
    const transaction = await this.transactionRepo.create({
      userId,
      walletId: null, // No wallet for online purchase
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

    // Create gas purchase record
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
   * Process successful payment from webhook
   * Updates transaction and triggers MQTT dispense command
   */
  static async processSuccessfulPurchase(
    transactionId: string,
    paystackData: any
  ): Promise<void> {
    try {
      // Update transaction status
      await this.transactionRepo.updateStatus(transactionId, "SUCCESS", paystackData);

      // Find associated gas purchase
      const purchase = await this.gasPurchaseRepo.findByTransactionId(transactionId);

      if (!purchase) {
        logger.error(`Gas purchase not found for transaction: ${transactionId}`);
        return;
      }

      // Send MQTT dispense command
      await this.sendDispenseCommand(purchase.id);

      // Send success email to user (non-blocking)
      this.sendPurchaseSuccessEmail(purchase.id).catch((error) => {
        logger.error("Failed to send gas purchase success email", {
          error: error.message,
          purchaseId: purchase.id,
        });
      });

      logger.info(`Gas purchase payment successful`, {
        purchaseId: purchase.id,
        transactionId,
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
   * Send MQTT command to meter to dispense gas
   */
  static async sendDispenseCommand(purchaseId: string): Promise<void> {
    try {
      const purchase = await this.gasPurchaseRepo.findById(purchaseId);

      if (!purchase) {
        throw new AppError("Purchase not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      // Get meter details
      const meter = await MeterRepo.findById(purchase.meterId);

      if (!meter) {
        throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      // Generate command ID
      const commandId = `dispense_${purchaseId}_${Date.now()}`;

      // Send MQTT command
      mqttService.sendCommand(meter.deviceId, {
        commandId,
        action: "DISPENSE_GAS",
        params: {
          kgAmount: parseFloat(purchase.kgPurchased),
          purchaseId: purchase.id,
          openValve: true,
        },
      });

      // Mark command as sent
      await this.gasPurchaseRepo.markMqttCommandSent(purchaseId, commandId);

      logger.info(`MQTT dispense command sent`, {
        purchaseId,
        deviceId: meter.deviceId,
        commandId,
        kgAmount: purchase.kgPurchased,
      });
    } catch (error: any) {
      // Mark purchase as failed
      await this.gasPurchaseRepo.markFailed(
        purchaseId,
        `Failed to send MQTT command: ${error.message}`
      );

      logger.error("Failed to send dispense command", {
        error: error.message,
        stack: error.stack,
        purchaseId,
      });
      throw error;
    }
  }

  /**
   * Handle refill started confirmation from meter
   */
  static async handleRefillStarted(deviceId: string, commandId: string): Promise<void> {
    try {
      const purchase = await this.gasPurchaseRepo.findByMqttCommandId(commandId);

      if (!purchase) {
        logger.warn(`Purchase not found for MQTT command: ${commandId}`);
        return;
      }

      await this.gasPurchaseRepo.markRefillStarted(purchase.id);

      logger.info(`Refill started`, {
        purchaseId: purchase.id,
        deviceId,
        commandId,
      });
    } catch (error: any) {
      logger.error("Failed to handle refill started", {
        error: error.message,
        deviceId,
        commandId,
      });
    }
  }

  /**
   * Handle refill completed confirmation from meter
   */
  static async handleRefillCompleted(
    deviceId: string,
    commandId: string,
    kgDispensed: number
  ): Promise<void> {
    try {
      const purchase = await this.gasPurchaseRepo.findByMqttCommandId(commandId);

      if (!purchase) {
        logger.warn(`Purchase not found for MQTT command: ${commandId}`);
        return;
      }

      await this.gasPurchaseRepo.markRefillCompleted(purchase.id, kgDispensed.toFixed(3));

      logger.info(`Refill completed`, {
        purchaseId: purchase.id,
        deviceId,
        commandId,
        kgPurchased: purchase.kgPurchased,
        kgDispensed: kgDispensed.toFixed(3),
      });
    } catch (error: any) {
      logger.error("Failed to handle refill completed", {
        error: error.message,
        deviceId,
        commandId,
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
   * Send purchase success email to user
   * @private
   */
  private static async sendPurchaseSuccessEmail(purchaseId: string): Promise<void> {
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
        subject: `Your Gas is On Its Way - Payment Confirmed`,
        template: "gas-purchase-success",
        context: {
          firstName: user.firstName || "Valued Customer",
          amountPaid: amountInNaira,
          kgPurchased: purchase.kgPurchased,
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

      // Create in-app notification
      const NotificationService = (await import("./notification.service")).default;
      await NotificationService.createNotification(purchase.userId, {
        title: "Gas Purchase Successful",
        description: `${purchase.kgPurchased} kg of gas is being dispensed to meter ${meter.meterNumber || meter.deviceId}`,
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
      // Don't throw - email failure shouldn't break the purchase flow
    }
  }

  /**
   * Check payment status by transaction reference
   */
  static async checkPaymentStatus(reference: string, userId: string) {
    try {
      // Find transaction by reference
      const transaction = await this.transactionRepo.findByReference(reference);

      if (!transaction) {
        throw new AppError("Transaction not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      // Verify ownership
      if (transaction.userId !== userId) {
        throw new AppError(
          "You do not have permission to view this transaction",
          ResponseHelper.FORBIDDEN
        );
      }

      // Check if it's a gas purchase transaction
      if (transaction.type !== "GAS_PURCHASE_ONLINE") {
        throw new AppError("Invalid transaction type", ResponseHelper.BAD_REQUEST);
      }

      // Find associated gas purchase
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

      // Get meter details
      const meter = await MeterRepo.findById(purchase.meterId);

      return {
        reference: transaction.reference,
        paymentStatus: transaction.status,
        purchaseStatus: purchase.status,
        amount: transaction.amount,
        kgPurchased: purchase.kgPurchased,
        meterNumber: meter?.meterNumber || meter?.deviceId,
        mqttCommandSent: purchase.mqttCommandSent,
        refillStartedAt: purchase.refillStartedAt,
        refillCompletedAt: purchase.refillCompletedAt,
        kgDispensed: purchase.kgDispensed,
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
