import { MeterRepo } from "../repository/meter";
import { AdminLinkMeterInput } from "../validators/meter.validator";
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
import { GasUsageAuditRepository } from "../repository/gas-usage-audit.repo";
import logger from "../config/logger";
import NotificationService from "./notification.service";
import mqttService from "./mqtt.service";

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
  private static auditRepo = new GasUsageAuditRepository();

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

  static async getMeterLinkRequests(query: {
    status?: LinkRequestStatus;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "20", 10);

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (query.startDate) startDate = new Date(query.startDate);
    if (query.endDate) {
      endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const [stats, { results, total }] = await Promise.all([
      this.meterLinkRequestRepo.getGlobalStats(),
      this.meterLinkRequestRepo.findAllAdmin({
        page,
        limit,
        status: query.status,
        search: query.search,
        startDate,
        endDate,
      }),
    ]);

    return {
      stats,
      requests: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    const result = await MeterRepo.findById(request.meterId);

    if (status === LinkRequestStatus.APPROVED && result) {
      await MeterRepo.linkUser(result.meters.deviceId, request.userId, {
        estateId: request.estateId ?? undefined,
        houseNumber: request.houseNumber ?? undefined,
        estateName: request.estateName ?? undefined,
      });
    }

    if (user && result) {
      const meter = result.meters;
      // Create in-app notification
      const NotificationService = (await import("./notification.service")).default;

      if (status === LinkRequestStatus.APPROVED) {
        await NotificationService.createNotification(user.id, {
          title: "Meter Linked Successfully",
          description: `Meter ${meter.meterNumber || meter.deviceId} has been linked to your account`,
          category: "METER",
        });
      } else if (status === LinkRequestStatus.REJECTED) {
        await NotificationService.createNotification(user.id, {
          title: "Meter Link Request Rejected",
          description: `Your request to link meter ${meter.meterNumber || meter.deviceId} was not approved${reason ? `: ${reason}` : ""}`,
          category: "METER",
        });
      }

      EmailService.sendEmail({
        to: user.email,
        subject: `Meter Link Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        template: "meter-link-status-update",
        context: {
          firstName: user.firstName || "User",
          meterNumber: meter.meterNumber || meter.deviceId,
          status,
          reason: reason || "N/A",
          approved: status === LinkRequestStatus.APPROVED,
        },
      }).catch((error: any) => {
        logger.error("Failed to send meter link status email", {
          error: error.message,
          userId: user.id,
          requestId,
        });
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

  static async adminGetMeters(query: { page?: string, limit?: string, search?: string, isLinked?: string }) {
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "20", 10);
    const isLinked = query.isLinked === "true" ? true : query.isLinked === "false" ? false : undefined;

    const [stats, { results, total }] = await Promise.all([
      MeterRepo.getStats(),
      MeterRepo.findAllAdmin({
        page,
        limit,
        search: query.search,
        isLinked,
      }),
    ]);

    return {
      stats,
      meters: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async adminUnlinkMeter(deviceId: string) {
    const meter = await MeterRepo.findByDeviceId(deviceId);

    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (!meter.userId) {
      throw new AppError("Meter is not linked to any user", ResponseHelper.BAD_REQUEST);
    }

    const originalUserId = meter.userId;
    const updatedMeter = await MeterRepo.unlinkUser(deviceId);

    if (!updatedMeter) {
      return updatedMeter;
    }

    if (originalUserId) {
      const user = await this.userRepo.findById(originalUserId);
      if (user) {
        // Create in-app notification
        const NotificationService = (await import("./notification.service")).default;
        await NotificationService.createNotification(user.id, {
          title: "Meter Unlinked",
          description: `Meter ${meter.meterNumber || meter.deviceId} has been unlinked from your account`,
          category: "METER",
        }).catch((err) => {
          logger.error(`Failed to create unlink notification for user ${user.id}:`, err);
        });
      }
    }

    return updatedMeter;
  }

  static async adminLinkMeter(meterNumber: string, data: AdminLinkMeterInput) {
    const user = await this.userRepo.findById(data.userId);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const meter = await MeterRepo.findByMeterNumber(meterNumber);
    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (meter.userId) {
      throw new AppError("Meter is already linked to another account", ResponseHelper.BAD_REQUEST);
    }

    const updatedMeter = await MeterRepo.linkUser(meter.deviceId, data.userId, {
      estateId: data.estateId === "OTHER" ? undefined : data.estateId,
      houseNumber: data.houseNumber,
      estateName: data.estateId === "OTHER" ? data.estateName : undefined,
    }, meterNumber);

    if (!updatedMeter) {
      throw new AppError("Failed to link meter", ResponseHelper.INTERNAL_SERVER_ERROR);
    }

    await NotificationService.createNotification(user.id, {
      title: "Meter Linked",
      description: `Meter ${meter.meterNumber || meter.deviceId} has been successfully linked to your account by an administrator`,
      category: "METER",
    }).catch(err => logger.error(`Admin Link: Failed to create in-app notification: ${err.message}`));

    EmailService.sendEmail({
      to: user.email,
      subject: "Meter Linked Successfully",
      template: "meter-link-status-update",
      context: {
        firstName: user.firstName || "User",
        meterNumber: meter.meterNumber || meter.deviceId,
        status: LinkRequestStatus.APPROVED,
        reason: "Admin linked meter directly",
        approved: true,
      },
    }).catch(err => logger.error(`Admin Link: Failed to send email: ${err.message}`));

    return updatedMeter;
  }

  static async handleValveStatusUpdate(deviceId: string, valveStatus: boolean) {
    try {
      const meter = await MeterRepo.findByDeviceId(deviceId);
      if (!meter) {
        logger.warn(`Valve status report for unknown meter: ${deviceId}`);
        return;
      }

      await MeterRepo.updateValveStatus(deviceId, valveStatus);
      logger.info(`Valve status updated for meter ${deviceId}: ${valveStatus ? "OPEN" : "CLOSED"}`);
    } catch (error: any) {
      logger.error(`Failed to handle valve status update for ${deviceId}:`, error);
    }
  }

  static async toggleValve(meterId: string, userId: string) {
    const result = await MeterRepo.findById(meterId);
    if (!result) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const meter = result.meters;

    if (meter.userId !== userId) {
      throw new AppError("You do not have permission to control this meter", ResponseHelper.FORBIDDEN);
    }

    const newValveStatus = !meter.valveStatus;

    mqttService.sendCommand(meter.deviceId, {
      commandId: `valve_control_${Date.now()}`,
      action: "VALVE_CONTROL",
      params: {
        valveStatus: newValveStatus ? 1 : 0,
      },
    });

    const updatedMeter = await MeterRepo.updateValveStatus(meter.deviceId, newValveStatus);

    return updatedMeter;
  }

  static async getMeterDetails(meterId: string, userId: string) {
    const result = await MeterRepo.findById(meterId);
    if (!result) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const meter = result.meters;

    if (meter.userId !== userId) {
      throw new AppError("You do not have permission to view this meter", ResponseHelper.FORBIDDEN);
    }

    const { meters, estate, users } = result;
    if (users) {
      const { passwordHash, ...rest } = users
      return { meter: meters, estate, user: rest };
    }
    return { meter: meters, estate };
  }

  static async closeValve(deviceId: string) {
    try {
      mqttService.sendCommand(deviceId, {
        commandId: `valve_close_${Date.now()}`,
        action: "VALVE_CONTROL",
        params: {
          valveStatus: 0,
        },
      });

      await MeterRepo.updateValveStatus(deviceId, false);
      logger.info(`Valve automatically closed for meter ${deviceId} due to zero balance`);
    } catch (error: any) {
      logger.error(`Failed to automatically close valve for ${deviceId}:`, error);
    }
  }

  static async getMeterStats(meterId: string, userId: string) {
    const result = await MeterRepo.findById(meterId);
    if (!result) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const meter = result.meters;

    if (meter.userId !== userId) {
      throw new AppError("You do not have permission to view stats for this meter", ResponseHelper.FORBIDDEN);
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [usedToday, usedThisWeek, usedLastWeek, weeklyGraphData] = await Promise.all([
      this.auditRepo.getUsageStats(meterId, startOfToday, now),
      this.auditRepo.getUsageStats(meterId, sevenDaysAgo, now),
      this.auditRepo.getUsageStats(meterId, fourteenDaysAgo, sevenDaysAgo),
      this.auditRepo.getDailyUsageBreakdown(meterId, 7),
    ]);

    let weeklyChangePercentage = 0;
    if (usedLastWeek > 0) {
      weeklyChangePercentage = ((usedThisWeek - usedLastWeek) / usedLastWeek) * 100;
    } else if (usedThisWeek > 0) {
      weeklyChangePercentage = 100;
    }

    return {
      remainingKg: parseFloat(meter.availableGasKg || "0"),
      usedToday,
      usedThisWeek,
      weeklyChangePercentage: parseFloat(weeklyChangePercentage.toFixed(2)),
      weeklyGraphData,
    };
  }

  static async handleHeartbeat(deviceId: string) {
    try {
      const meter = await MeterRepo.findByDeviceId(deviceId);
      if (!meter) return;

      const wasOnline = meter.isOnline;
      await MeterRepo.updateConnectivity(deviceId, true);

      if (!wasOnline && meter.userId) {
        const user = await this.userRepo.findById(meter.userId);
        if (user) {
          EmailService.sendEmail({
            to: user.email,
            subject: "Meter Back Online - Abitto Energy",
            template: "meter-online",
            context: {
              firstName: user.firstName,
              meterNumber: meter.meterNumber || deviceId,
            },
          }).catch(err => logger.error(`Failed to send meter online email: ${err.message}`));

          await NotificationService.createNotification(user.id, {
            title: "Meter Online",
            description: `Your meter ${meter.meterNumber || deviceId} is now online.`,
            category: "METER",
          }).catch(err => logger.error(`Failed to create online notification: ${err.message}`));
        }
      }
    } catch (error: any) {
      logger.error(`Error handling heartbeat for ${deviceId}:`, error);
    }
  }

  static async checkConnectivity() {
    try {
      const thresholdSeconds = 20;
      const offlineMeters = await MeterRepo.getOfflineMeters(thresholdSeconds);

      if (offlineMeters.length === 0) return;

      logger.info(`Detected ${offlineMeters.length} offline meters`);

      for (const meter of offlineMeters) {
        await MeterRepo.updateConnectivity(meter.deviceId, false);

        if (meter.userId) {
          const user = await this.userRepo.findById(meter.userId);
          if (user) {
            EmailService.sendEmail({
              to: user.email,
              subject: "Meter Offline Alert - Abitto Energy",
              template: "meter-offline",
              context: {
                firstName: user.firstName,
                meterNumber: meter.meterNumber || meter.deviceId,
              },
            }).catch(err => logger.error(`Failed to send meter offline email: ${err.message}`));

            await NotificationService.createNotification(user.id, {
              title: "Meter Offline",
              description: `We haven't heard from your meter ${meter.meterNumber || meter.deviceId} in a while. It appears to be offline.`,
              category: "METER",
            }).catch(err => logger.error(`Failed to create offline notification: ${err.message}`));
          }
        }
      }
    } catch (error: any) {
      logger.error("Error checking connectivity:", error);
    }
  }
}
