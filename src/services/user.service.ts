import { UpdateProfileOnboardingInput } from "../validators/auth.validator";
import { UserRepository } from "../repository/user";
import { EstateRepo } from "../repository/estate";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import { enqueueDVAGeneration } from "../queues/dva-generation.queue";

export default class UserService {
  private static userRepository = new UserRepository();
  private static estateRepo = new EstateRepo();

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
}