import mqttService, { DeviceTelemetry } from "../services/mqtt.service";
import GasPurchaseService from "../services/gas-purchase.service";
import logger from "../config/logger";

/**
 * Initialize MQTT listeners for gas purchase refill tracking
 * This subscribes to all device messages and handles refill status updates
 */
export function initializeGasPurchaseMqttListener(): void {
  logger.info("Initializing MQTT listener for gas purchase refill tracking");

  // Subscribe to all device telemetry data
  mqttService.subscribeToAllDevices((data: DeviceTelemetry) => {
    try {

      // Check if this is a usage report
      if (data.data.gasUsage !== undefined) {
        GasPurchaseService.handleGasUsage(data.deviceId, Number(data.data.gasUsage));
      }

      // Check if this is a balance request
      if (data.data.requestBalance === true) {
        GasPurchaseService.handleBalanceRequest(data.deviceId);
      }
    } catch (error: any) {
      logger.error("Error processing MQTT device data", {
        error: error.message,
        deviceId: data.deviceId,
      });
    }
  });

  logger.info("MQTT listener for gas purchase initialized successfully");
}
