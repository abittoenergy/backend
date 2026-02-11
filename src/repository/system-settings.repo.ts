import { eq } from "drizzle-orm";
import { getDb } from "../config/db";
import { systemSettings, SystemSettings, NewSystemSettings } from "../db/schema/system-settings.schema";

export class SystemSettingsRepository {

  private db = getDb();

  async getSettings(): Promise<SystemSettings> {
    const [settings] = await this.db.select().from(systemSettings).limit(1);
    if (settings) {
      return settings;
    }

    // Create default settings if not exists
    const [newSettings] = await this.db.insert(systemSettings).values({}).returning();
    return newSettings;
  }

  async updateSettings(data: Partial<NewSystemSettings>): Promise<SystemSettings | undefined> {
    const currentSettings = await this.getSettings();

    const [updatedSettings] = await this.db
      .update(systemSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(systemSettings.id, currentSettings.id))
      .returning();

    return updatedSettings;
  }
}
