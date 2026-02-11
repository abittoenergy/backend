import { DedicatedVirtualAccountRepository } from "../repository/dedicated-virtual-account.repo";
import { UserRepository } from "../repository/user";
import PaystackService from "./paystack.service";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";
import envConfig from "../config/env";

export class DedicatedVirtualAccountService {
  private static dvaRepo = new DedicatedVirtualAccountRepository();
  private static userRepo = new UserRepository();

  /**
   * Generate a dedicated virtual account for a user
   */
  static async generateDVAForUser(userId: string): Promise<void> {
    try {
      // Check if user already has a DVA
      const existingDVA = await this.dvaRepo.findByUserId(userId);
      if (existingDVA) {
        logger.info(`User ${userId} already has a DVA`, { accountNumber: existingDVA.accountNumber });
        return;
      }

      // Fetch user details
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      if (!user.emailVerified) {
        throw new AppError("User email not verified", ResponseHelper.BAD_REQUEST);
      }

      // Validate required fields
      if (!user.firstName || !user.lastName || !user.phoneNumber) {
        logger.warn(`User ${userId} missing required fields for DVA generation`, {
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        });
        throw new AppError(
          "User profile incomplete. Please update first name, last name, and phone number",
          ResponseHelper.BAD_REQUEST
        );
      }

      // Determine preferred bank (test-bank for test mode, titan-paystack for production)
      const preferredBank = envConfig.env === "production" ? "titan-paystack" : "test-bank";

      logger.info(`Generating DVA for user ${userId}`, {
        email: user.email,
        preferredBank,
      });

      // Call Paystack API to assign dedicated account
      const paystackResponse = await PaystackService.assignDedicatedAccount(
        user.email,
        user.firstName,
        user.lastName,
        user.phoneNumber,
        preferredBank
      );

      // Create pending DVA record (will be updated via webhook)
      await this.dvaRepo.create({
        userId: user.id,
        customerCode: paystackResponse.customer?.customer_code || null,
        accountNumber: paystackResponse.account_number || null,
        accountName: paystackResponse.account_name || null,
        bankName: paystackResponse.bank?.name || null,
        bankId: paystackResponse.bank?.id || null,
        bankSlug: paystackResponse.bank?.slug || null,
        currency: paystackResponse.currency || "NGN",
        isActive: paystackResponse.active || false,
        assigned: paystackResponse.assigned || false,
        assignmentData: paystackResponse,
      });

      logger.info(`DVA created for user ${userId}`, {
        accountNumber: paystackResponse.account_number,
        bankName: paystackResponse.bank?.name,
      });
    } catch (error: any) {
      logger.error(`Failed to generate DVA for user ${userId}`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Handle successful DVA assignment webhook
   */
  static async handleDVAAssignmentSuccess(data: any): Promise<void> {
    try {
      const customerCode = data.customer?.customer_code;
      if (!customerCode) {
        logger.warn("DVA assignment success webhook missing customer code", { data });
        return;
      }

      const dva = await this.dvaRepo.findByCustomerCode(customerCode);
      if (!dva) {
        logger.warn(`DVA not found for customer code: ${customerCode}`);
        return;
      }

      // Update DVA with complete details
      await this.dvaRepo.update(dva.id, {
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankName: data.bank?.name,
        bankId: data.bank?.id,
        bankSlug: data.bank?.slug,
        currency: data.currency || "NGN",
        isActive: data.active || true,
        assigned: data.assigned || true,
        assignmentData: data,
      });

      logger.info(`DVA assignment successful for customer ${customerCode}`, {
        accountNumber: data.account_number,
      });

      // Send DVA creation email to user (non-blocking)
      this.sendDVACreatedEmail(dva.userId, data).catch((error: any) => {
        logger.error("Failed to send DVA created email", {
          error: error.message,
          userId: dva.userId,
        });
      });
    } catch (error: any) {
      logger.error("Failed to handle DVA assignment success", {
        error: error.message,
        data,
      });
    }
  }

  /**
   * Handle failed DVA assignment webhook
   */
  static async handleDVAAssignmentFailed(data: any): Promise<void> {
    try {
      const email = data.email;
      logger.error(`DVA assignment failed for ${email}`, {
        reason: data.reason,
        data,
      });

      // You might want to notify the user or retry
      // For now, just log the failure
    } catch (error: any) {
      logger.error("Failed to handle DVA assignment failure", {
        error: error.message,
        data,
      });
    }
  }

  /**
   * Get user's DVA details
   */
  static async getUserDVA(userId: string) {
    const dva = await this.dvaRepo.findByUserId(userId);
    if (!dva) {
      throw new AppError("No dedicated virtual account found for this user", ResponseHelper.RESOURCE_NOT_FOUND);
    }
    return dva;
  }

  /**
   * Requery user's DVA for pending transactions
   */
  static async requeryUserDVA(userId: string): Promise<any> {
    const dva = await this.dvaRepo.findByUserId(userId);
    if (!dva || !dva.accountNumber || !dva.bankSlug) {
      throw new AppError("No dedicated virtual account found for this user", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    return await PaystackService.requeryDedicatedAccount(
      dva.accountNumber,
      dva.bankSlug
    );
  }

  /**
   * Send DVA created email to user
   * @private
   */
  private static async sendDVACreatedEmail(userId: string, dvaData: any): Promise<void> {
    try {
      // Get user details
      const user = await this.userRepo.findById(userId);
      if (!user || !user.email) {
        logger.warn(`User or email not found for DVA email: ${userId}`);
        return;
      }

      const EmailService = (await import("./email.service")).default;
      await EmailService.sendEmail({
        to: user.email,
        subject: "Your Dedicated Virtual Account is Ready!",
        template: "dva-created",
        context: {
          firstName: user.firstName || "Valued Customer",
          accountNumber: dvaData.account_number,
          accountName: dvaData.account_name,
          bankName: dvaData.bank?.name || "Bank",
          customerEmail: user.email,
        },
      });

      logger.info(`DVA created email sent`, {
        userId,
        email: user.email,
        accountNumber: dvaData.account_number,
      });
    } catch (error: any) {
      logger.error("Error sending DVA created email", {
        error: error.message,
        stack: error.stack,
        userId,
      });
      // Don't throw - email failure shouldn't break the DVA creation flow
    }
  }
}
