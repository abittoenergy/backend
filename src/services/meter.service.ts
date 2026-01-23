import { MeterRepo } from "../repository/meter";
import { MeterStatus } from "../db/schema/meters.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import DataHelper from "../utils/helpers/data.helpers";

export default class MeterService {

  static async getMeterStatus(deviceId: string) {
    let meter = await MeterRepo.findByDeviceId(deviceId);

    if (!meter) {
      throw new AppError("Meter not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    return meter;
  }

  static async registerMeter(deviceId: string) {

    // check device id is already registered
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
      meterNumber: "AB-" + uniqueMeterNumber,
      status: MeterStatus.REGISTERED,
    });
  }
}
