import express from "express";
import MeterController from "../controllers/meter.controller";
import { meterRateLimiter } from "../middlewares/rate-limiting";
import AuthMiddleware from "../middlewares/auth";

const MeterRouter = express.Router();

MeterRouter.post("/register", meterRateLimiter, MeterController.registerMeter);
MeterRouter.get("/:deviceId", meterRateLimiter, MeterController.getMeterByDeviceId);
MeterRouter.get("/registration/:meterNumber", meterRateLimiter, MeterController.checkMeterRegistration);

// Meter Linking
MeterRouter.get("/link/:meterNumber", meterRateLimiter, AuthMiddleware.protect, MeterController.checkMeterRegistration);
MeterRouter.post("/link/:meterNumber", meterRateLimiter, AuthMiddleware.protect, MeterController.requestMeterLink);

// Admin Only
MeterRouter.get("/link-requests", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.listMeterLinkRequests);
MeterRouter.patch("/link-requests/:id", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.processMeterLinkRequest);


export default MeterRouter;
