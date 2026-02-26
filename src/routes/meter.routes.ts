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
MeterRouter.get("/details/:id", meterRateLimiter, AuthMiddleware.protect, MeterController.getMeterDetails);
MeterRouter.get("/stats/:id", meterRateLimiter, AuthMiddleware.protect, MeterController.getMeterStats);
MeterRouter.get("/link/:meterNumber", meterRateLimiter, AuthMiddleware.protect, MeterController.checkMeterRegistration);
MeterRouter.post("/link/:meterNumber", meterRateLimiter, AuthMiddleware.protect, MeterController.requestMeterLink);
MeterRouter.post("/gift", meterRateLimiter, AuthMiddleware.protect, MeterController.giftGas);
MeterRouter.post("/:id/toggle-valve", meterRateLimiter, AuthMiddleware.protect, MeterController.toggleValve);

// ADMIN
MeterRouter.patch("/link-requests/:id", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.processMeterLinkRequest);

// ADMIN METER MANAGEMENT
MeterRouter.get("/admin/meters", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.adminGetMeters);
MeterRouter.post("/admin/meters/:deviceId/unlink", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.adminUnlinkMeter);
MeterRouter.post("/admin/link/:meterNumber", meterRateLimiter, AuthMiddleware.protect, AuthMiddleware.restrictTo("admin", "super-admin"), MeterController.adminLinkMeter);

export default MeterRouter;
