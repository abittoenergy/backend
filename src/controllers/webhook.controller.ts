import crypto from "crypto";
import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import envConfig from "../config/env";
import WalletService from "../services/wallet.service";
import { TransactionRepository } from "../repository/transaction";
import logger from "../config/logger";

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

    logger.info(`Processing Paystack webhook event: ${event}`, { reference });

    const transaction = await this.transactionRepo.findByReference(reference);

    if (!transaction) {
      logger.warn(`Transaction not found for reference: ${reference}`);
      return res.status(200).send("Transaction not found, skipping");
    }

    if (transaction.status === "SUCCESS" || transaction.status === "FAILED") {
      logger.info(`Transaction ${reference} already processed with status: ${transaction.status}`);
      return res.status(200).send("Already processed");
    }

    

    switch (event) {
      case "charge.success":
        await WalletService.processSuccessfulTopup(transaction, data);
        logger.info(`Paystack top-up successful for reference: ${reference}`);
        break;

      case "charge.failed":
        await WalletService.processFailedTopup(transaction, data);
        logger.warn(`Paystack top-up failed for reference: ${reference}`);
        break;

      default:
        logger.info(`Unhandle Paystack event: ${event}`);
    }

   
  });
}
