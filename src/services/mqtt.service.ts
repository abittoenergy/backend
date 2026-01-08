import { MqttClient } from "mqtt";
import { getMqttClient } from "../config/mqtt";
import logger from "../config/logger";

// Device telemetry data interface
export interface DeviceTelemetry {
    deviceId: string;
    timestamp: number;
    data: {
        voltage?: number;
        current?: number;
        power?: number;
        energy?: number;
        temperature?: number;
        status?: string;
        [key: string]: unknown;
    };
}

// Device command interface
export interface DeviceCommand {
    commandId: string;
    action: string;
    params?: Record<string, unknown>;
    timestamp: number;
}

class MqttService {
    private topicPrefix = "abittoenergy";

    // Subscribe to device telemetry data
    subscribeToDeviceData(deviceId: string, handler: (data: DeviceTelemetry) => void): void {
        const client = getMqttClient();
        if (!client) {
            logger.error("MQTT client not connected");
            return;
        }

        const topic = `${this.topicPrefix}/device/${deviceId}/data`;

        client.subscribe(topic, (err) => {
            if (err) {
                logger.error(`Failed to subscribe to ${topic}:`, err);
                return;
            }
            logger.info(`Subscribed to device data: ${topic}`);
        });

        client.on("message", (receivedTopic, message) => {
            if (receivedTopic === topic) {
                try {
                    const data = JSON.parse(message.toString()) as DeviceTelemetry;
                    handler(data);
                } catch (err) {
                    logger.error(`Failed to parse device message from ${topic}:`, err);
                }
            }
        });
    }

    // Subscribe to all device data using wildcard
    subscribeToAllDevices(handler: (data: DeviceTelemetry) => void): void {
        const client = getMqttClient();
        if (!client) {
            logger.error("MQTT client not connected");
            return;
        }

        const topic = `${this.topicPrefix}/device/+/data`;

        client.subscribe(topic, (err) => {
            if (err) {
                logger.error(`Failed to subscribe to ${topic}:`, err);
                return;
            }
            logger.info(`Subscribed to all devices: ${topic}`);
        });

        client.on("message", (receivedTopic, message) => {
            if (receivedTopic.match(new RegExp(`^${this.topicPrefix}/device/.+/data$`))) {
                try {
                    const data = JSON.parse(message.toString()) as DeviceTelemetry;
                    handler(data);
                } catch (err) {
                    logger.error(`Failed to parse device message:`, err);
                }
            }
        });
    }

    // Send command to a specific device
    sendCommand(deviceId: string, command: Omit<DeviceCommand, "timestamp">): void {
        const client = getMqttClient();
        if (!client) {
            logger.error("MQTT client not connected");
            return;
        }

        const topic = `${this.topicPrefix}/device/${deviceId}/command`;
        const payload: DeviceCommand = {
            ...command,
            timestamp: Date.now(),
        };

        client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
            if (err) {
                logger.error(`Failed to send command to ${deviceId}:`, err);
            } else {
                logger.info(`Command sent to ${deviceId}: ${command.action}`);
            }
        });
    }

    // Publish arbitrary message to a topic
    publish(topic: string, message: unknown, qos: 0 | 1 | 2 = 1): void {
        const client = getMqttClient();
        if (!client) {
            logger.error("MQTT client not connected");
            return;
        }

        const payload = typeof message === "string" ? message : JSON.stringify(message);

        client.publish(topic, payload, { qos }, (err) => {
            if (err) {
                logger.error(`Failed to publish to ${topic}:`, err);
            }
        });
    }
}

export const mqttService = new MqttService();
export default mqttService;
