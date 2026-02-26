import { eq, and, sql } from "drizzle-orm";
import { getDb, DbClient } from "../config/db";
import { MeterRepo } from "../repository/meter";
import { GasTransferRepository } from "../repository/gas-transfer.repo";
import { TransactionRepository } from "../repository/transaction";
import { UserRepository } from "../repository/user";
import OTPService from "./otp.service";
import NotificationService from "./notification.service";
import EmailService from "./email.service";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import { OTP_TYPES } from "../utils/constants/otp";
import logger from "../config/logger";
import { GasTransfer } from "../db/schema/gas-transfers.schema";
import { SystemSettingsService } from "./system-settings.service";

export class GasTransferService {
  private static userRepo = new UserRepository();
  private static meterRepo = MeterRepo;
  private static gasTransferRepo = new GasTransferRepository();
  private static transactionRepo = new TransactionRepository();
  private static db = getDb();

  /**
   * Gift gas from one meter to another
   */
  static async giftGas(params: {
    senderId: string;
    sourceMeterId: string;
    recipientMeterNumber: string;
    amountKg: number;
    otp: string;
  }): Promise<GasTransfer> {
    const { senderId, sourceMeterId, recipientMeterNumber, amountKg, otp } = params;

    if (amountKg <= 0) {
      throw new AppError("Amount must be greater than 0", ResponseHelper.BAD_REQUEST);
    }

    const sender = await this.userRepo.findById(senderId);
    if (!sender) {
      throw new AppError("Sender not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    await OTPService.verifyOTP(sender.email, OTP_TYPES.GAS_GIFTING_AUTHORIZATION, otp);

    const sourceMeterResult = await this.meterRepo.findById(sourceMeterId);
    if (!sourceMeterResult || !sourceMeterResult.meters) {
      throw new AppError("Source meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }
    const sourceMeter = sourceMeterResult.meters;

    if (sourceMeter.userId !== senderId) {
      throw new AppError("You do not own this meter", ResponseHelper.FORBIDDEN);
    }

    if (parseFloat(sourceMeter.availableGasKg) < amountKg) {
      throw new AppError("Insufficient gas balance", ResponseHelper.BAD_REQUEST);
    }

    const targetMeter = await this.meterRepo.findByMeterNumber(recipientMeterNumber);
    if (!targetMeter) {
      throw new AppError("Recipient meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (!targetMeter.userId) {
      throw new AppError("Recipient meter is not linked to any user", ResponseHelper.BAD_REQUEST);
    }

    if (targetMeter.id === sourceMeter.id) {
      throw new AppError("Cannot gift gas to the same meter", ResponseHelper.BAD_REQUEST);
    }

    const recipient = await this.userRepo.findById(targetMeter.userId);
    if (!recipient) {
      throw new AppError("Recipient not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const settings = await SystemSettingsService.getSettings();
    const gasPriceAtTime = parseFloat(settings.gasPricePerKg || "0");
    const totalWorth = amountKg * gasPriceAtTime;

    return await this.db.transaction(async (tx) => {
      await this.meterRepo.updateGasBalance(sourceMeter.id, -amountKg, tx);

      await this.meterRepo.updateGasBalance(targetMeter.id, amountKg, tx);

      const transfer = await this.gasTransferRepo.create({
        senderId,
        recipientId: recipient.id,
        sourceMeterId: sourceMeter.id,
        targetMeterId: targetMeter.id,
        amountKg: amountKg.toString(),
        gasPriceAtTime: gasPriceAtTime.toString(),
        totalWorth: totalWorth.toString(),
      }, tx);

      await this.transactionRepo.create({
        userId: senderId,
        amount: 0, // No monetary value as it is a gas gift
        type: "GAS_TRANSFER" as any,
        status: "SUCCESS",
        description: `Gifted ${amountKg}kg gas to meter ${recipientMeterNumber}`,
        metadata: {
          transferId: transfer.id,
          type: "outgoing",
          recipientEmail: recipient.email,
          worth: totalWorth,
          gasPriceAtTime,
          amountKg
        },
      }, tx);

      await this.transactionRepo.create({
        userId: recipient.id,
        amount: 0,
        type: "GAS_TRANSFER" as any,
        status: "SUCCESS",
        description: `Received ${amountKg}kg gas from ${sender.firstName} ${sender.lastName}`,
        metadata: {
          transferId: transfer.id,
          type: "incoming",
          senderEmail: sender.email,
          worth: totalWorth,
          gasPriceAtTime,
          amountKg
        },
      }, tx);

      this.sendNotifications(sender, recipient, sourceMeter.meterNumber || "", targetMeter.meterNumber || "", amountKg).catch(err => {
        logger.error("Failed to send gas gifting notifications", { error: err.message });
      });

      return transfer;
    });
  }

  private static async sendNotifications(sender: any, recipient: any, sourceMeter: string, targetMeter: string, amountKg: number) {
    if (sender.id === recipient.id) {
      await NotificationService.createNotification(sender.id, {
        title: "Gas Transferred Between Meters",
        description: `You have successfully moved ${amountKg}kg gas from meter ${sourceMeter} to meter ${targetMeter}.`,
        category: "METER",
      });

      await EmailService.sendEmail({
        to: sender.email,
        subject: "Gas Transfer Successful - Abitto Energy",
        template: "gas-transfer-self",
        context: {
          firstName: sender.firstName,
          amountKg,
          targetMeter,
          sourceMeter,
        },
      });
      return;
    }

    await Promise.all([
      NotificationService.createNotification(sender.id, {
        title: "Gas Gift Sent",
        description: `You have successfully gifted ${amountKg}kg gas to meter ${targetMeter}.`,
        category: "METER",
      }),
      NotificationService.createNotification(recipient.id, {
        title: "Gas Gift Received",
        description: `You have received ${amountKg}kg gas from ${sender.firstName} ${sender.lastName} to meter ${targetMeter}.`,
        category: "METER",
      }),
    ]);

    await Promise.all([
      EmailService.sendEmail({
        to: sender.email,
        subject: "Gas Gift Successfully Sent - Abitto Energy",
        template: "gas-gift-sent",
        context: {
          recipientName: `${recipient.firstName} ${recipient.lastName}`,
          amountKg,
          targetMeter,
          sourceMeter,
        },
      }),
      EmailService.sendEmail({
        to: recipient.email,
        subject: "Gas Gift Received - Abitto Energy",
        template: "gas-gift-received",
        context: {
          senderName: `${sender.firstName} ${sender.lastName}`,
          amountKg,
          targetMeter,
        },
      }),
    ]);
  }
}
