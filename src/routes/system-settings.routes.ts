import express from "express";
import SystemSettingsController from "../controllers/system-settings.controller";
import AuthMiddleware from "../middlewares/auth";
import { systemSettingsRateLimiter } from "../middlewares/rate-limiting";

const SystemSettingsRouter = express.Router();

SystemSettingsRouter.get("/price-per-kg", AuthMiddleware.protect, systemSettingsRateLimiter, SystemSettingsController.getGasPrice);

SystemSettingsRouter.use(AuthMiddleware.protect);
SystemSettingsRouter.use(AuthMiddleware.restrictTo("admin", "super-admin"));

SystemSettingsRouter.get("/", systemSettingsRateLimiter, SystemSettingsController.getSettings);
SystemSettingsRouter.put("/", systemSettingsRateLimiter, SystemSettingsController.updateSettings);

export default SystemSettingsRouter;
