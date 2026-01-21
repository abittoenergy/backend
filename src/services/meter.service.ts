import { MeterRepo } from "../repository/meter";
import { MeterStatus } from "../db/schema/meters.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";

export default class MeterService {
  /**
   * Retrieves meter info by device ID.
   * If the meter does not exist, it is created with UNREGISTERED status.
   */
  static async getMeterStatus(deviceId: string) {
    let meter = await MeterRepo.findByDeviceId(deviceId);

    if (!meter) {
      meter = await MeterRepo.create({
        deviceId,
        status: MeterStatus.UNREGISTERED,
      });
    }

    return meter;
  }

  static async registerMeterToUser(deviceId: string, userId: string) {
    const meter = await MeterRepo.findByDeviceId(deviceId);
    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (meter.userId) {
      throw new AppError("Meter already linked to a user", ResponseHelper.BAD_REQUEST);
    }

    return await MeterRepo.linkUser(deviceId, userId);
  }

  static async updateValveStatus(deviceId: string, status: boolean) {
    const meter = await MeterRepo.findByDeviceId(deviceId);
    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    return await MeterRepo.updateValveStatus(deviceId, status);
  }
}
