import express from "express";
import MeterController from "../controllers/meter.controller";
// import { meterRateLimiter } from "../middlewares/rate-limiting";

const MeterRouter = express.Router();

MeterRouter.post("/register", MeterController.registerMeter);
MeterRouter.get("/:deviceId", MeterController.getMeterByDeviceId);


export default MeterRouter;
