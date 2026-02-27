import { MeterRepo } from "../repository/meter";
import { GasUsageAuditRepository } from "../repository/gas-usage-audit.repo";
import { redis } from "../config/redis";
import logger from "../config/logger";
import MeterService from "./meter.service";
import NotificationService from "./notification.service";
import EmailService from "./email.service";
import envConfig from "../config/env";
import { getDb } from "../config/db";

export class GasUsageAggregationService {
  private static meterRepo = MeterRepo;
  private static gasUsageAuditRepo = new GasUsageAuditRepository();

  private static REDIS_KEY_BALANCE_PREFIX = "meter:balance:";
  private static REDIS_KEY_USAGE_BUFFER_PREFIX = "meter:usage:buffer:";
  private static REDIS_KEY_METERS_LIST = "meters:active_usage";

  /**
   * Report gas usage from device
   * Updates balance and usage buffer in Redis
   */
  static async reportUsage(deviceId: string, kgUsed: number): Promise<void> {
    try {
      const balanceKey = `${this.REDIS_KEY_BALANCE_PREFIX}${deviceId}`;
      const bufferKey = `${this.REDIS_KEY_USAGE_BUFFER_PREFIX}${deviceId}`;

      // 1. Get or initialize balance in Redis
      let balanceStr = await redis.get(balanceKey);
      let balance: number;

      if (balanceStr === null) {
        // Sync from DB if not in Redis
        const meter = await this.meterRepo.findByDeviceId(deviceId);
        if (!meter) {
          logger.warn(`Usage reported for unknown device: ${deviceId}`);
          return;
        }
        balance = parseFloat(meter.availableGasKg || "0");
        await redis.set(balanceKey, balance.toString());
      } else {
        balance = parseFloat(balanceStr);
      }

      // 2. Prevent usage if balance is already exhausted
      if (balance <= 0) {
        logger.debug(`Device ${deviceId} reported usage with zero balance. Closing valve.`);
        await MeterService.closeValve(deviceId);
        return;
      }

      // 3. Cap usage to available balance
      const actualUsage = Math.min(kgUsed, balance);
      const newBalance = balance - actualUsage;

      // 4. Update Redis
      const multi = (await redis.getClient()).multi();
      multi.set(balanceKey, newBalance.toString());
      multi.incrbyfloat(bufferKey, actualUsage);
      multi.sadd(this.REDIS_KEY_METERS_LIST, deviceId);
      await multi.exec();

      // 5. If balance exhausted, close valve immediately
      if (newBalance <= 0) {
        await MeterService.closeValve(deviceId);
        // We'll send notification during flush or immediately? 
        // User didn't specify, but immediate notification is better for UX.
        this.notifyExhausted(deviceId).catch(err => logger.error("Failed to notify exhausted balance", err));
      }

      logger.debug(`Buffered usage for ${deviceId}: ${actualUsage}kg. New balance: ${newBalance}kg`);
    } catch (error: any) {
      logger.error("Error in reportUsage", { error: error.message, deviceId, kgUsed });
    }
  }

  /**
   * Flush all aggregated metrics to DB
   */
  static async flushAllMetrics(): Promise<void> {
    try {
      const deviceIds = await (await redis.getClient()).smembers(this.REDIS_KEY_METERS_LIST);
      if (deviceIds.length === 0) return;

      logger.info(`Starting flush of gas usage metrics for ${deviceIds.length} devices`);

      for (const deviceId of deviceIds) {
        await this.flushMeterMetrics(deviceId);
      }

      logger.info("Finished flushing gas usage metrics");
    } catch (error: any) {
      logger.error("Error in flushAllMetrics", { error: error.message });
    }
  }

  /**
   * Flush metrics for a specific meter
   */
  private static async flushMeterMetrics(deviceId: string): Promise<void> {
    const balanceKey = `${this.REDIS_KEY_BALANCE_PREFIX}${deviceId}`;
    const bufferKey = `${this.REDIS_KEY_USAGE_BUFFER_PREFIX}${deviceId}`;

    try {
      const client = await redis.getClient();

      // Atomically read and reset buffer
      const [bufferStr] = await client.multi()
        .get(bufferKey)
        .del(bufferKey)
        .srem(this.REDIS_KEY_METERS_LIST, deviceId)
        .exec() as any;

      const kgUsed = parseFloat(bufferStr?.[1] || "0");
      if (kgUsed <= 0) return;

      const meter = await this.meterRepo.findByDeviceId(deviceId);
      if (!meter) return;

      const previousBalanceInDb = parseFloat(meter.availableGasKg || "0");

      // Update DB by deducting the aggregated usage
      // We use -kgUsed because updateGasBalance adds the amount
      const newBalanceInDb = await this.meterRepo.updateGasBalance(meter.id, -kgUsed);

      // Create aggregated audit record
      await this.gasUsageAuditRepo.create({
        userId: meter.userId!,
        meterId: meter.id,
        deviceId: deviceId,
        kgUsed: kgUsed.toFixed(3),
        previousBalance: previousBalanceInDb.toFixed(3),
        newBalance: newBalanceInDb.toFixed(3),
        metadata: {
          aggregated: true,
          flushTimestamp: new Date(),
          source: "redis_buffer"
        },
      });

      logger.info(`Flushed aggregated usage for ${deviceId}: ${kgUsed}kg. New DB balance: ${newBalanceInDb}kg`);
    } catch (error: any) {
      logger.error(`Failed to flush metrics for ${deviceId}`, { error: error.message });
      // Logic to put it back into the list if failed? 
    }
  }

  private static async notifyExhausted(deviceId: string) {
    const meter = await this.meterRepo.findByDeviceId(deviceId);
    if (!meter || !meter.userId || !meter.id) return;

    await NotificationService.createNotification(meter.userId, {
      title: "Gas Balance Exhausted",
      description: `The valve on meter ${meter.meterNumber || deviceId} has been closed because your gas balance is exhausted.`,
      category: "GAS_PURCHASE",
    });

    const userRepo = new UserRepository();
    const user = await userRepo.findById(meter.userId);
    if (user?.email) {
      await EmailService.sendEmail({
        to: user.email,
        subject: "Urgent: Gas Balance Exhausted - Abitto Energy",
        template: "balance-exhausted",
        context: {
          firstName: user.firstName || "Valued Customer",
          meterNumber: meter.meterNumber || deviceId,
          dashboardUrl: `${envConfig.app.url}/dashboard`,
        },
      });
    }
  }

  /**
   * Force sync Redis balance from DB (e.g. after a purchase)
   */
  static async syncBalanceToRedis(deviceId: string, balance: number): Promise<void> {
    await redis.set(`${this.REDIS_KEY_BALANCE_PREFIX}${deviceId}`, balance.toString());
  }
}

// Circular dependency check (UserRepository)
import { UserRepository } from "../repository/user";
