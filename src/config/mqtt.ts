import mqtt, { MqttClient, IClientOptions, MqttProtocol } from "mqtt";
import envConfig from "./env";
import logger from "./logger";

let client: MqttClient | null = null;

const mqttOptions: IClientOptions = {
    clientId: envConfig.mqtt.clientId,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 5000,
    protocol: 'mqtts',
    port: 8883
};

if (envConfig.mqtt.username) {
    mqttOptions.username = envConfig.mqtt.username;
}
if (envConfig.mqtt.password) {
    mqttOptions.password = envConfig.mqtt.password;
}
if (envConfig.mqtt.protocol) {
    mqttOptions.protocol = envConfig.mqtt.protocol as MqttProtocol;
}
if (envConfig.mqtt.port) {
    mqttOptions.port = Number(envConfig.mqtt.port);
}
export function connectMqtt(): MqttClient {
    if (client) {
        return client;
    }

    let connectUrl = envConfig.mqtt.brokerUrl;
    if (!connectUrl.includes("://")) {
        // If it's just a hostname, prepend the protocol
        const protocol = envConfig.mqtt.protocol || "mqtts";
        connectUrl = `${protocol}://${connectUrl}`;
    }

    logger.info(`Connecting to MQTT broker: ${connectUrl}`);

    client = mqtt.connect(connectUrl, mqttOptions);


    client.on("connect", () => {
        logger.info("MQTT client connected successfully");
    });

    client.on("reconnect", () => {
        logger.info("MQTT client reconnecting...");
    });

    client.on("error", (err) => {
        logger.error("MQTT client error:", err);
    });

    client.on("close", () => {
        logger.info("MQTT client disconnected");
    });

    return client;
}

export function getMqttClient(): MqttClient | null {
    return client;
}

export function disconnectMqtt(): void {
    if (client) {
        client.end();
        client = null;
        logger.info("MQTT client closed");
    }
}

export default { connectMqtt, getMqttClient, disconnectMqtt };
