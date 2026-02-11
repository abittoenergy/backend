import express from "express";
import MeterController from "../controllers/meter.controller";
import { meterRateLimiter } from "../middlewares/rate-limiting";
import AuthMiddleware from "../middlewares/auth";

const MeterRouter = express.Router();

// IOT
MeterRouter.post("/register", meterRateLimiter, MeterController.registerMeter);

// (ADMIN)
MeterRouter.get("/link-requests", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.listMeterLinkRequests);

// METER (IOT)
MeterRouter.get("/:deviceId", meterRateLimiter, MeterController.getMeterByDeviceId);
MeterRouter.get("/registration/:meterNumber", meterRateLimiter, MeterController.checkMeterRegistration);

// USER
MeterRouter.get("/", meterRateLimiter, AuthMiddleware.protect, MeterController.getUsersMeters);
MeterRouter.get("/link/:meterNumber", meterRateLimiter, AuthMiddleware.protect, MeterController.checkMeterRegistration);
MeterRouter.post("/link/:meterNumber", meterRateLimiter, AuthMiddleware.protect, MeterController.requestMeterLink);

// ADMIN
MeterRouter.patch("/link-requests/:id", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.processMeterLinkRequest);


export default MeterRouter;
