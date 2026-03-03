require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');

// Configuration from environment variables
const topicPrefix = 'abittoenergy';
const LOGS_DIR = 'logs';
const protocol = process.env.MQTT_PROTOCOL || 'mqtt';
const host = process.env.MQTT_BROKER_URL || 'localhost';
const port = process.env.MQTT_PORT
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;
const clientId = process.env.MQTT_CLIENT_ID;

// Simulation parameters
const USAGE_INTERVAL = parseInt(process.env.SIMULATOR_USAGE_INTERVAL_MS) || 30000; // default 30s
const RANDOM_USAGE_MIN = parseFloat(process.env.SIMULATOR_USAGE_MIN) || 0.05;
const RANDOM_USAGE_MAX = parseFloat(process.env.SIMULATOR_USAGE_MAX) || 0.5;

/**
 * Topic format:
 * Commands (Listen): abittoenergy/device/{deviceId}/command
 * Data (Publish): abittoenergy/device/{deviceId}/data
 */
function getCommandTopic(deviceId) {
  return `${topicPrefix}/device/${deviceId}/command`;
}

function getDataTopic(deviceId) {
  return `${topicPrefix}/device/${deviceId}/data`;
}

function buildBrokerUrl() {
  // Support both full URL or separate parts
  if (host.includes('://')) return host;
  return `${protocol}://${host}:${port}`;
}

function ensureLogsDir() {
  const dir = path.join(process.cwd(), LOGS_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLogFilePath(deviceId) {
  const dir = ensureLogsDir();
  const name = deviceId ? `simulator-${deviceId}.log` : 'simulator.log';
  return path.join(dir, name);
}

function writeLog(logFilePath, ...lines) {
  const text = lines.join('\n') + '\n';
  fs.appendFileSync(logFilePath, text);
}

function main() {
  const deviceId = process.argv.includes('--device')
    ? process.argv[process.argv.indexOf('--device') + 1]
    : process.env.DEVICE_ID;

  if (!deviceId) {
    console.error('ERROR: DEVICE_ID is required via .env or --device flag.');
    process.exit(1);
  }

  const commandTopic = getCommandTopic(deviceId);
  const dataTopic = getDataTopic(deviceId);
  const brokerUrl = buildBrokerUrl();
  const logFilePath = getLogFilePath(deviceId);

  const banner = [
    'Abitto Energy IoT Simulator',
    '==========================',
    `Started:   ${new Date().toISOString()}`,
    `Broker:    ${brokerUrl}`,
    `Device:    ${deviceId}`,
    `Listening: ${commandTopic}`,
    `Reporting: ${dataTopic}`,
    ''
  ].join('\n');
  console.log(banner);
  writeLog(logFilePath, banner);

  const log = (...lines) => {
    const text = `[${new Date().toISOString()}] ` + lines.join('\n');
    console.log(text);
    writeLog(logFilePath, text);
  };

const client = mqtt.connect(brokerUrl, {
  clientId: `${clientId || 'abitto-sim'}-${Math.random().toString(16).slice(2, 8)}`,
  username: username || undefined,
  password: password || undefined,
  clean: true,
  reconnectPeriod: 5000,
  protocol: protocol, 
  port: port ? parseInt(port) : 1883, 
  connectTimeout: 30 * 1000,
  rejectUnauthorized: protocol === 'mqtts' 
});


  client.on('connect', () => {
    log('✓ Connected to MQTT broker');

    // 1. Subscribe to commands
    client.subscribe(commandTopic, { qos: 1 }, (err) => {
      if (err) {
        log(`Subscribe error: ${err.message}`);
        process.exit(1);
      }
      log(`Subscribed to commands: ${commandTopic}`);
    });

    // 2. Request initial balance
    requestBalance();

    // 3. Start periodic usage simulation
    setInterval(reportRandomUsage, USAGE_INTERVAL);

    reportLeakDetected()
  });

  client.on('message', (receivedTopic, message) => {
    const payload = message.toString();
    log(`RX: ${receivedTopic}\n  Payload: ${payload}`);

    try {
      const parsed = JSON.parse(payload);
      if (parsed.action === 'PURCHASE_CONFIRMED') {
        log(`GOLD: Received purchase confirmation!`);
        log(`  Purchased: ${parsed.params.kgPurchased}kg`);
        log(`  New Total: ${parsed.params.availableGasKg}kg`);
      } else if (parsed.action === 'BALANCE_RESPONSE') {
        log(`INFO: Balance received: ${parsed.params.availableGasKg}kg`);
      }
    } catch (e) {
      log('  (Non-JSON payload received)');
    }
  });

  client.on('error', (err) => {
    log(`MQTT Error: ${err.message}`);
  });

  client.on('close', () => {
    log('Disconnected from broker');
  });

  // --- Simulation Actions ---

  function requestBalance() {
    const payload = {
      deviceId,
      data: { requestBalance: true },
      timestamp: Date.now()
    };
    client.publish(dataTopic, JSON.stringify(payload), { qos: 1 });
    log(`TX: Requesting balance query...`);
  }

  function reportRandomUsage() {
    const usage = (Math.random() * (RANDOM_USAGE_MAX - RANDOM_USAGE_MIN) + RANDOM_USAGE_MIN).toFixed(3);
    const payload = {
      deviceId,
      data: { gasUsage: parseFloat(usage) },
      timestamp: Date.now()
    };
    client.publish(dataTopic, JSON.stringify(payload), { qos: 1 });
    log(`TX: Simulated usage report: ${usage}kg`);
  }

  function reportLeakDetected() {
    const payload = {
      deviceId,
      data: { leakDetected: true },
      timestamp: Date.now()
    };
    client.publish(dataTopic, JSON.stringify(payload), { qos: 1 });
    log(`TX: Simulated leak detected report`);
  }
}

main();
