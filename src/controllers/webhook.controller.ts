import crypto from "crypto";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import envConfig from "../config/env";
import WalletService from "../services/wallet.service";
import { TransactionRepository } from "../repository/transaction";
import logger from "../config/logger";
import { DedicatedVirtualAccountRepository } from "../repository/dedicated-virtual-account.repo";

export default class WebhookController {
  private static transactionRepo = new TransactionRepository();

  static handlePaystack = ControllerHelper.createHandler("webhook.paystack", async (req, res) => {
    const signature = req.headers["x-paystack-signature"] as string;
    const secret = envConfig.paystack.secretKey;

    // IP Whitelisting (Paystack IP addresses)
    const paystackIps = ["52.31.139.75", "52.49.173.169", "52.214.14.220"];
    const requestIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;


    ResponseHelper.sendSuccessResponse(res, {
      message: "Webhook processed",
    });

    if (requestIp && !paystackIps.some(ip => requestIp.includes(ip)) && envConfig.env === "production") {
      logger.warn(`Potential unauthorized webhook access from IP: ${requestIp}`);
      return res.status(403).send("Forbidden");
    }

    if (!secret) {
      logger.error("Paystack secret key not configured for webhook");
      return res.status(500).send("Internal Server Error");
    }

    // Verify signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== signature) {
      logger.warn("Invalid Paystack signature received");
      return res.status(400).send("Invalid Signature");
    }


    const { event, data } = req.body;
    const reference = data.reference;

    logger.info(`Processing Paystack webhook event: ${event}`, { reference, event });

    // Handle DVA-specific events
    if (event === "dedicatedaccount.assign.success") {
      await this.handleDVAAssignmentSuccess(data);
      return;
    }

    if (event === "dedicatedaccount.assign.failed") {
      await this.handleDVAAssignmentFailed(data);
      return;
    }

    // Handle charge.success event
    if (event === "charge.success") {
      // Check if this is a DVA transfer (bank transfer to dedicated account)
      const isDVATransfer = data.authorization?.channel === "dedicated_nuban" ||
        data.authorization?.card_type === "transfer";

      if (isDVATransfer) {
        // This is a bank transfer to user's DVA - credit wallet directly
        await this.handleDVATransfer(data);
        return;
      }

      // This is a regular card payment - process normally
      const transaction = await this.transactionRepo.findByReference(reference);

      if (!transaction) {
        logger.warn(`Transaction not found for reference: ${reference}`);
        return res.status(200).send("Transaction not found, skipping");
      }

      if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
        logger.info(`Transaction ${reference} already processed with status: ${transaction.status}`);
        return res.status(200).send("Already processed");
      }

      await WalletService.processSuccessfulTopup(transaction, data);
      logger.info(`Paystack card top-up successful for reference: ${reference}`);
      return;
    }

    // Handle charge.failed event
    if (event === "charge.failed") {
      const transaction = await this.transactionRepo.findByReference(reference);

      if (!transaction) {
        logger.warn(`Transaction not found for reference: ${reference}`);
        return res.status(200).send("Transaction not found, skipping");
      }

      if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
        logger.info(`Transaction ${reference} already processed with status: ${transaction.status}`);
        return res.status(200).send("Already processed");
      }

      await WalletService.processFailedTopup(transaction, data);
      logger.warn(`Paystack top-up failed for reference: ${reference}`);
      return;
    }

    // Handle other events
    logger.info(`Unhandled Paystack event: ${event}`);


  });

  private static async handleDVAAssignmentSuccess(data: any) {
    const { DedicatedVirtualAccountService } = await import("../services/dedicated-virtual-account.service");
    await DedicatedVirtualAccountService.handleDVAAssignmentSuccess(data);
  }

  private static async handleDVAAssignmentFailed(data: any) {
    const { DedicatedVirtualAccountService } = await import("../services/dedicated-virtual-account.service");
    await DedicatedVirtualAccountService.handleDVAAssignmentFailed(data);
  }

  /**
   * Handle bank transfer to user's DVA
   * This creates a transaction record and credits the user's wallet
   */
  private static async handleDVATransfer(data: any) {
    try {

      const dvaRepo = new DedicatedVirtualAccountRepository();

      // Extract account number from authorization data
      const accountNumber = data.authorization?.receiver_bank_account_number;

      if (!accountNumber) {
        logger.error("DVA transfer missing account number", { data });
        return;
      }

      // Find the DVA record
      const dva = await dvaRepo.findByAccountNumber(accountNumber);

      if (!dva) {
        logger.warn(`DVA not found for account number: ${accountNumber}`);
        return;
      }

      // Check if transaction already exists
      const existingTransaction = await this.transactionRepo.findByReference(data.reference);

      if (existingTransaction && existingTransaction.status === "SUCCESS") {
        logger.info(`DVA transfer already processed: ${data.reference}`);
        return;
      }

      // Get or create wallet for user
      const wallet = await WalletService.getOrCreateWallet(dva.userId);

      // Create transaction record if it doesn't exist
      let transaction = existingTransaction;
      if (!transaction) {
        transaction = await this.transactionRepo.create({
          userId: dva.userId,
          walletId: wallet.id,
          amount: data.amount, // Already in kobo from Paystack
          type: "WALLET_TOPUP",
          status: "PENDING",
          reference: data.reference,
          provider: "PAYSTACK",
          description: `Bank transfer from ${data.authorization?.sender_name || "Unknown"} (${data.authorization?.sender_bank_account_number || "N/A"})`,
        });
      }

      // Process the successful topup
      await WalletService.processSuccessfulTopup(transaction, data);

      logger.info(`DVA transfer processed successfully`, {
        userId: dva.userId,
        amount: data.amount,
        reference: data.reference,
        accountNumber,
        senderName: data.authorization?.sender_name,
      });
    } catch (error: any) {
      logger.error("Failed to process DVA transfer", {
        error: error.message,
        stack: error.stack,
        reference: data.reference,
      });
    }
  }
}
