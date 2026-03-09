import mqttService, { DeviceTelemetry } from "../services/mqtt.service";
import GasPurchaseService from "../services/gas-purchase.service";
import MeterService from "../services/meter.service";
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
      // Trigger heartbeat for every message received from the device
      MeterService.handleHeartbeat(data.deviceId).catch(err =>
        logger.error(`Failed to handle heartbeat for ${data.deviceId}`, err)
      );

      // Check if this is a usage report
      if (data.data.gasUsage !== undefined) {
        GasPurchaseService.handleGasUsage(data.deviceId, Number(data.data.gasUsage));
      }

      // Check if this is a balance request
      if (data.data.requestBalance === true) {
        GasPurchaseService.handleBalanceRequest(data.deviceId);
      }

      // Check if this is a valve status report
      if (data.data.valveStatus !== undefined) {
        const valveStatus = Boolean(data.data.valveStatus);
        MeterService.handleValveStatusUpdate(data.deviceId, valveStatus);
      }

      // Check for leak detection
      if (data.data.leakDetected === true) {
        MeterService.handleLeakDetected(data.deviceId).catch(err =>
          logger.error(`Failed to handle leak detection for ${data.deviceId}`, err)
        );
      }

      // Check for tamper detection
      if (data.data.tamperDetected === true) {
        MeterService.handleTamperDetected(data.deviceId).catch(err =>
          logger.error(`Failed to handle tamper detection for ${data.deviceId}`, err)
        );
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
