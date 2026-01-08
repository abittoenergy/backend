/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
process.on("uncaughtException", (e) => {
    console.error("Uncaught:", e);
    process.exit(1);
});
process.on("unhandledRejection", (e) => {
    console.error("Unhandled:", e);
    process.exit(1);
});

import dotenv from "dotenv";
dotenv.config();
import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import expressFileUpload from "express-fileupload";
import { rateLimit } from "express-rate-limit";

import globalErrorHandler from "./controllers/error.controller";
import logger from "./config/logger";
import DataHelpers from "./utils/helpers/data.helpers";
import AppRouter from "./routes/app.routes";
import AppError from "./utils/appError";
import "./config/db";
import "./config/redis";
import { connectMqtt } from "./config/mqtt";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    message: "Too many requests from this IP, please try again later",
});

type ReqWithMeta = ExpressRequest & {
    clientIp?: string;
    reqId?: string;
};

const app = express();
app.set("json replacer", (_key: any, value: any) => (typeof value === "bigint" ? value.toString() : value));
app.use(
    express.json({
        verify: (req: any, res, buf) => {
            if (req.originalUrl?.startsWith("/api/v1/webhooks")) {
                req.rawBody = Buffer.from(buf);
            }
        },
    })
);

app.set("trust proxy", true);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "100mb" }));
app.use(limiter);
app.use(cors());
app.use(helmet());
app.use(expressFileUpload({ createParentPath: true, useTempFiles: true }));

app.use((req: ReqWithMeta, res: ExpressResponse, next: NextFunction) => {
    const reqId = DataHelpers.generateReqId();

    req.reqId = reqId;
    res.locals.reqId = reqId;

    const fwd = req.headers["x-forwarded-for"];
    const first = Array.isArray(fwd) ? fwd[0] : fwd;
    const base = first ?? req.ip ?? "";
    const clientIp = base.split(",")[0].trim();

    req.clientIp = clientIp;

    next();
});

app.get("/", (_req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).json({
        status: "ok",
        service: "Abittoenergy API",
        environment: process.env.NODE_ENV || "development",
    });
});

app.use("/api", AppRouter);

app.all("*", (req: ExpressRequest, _res: ExpressResponse, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

const port = process.env.PORT || 8000;
app.listen(port, () => {
    logger.info(`Abittoenergy API running on port: ${port}`);

    // Initialize MQTT connection for IoT device communication
    connectMqtt();
});
