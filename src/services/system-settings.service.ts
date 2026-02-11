import { SystemSettingsRepository } from "../repository/system-settings.repo";
import { SystemSettings, NewSystemSettings, NotifyAdminType } from "../db/schema/system-settings.schema";
import { UserRepository } from "../repository/user";
import { Role } from "../db/schema/users.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import { inArray } from "drizzle-orm";
import { users } from "../db/schema/users.schema";

export class SystemSettingsService {
  private static settingsRepo = new SystemSettingsRepository();
  private static userRepo = new UserRepository();

  static async getSettings(): Promise<SystemSettings> {
    return await this.settingsRepo.getSettings();
  }

  static async updateSettings(data: Partial<NewSystemSettings>): Promise<SystemSettings> {
    try {
      // Validate admin IDs if notifyAdminType is SPECIFIC
      if (data.notifyAdminType === NotifyAdminType.SPECIFIC && data.specificAdminIds && data.specificAdminIds.length > 0) {
        await this.validateAdminIds(data.specificAdminIds);
      }

      const updated = await this.settingsRepo.updateSettings(data);
      if (!updated) {
        throw new AppError("Failed to update system settings", ResponseHelper.INTERNAL_SERVER_ERROR);
      }
      return updated;
    } catch (error) {
      throw error;
    }
  }

  private static async validateAdminIds(adminIds: string[]): Promise<void> {
    const db = this.userRepo.client;

    // Fetch all users with the provided IDs
    const foundUsers = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(inArray(users.id, adminIds));

    // Check if all IDs were found
    if (foundUsers.length !== adminIds.length) {
      const foundIds = foundUsers.map(u => u.id);
      const missingIds = adminIds.filter(id => !foundIds.includes(id));
      throw new AppError(
        `Invalid admin IDs: ${missingIds.join(", ")}`,
        ResponseHelper.BAD_REQUEST
      );
    }

    // Check if all found users are admins
    const nonAdminUsers = foundUsers.filter(
      u => u.role !== Role.ADMIN && u.role !== Role.SUPER_ADMIN
    );

    if (nonAdminUsers.length > 0) {
      const nonAdminIds = nonAdminUsers.map(u => u.id);
      throw new AppError(
        `The following user IDs are not admins: ${nonAdminIds.join(", ")}`,
        ResponseHelper.BAD_REQUEST
      );
    }
  }
}
