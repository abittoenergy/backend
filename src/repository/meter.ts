import { eq } from "drizzle-orm";
import db from "../config/db";
import { meters, Meter, NewMeter, MeterStatus } from "../db/schema/meters.schema";

export const MeterRepo = {
  async findByDeviceId(deviceId: string): Promise<Meter | undefined> {
    const [result] = await db.select().from(meters).where(eq(meters.deviceId, deviceId)).limit(1);
    return result;
  },

  async findById(id: string): Promise<Meter | undefined> {
    const [result] = await db.select().from(meters).where(eq(meters.id, id)).limit(1);
    return result;
  },

  async create(data: NewMeter): Promise<Meter> {
    const [result] = await db.insert(meters).values(data).returning();
    return result;
  },

  async updateStatus(deviceId: string, status: MeterStatus): Promise<Meter | undefined> {
    const [result] = await db
      .update(meters)
      .set({ status, updatedAt: new Date() })
      .where(eq(meters.deviceId, deviceId))
      .returning();
    return result;
  },

  async updateValveStatus(deviceId: string, status: boolean): Promise<Meter | undefined> {
    const [result] = await db
      .update(meters)
      .set({ valveStatus: status, updatedAt: new Date() })
      .where(eq(meters.deviceId, deviceId))
      .returning();
    return result;
  },

  async linkUser(deviceId: string, userId: string): Promise<Meter | undefined> {
    const [result] = await db
      .update(meters)
      .set({ userId, status: MeterStatus.REGISTERED, updatedAt: new Date() })
      .where(eq(meters.deviceId, deviceId))
      .returning();
    return result;
  },
};
