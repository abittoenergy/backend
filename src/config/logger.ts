import { createLogger, format, transports } from "winston";
import flatted from "flatted";
const { combine, splat, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message} `;
    if (metadata) {
        if (level.toUpperCase() === "ERROR") {
            msg += flatted.stringify(metadata);
        } else {
            msg += JSON.stringify(metadata);
        }
    }
    return msg;
});

const logger = createLogger({
    level: "debug",
    format: combine(splat(), timestamp(), myFormat),
    transports: [new transports.Console({ level: "debug" })],
});

export default logger;
