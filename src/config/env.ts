const toNumber = (v: any, d: number) => (v == null || v === "" ? d : Number(v));

function parseDbUrl(dbUrl: string) {
    try {
        const u = new URL(dbUrl);
        const host = u.hostname;
        const port = toNumber(u.port || 5432, 5432);
        const user = decodeURIComponent(u.username || "");
        const password = decodeURIComponent(u.password || "");
        const name = (u.pathname || "").replace(/^\//, "");
        const sslMode = u.searchParams.get("sslmode");
        const isProd = process.env.NODE_ENV === "production";
        const ssl = process.env.DB_SSL === "true" || sslMode === "require" || (isProd && sslMode !== "disable");

        return { url: dbUrl, host, port, user, password, name, ssl };
    } catch {
        return null;
    }
}

const DB_URL = process.env.DB_URL || process.env.DATABASE_URL;

const parsed = DB_URL ? parseDbUrl(DB_URL) : null;

const envConfig = {
    baseUrl: process.env.BASE_URL || "http://localhost:5012",

    encryption: {
        key: process.env.ENCRYPTION_KEY || "db55ba87fed297ec4dbed7aaa9574d180e90e055cb41033429bdc323c01d59db",
    },

    env: process.env.NODE_ENV || "development",

    jwt: {
        secret: process.env.JWT_SECRET || "789",
        expiresIn: process.env.JWT_EXPIRES_IN || "30d",
        issuer: process.env.JWT_ISSUER || "abittoenergy",
        audience: process.env.JWT_AUDIENCE || "abittoenergy-users",
    },
    bcryptSaltRounds: 3,

    db: {
        url: parsed?.url,
        host: parsed?.host || process.env.DB_HOST || "localhost",
        port: parsed?.port ?? toNumber(process.env.DB_PORT, 5432),
        name: parsed?.name || process.env.DB_NAME || "abittoenergy",
        user: parsed?.user || process.env.DB_USER || "postgres",
        password: parsed?.password || process.env.DB_PASSWORD || "postgres",
        ssl: process.env.DB_SSL === "true" || (parsed?.ssl ?? false),
        pool: {
            min: toNumber(process.env.DB_POOL_MIN, 2),
            max: toNumber(process.env.DB_POOL_MAX, 10),
            idleTimeoutMillis: toNumber(process.env.DB_IDLE_TIMEOUT_MS, 10000),
        },
    },

    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        clientId: process.env.MQTT_CLIENT_ID || "abittoenergy-backend",
        protocol: process.env.MQTT_PROTOCOL || "mqtts",
        port: process.env.MQTT_PORT || 8883,
    },
    redis: {
        url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
        telegramTokenTtl: toNumber(process.env.TELEGRAM_TOKEN_TTL, 900),
    },
};

export default envConfig;
