import { UserRepository } from "../repository/user";
import { TransactionRepository } from "../repository/transaction";
import { MeterRepo } from "../repository/meter";
import { GasPurchaseRepository } from "../repository/gas-purchase.repo";
import { GasUsageAuditRepository } from "../repository/gas-usage-audit.repo";

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
}
