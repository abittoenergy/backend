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
      // Check if this is a refill status update
      if (data.data.refillStatus) {
        handleRefillStatusUpdate(data);
      }

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

/**
 * Handle refill status updates from meters
 */
function handleRefillStatusUpdate(data: DeviceTelemetry): void {
  const { deviceId, data: telemetryData } = data;
  const { refillStatus, commandId, kgDispensed } = telemetryData;

  logger.info("Received refill status update", {
    deviceId,
    refillStatus,
    commandId,
  });

  // Handle different refill statuses
  switch (refillStatus) {
    case "STARTED":
      if (commandId) {
        GasPurchaseService.handleRefillStarted(deviceId, commandId as string);
      }
      break;

    case "COMPLETED":
      if (commandId && kgDispensed !== undefined) {
        GasPurchaseService.handleRefillCompleted(
          deviceId,
          commandId as string,
          Number(kgDispensed)
        );
      }
      break;

    case "FAILED":
      logger.warn("Refill failed", {
        deviceId,
        commandId,
        reason: telemetryData.failureReason,
      });
      // TODO: Mark purchase as failed if needed
      break;

    default:
      logger.warn("Unknown refill status", {
        deviceId,
        refillStatus,
      });
  }
}
