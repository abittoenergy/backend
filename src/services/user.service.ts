import { UpdateProfileOnboardingInput } from "../validators/auth.validator";
import { UserRepository } from "../repository/user";
import { EstateRepo } from "../repository/estate";
import { GasUsageAuditRepository } from "../repository/gas-usage-audit.repo";
import { TransactionRepository } from "../repository/transaction";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import { enqueueDVAGeneration } from "../queues/dva-generation.queue";

export default class UserService {
  private static userRepository = new UserRepository();
  private static estateRepo = new EstateRepo();
  private static auditRepo = new GasUsageAuditRepository();
  private static transactionRepo = new TransactionRepository();

  static async updateProfileOnboarding(userId: string, data: UpdateProfileOnboardingInput) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    let estateId: string | null = null;
    let onboardingEstateName: string | null = null;

    if (data.estateId === "OTHER") {
      onboardingEstateName = data.estateName || null;
    } else {
      const estate = await this.estateRepo.findById(data.estateId);
      if (!estate) {
        throw new AppError("Selected estate not found", ResponseHelper.BAD_REQUEST);
      }
      estateId = data.estateId;
    }

    const updatedUser = await this.userRepository.update(userId, {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      gender: data.gender,
      nin: data.nin,
      estateId: estateId,
      houseNumber: data.houseNumber,
      onboardingEstateName: onboardingEstateName,
      onboardingCompleted: true,
      updatedAt: new Date(),
    });

    if (user.emailVerified) {
      await enqueueDVAGeneration(userId);
    }

    return updatedUser;
  }

  static async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  static async adminGetUsers(query: {
    page?: string;
    limit?: string;
    search?: string;
    isActive?: string;
  }) {
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "20", 10);
    const isActive = query.isActive === "true" ? true : query.isActive === "false" ? false : undefined;

    const [stats, { results, total }] = await Promise.all([
      this.userRepository.getGlobalStats(),
      this.userRepository.findAllAdmin({
        page,
        limit,
        search: query.search,
        isActive,
      }),
    ]);

    const percentageWithoutMeters = stats.totalUsers > 0
      ? ((stats.usersWithoutMeters / stats.totalUsers) * 100).toFixed(2)
      : "0";

    return {
      stats: {
        ...stats,
        percentageWithoutMeters: parseFloat(percentageWithoutMeters),
      },
      users: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserActivities(userId: string) {
    const [transactions, audits] = await Promise.all([
      this.transactionRepo.findByUserId(userId),
      this.auditRepo.findByUserId(userId, 20),
    ]);

    const activities = [
      ...transactions.map((t) => ({
        id: t.id,
        type: "TRANSACTION",
        activityType: t.type,
        amount: t.amount,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        metadata: t.metadata,
      })),
      ...audits.map((a) => ({
        id: a.id,
        type: "GAS_USAGE",
        kgUsed: a.kgUsed,
        deviceId: a.deviceId,
        previousBalance: a.previousBalance,
        newBalance: a.newBalance,
        createdAt: a.createdAt,
        metadata: a.metadata,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return activities.slice(0, 50); 
  }
}