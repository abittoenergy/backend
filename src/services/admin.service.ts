import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import db from "../config/db";
import { users } from "../db/schema/users.schema";
import { gasPurchases } from "../db/schema/gas-purchases.schema";
import { gasTransfers } from "../db/schema/gas-transfers.schema";
import { meterLinkRequests } from "../db/schema/meter-link-requests.schema";
import { meters } from "../db/schema/meters.schema";
import { UserRepository } from "../repository/user";
import { TransactionRepository } from "../repository/transaction";
import { MeterRepo } from "../repository/meter";
import { GasPurchaseRepository } from "../repository/gas-purchase.repo";
import { GasUsageAuditRepository } from "../repository/gas-usage-audit.repo";

export interface PlatformActivity {
  id: string;
  type: "USER_REGISTRATION" | "GAS_PURCHASE" | "GAS_TRANSFER" | "METER_LINK_REQUEST";
  title: string;
  description: string;
  status?: string;
  userId?: string;
  userName?: string;
  createdAt: Date;
  metadata?: any;
}

export class AdminService {
  private static userRepo = new UserRepository();
  private static transactionRepo = new TransactionRepository();
  private static gasPurchaseRepo = new GasPurchaseRepository();
  private static gasUsageAuditRepo = new GasUsageAuditRepository();

  static async getPlatformStats() {
    const [userStats, transactionStats, meterStats, gasSoldStats, usageStats] = await Promise.all([
      this.userRepo.getGlobalStats(),
      this.transactionRepo.getAdminStats(),
      MeterRepo.getStats(),
      this.gasPurchaseRepo.getGlobalGasSoldStats(),
      this.gasUsageAuditRepo.getGlobalUsageStats(7),
    ]);

    return {
      users: {
        total: userStats.totalUsers,
        increasePastMonth: userStats.userIncreasePastMonth,
        joinedToday: userStats.joinedToday,
        activeToday: userStats.activeToday,
      },
      revenue: {
        total: transactionStats.totalRevenue.toString(),
        today: transactionStats.totalRevenueToday.toString(),
        processedLast24hrs: transactionStats.processedLast24hrs.toString(),
      },
      meters: {
        total: meterStats.total,
        active: meterStats.active,
        registered: meterStats.registered,
        unregistered: meterStats.unregistered,
        linked: meterStats.linked,
      },
      gasSold: {
        totalKg: gasSoldStats.totalGasSoldKg.toString(),
        todayKg: gasSoldStats.totalGasSoldKgToday.toString(),
      },
      usage: {
        totalKgThisWeek: usageStats.totalKgUsedThisWeek.toString(),
        totalKgUsedToday: usageStats.totalKgUsedToday.toString(),
        percentageChangePastWeek: usageStats.percentageChangeUsage,
        chart: usageStats.usageChart,
      }
    };
  }

  static async getRecentActivity(limit: number = 10): Promise<PlatformActivity[]> {
    const recipientAlias = alias(users, "recipient");

    const [recentUsers, recentPurchases, recentTransfers, recentRequests] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)).limit(limit),
      db.select({
        purchase: gasPurchases,
        user: users,
        meter: meters
      })
        .from(gasPurchases)
        .innerJoin(users, eq(gasPurchases.userId, users.id))
        .innerJoin(meters, eq(gasPurchases.meterId, meters.id))
        .orderBy(desc(gasPurchases.createdAt))
        .limit(limit),
      db.select({
        transfer: gasTransfers,
        sender: users,
        recipient: recipientAlias
      })
        .from(gasTransfers)
        .innerJoin(users, eq(gasTransfers.senderId, users.id))
        .innerJoin(recipientAlias, eq(gasTransfers.recipientId, recipientAlias.id))
        .orderBy(desc(gasTransfers.createdAt))
        .limit(limit),
      db.select({
        request: meterLinkRequests,
        user: users,
        meter: meters
      })
        .from(meterLinkRequests)
        .innerJoin(users, eq(meterLinkRequests.userId, users.id))
        .innerJoin(meters, eq(meterLinkRequests.meterId, meters.id))
        .orderBy(desc(meterLinkRequests.createdAt))
        .limit(limit),
    ]);

    const activities: PlatformActivity[] = [
      ...recentUsers.map(u => ({
        id: u.id,
        type: "USER_REGISTRATION" as const,
        title: "New User Registration",
        description: `${u.firstName} ${u.lastName} joined the platform.`,
        userId: u.id,
        userName: `${u.firstName} ${u.lastName}`,
        createdAt: u.createdAt,
      })),
      ...recentPurchases.map(p => ({
        id: p.purchase.id,
        type: "GAS_PURCHASE" as const,
        title: "Gas Refill",
        description: `${p.user.firstName} ${p.user.lastName} purchased ${p.purchase.kgPurchased}kg for Meter ${p.meter.meterNumber}.`,
        status: p.purchase.status,
        userId: p.user.id,
        userName: `${p.user.firstName} ${p.user.lastName}`,
        createdAt: p.purchase.createdAt,
      })),
      ...recentTransfers.map(t => {
        const isSelf = t.transfer.senderId === t.transfer.recipientId;
        const description = isSelf
          ? `${t.sender.firstName} ${t.sender.lastName} moved ${t.transfer.amountKg}kg gas between their meters.`
          : `${t.sender.firstName} ${t.sender.lastName} sent ${t.transfer.amountKg}kg gas to ${t.recipient.firstName} ${t.recipient.lastName}.`;

        return {
          id: t.transfer.id,
          type: "GAS_TRANSFER" as const,
          title: "Gas Gift",
          description,
          userId: t.sender.id,
          userName: `${t.sender.firstName} ${t.sender.lastName}`,
          createdAt: t.transfer.createdAt,
        };
      }),
      ...recentRequests.map(r => ({
        id: r.request.id,
        type: "METER_LINK_REQUEST" as const,
        title: "Meter Link Request",
        description: `${r.user.firstName} ${r.user.lastName} requested to link Meter ${r.meter.meterNumber}.`,
        status: r.request.status,
        userId: r.user.id,
        userName: `${r.user.firstName} ${r.user.lastName}`,
        createdAt: r.request.createdAt,
      })),
    ];

    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }
}
