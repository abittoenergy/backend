import { MeterRepo } from "../repository/meter";
import { MeterLinkRequestRepo } from "../repository/meter-link-request";
import { MeterStatus } from "../db/schema/meters.schema";
import { LinkRequestStatus } from "../db/schema/meter-link-requests.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import DataHelper from "../utils/helpers/data.helpers";
import EmailService from "./email.service";
import envConfig from "../config/env";
import { UserRepository } from "../repository/user";
import { EstateRepo } from "../repository/estate";
import logger from "../config/logger";

export default class MeterService {

  static async getMeterStatus(deviceId: string) {
    let meter = await MeterRepo.findByDeviceId(deviceId);

    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    return meter;
  }

  static async registerMeter(deviceId: string) {

    const existingMeter = await MeterRepo.findByDeviceId(deviceId);
    if (existingMeter) {
      throw new AppError("Meter already registered", ResponseHelper.BAD_REQUEST);
    }

    let uniqueMeterNumber: string | undefined;
    for (let i = 0; i < 10; i++) {
      uniqueMeterNumber = DataHelper.generateMeterNumber();
      const existingMeter = await MeterRepo.findByMeterNumber(uniqueMeterNumber);
      if (!existingMeter) break;
    }

    if (!uniqueMeterNumber) {
      throw new AppError("Failed to generate unique meter number", ResponseHelper.INTERNAL_SERVER_ERROR);
    }

    return await MeterRepo.create({
      deviceId,
      meterNumber: uniqueMeterNumber,
      status: MeterStatus.REGISTERED,
    });
  }

  static async checkMeterRegistration(meterNumber: string) {
    const meter = await MeterRepo.findByMeterNumber(meterNumber);

    if (!meter) {
      throw new AppError("Meter not found or not registered", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (meter.userId) {
      throw new AppError("Meter already linked to an account", ResponseHelper.BAD_REQUEST);
    }

    return {
      id: meter.id,
      meterNumber: meter.meterNumber,
      status: meter.status,
      canLink: !meter.userId,
    };
  }

  private static meterLinkRequestRepo = new MeterLinkRequestRepo();
  private static userRepo = new UserRepository();

  private static estateRepo = new EstateRepo();

  static async requestMeterLink(userId: string, meterNumber: string, propertyData: { estateId: string, houseNumber: string, estateName?: string }) {

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const meter = await MeterRepo.findByMeterNumber(meterNumber);
    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (meter.userId) {
      throw new AppError("Meter is already linked to an account", ResponseHelper.BAD_REQUEST);
    }

    const pendingRequest = await this.meterLinkRequestRepo.findPendingByMeterId(meter.id);
    if (pendingRequest) {
      throw new AppError("There is already a pending link request for this meter", ResponseHelper.BAD_REQUEST);
    }

    const request = await this.meterLinkRequestRepo.create({
      userId,
      meterId: meter.id,
      status: LinkRequestStatus.PENDING,
      estateId: propertyData.estateId === "OTHER" ? null : propertyData.estateId,
      houseNumber: propertyData.houseNumber,
      estateName: propertyData.estateId === "OTHER" ? propertyData.estateName : null,
    });

    let resolvedEstateName = propertyData.estateId === "OTHER" ? (propertyData.estateName || "Unknown") : "Unknown Estate";
    if (propertyData.estateId !== "OTHER") {
      const estate = await this.estateRepo.findById(propertyData.estateId);
      if (estate) resolvedEstateName = estate.name;
    }

    EmailService.sendEmail({
      to: envConfig.admin.adminEmail!,
      subject: "New Meter Link Request",
      template: "meter-link-request-admin",
      context: {
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        meterNumber: meter.meterNumber,
        deviceId: meter.deviceId,
        requestId: request.id,
        estateName: resolvedEstateName,
        houseNumber: propertyData.houseNumber,
        adminUrl: `${envConfig.app.url}/admin/meter-requests`,
      },
    }).catch((error) => {
      logger.error("Failed to send admin notification email:", error);
    });

    EmailService.sendEmail({
      to: user.email,
      subject: "Meter Link Request Received",
      template: "meter-link-request-user",
      context: {
        firstName: user.firstName,
        meterNumber: meter.meterNumber,
        estateName: resolvedEstateName,
        houseNumber: propertyData.houseNumber,
      },
    }).catch((error) => {
      logger.error("Failed to send user confirmation email:", error);
    });

    return request;
  }

  static async getMeterLinkRequests(status?: LinkRequestStatus) {
    return await this.meterLinkRequestRepo.findAll({ status });
  }

  static async processMeterLinkRequest(requestId: string, adminId: string, status: LinkRequestStatus, reason?: string) {
    const request = await this.meterLinkRequestRepo.findById(requestId);
    if (!request) {
      throw new AppError("Link request not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (request.status !== LinkRequestStatus.PENDING) {
      throw new AppError(`Request has already been ${request.status}`, ResponseHelper.BAD_REQUEST);
    }

    const updatedRequest = await this.meterLinkRequestRepo.update(requestId, {
      status,
      adminId,
      reason,
    });

    const user = await this.userRepo.findById(request.userId);
    const meter = await MeterRepo.findById(request.meterId);

    if (status === LinkRequestStatus.APPROVED && meter) {
      await MeterRepo.linkUser(meter.deviceId, request.userId, {
        estateId: request.estateId ?? undefined,
        houseNumber: request.houseNumber ?? undefined,
        estateName: request.estateName ?? undefined,
      });
    }

    if (user && meter) {
      EmailService.sendEmail({
        to: user.email,
        subject: `Meter Link Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        template: "meter-link-status-update",
        context: {
          firstName: user.firstName,
          meterNumber: meter.meterNumber,
          status: status.toUpperCase(),
          statusLowercase: status.toLowerCase(),
          isRejected: status === LinkRequestStatus.REJECTED,
          reason: reason,
        },
      }).catch((error) => {
        logger.error("Failed to send user notification email:", error);
      });
    }

    return updatedRequest;
  }

  static async getUserMeters(userId: string) {
    const meters = await MeterRepo.findByUserId(userId);

    return {
      meters,
      count: meters.length,
    };
  }
}
