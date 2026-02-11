import express from "express";
import DVAController from "../controllers/dva.controller";
import AuthMiddleware from "../middlewares/auth";
import rateLimit from "express-rate-limit";
import { globalRateLimiter } from "../middlewares/rate-limiting";

const DVARouter = express.Router();


// Strict rate limiter for requery (once every 10 minutes)
const requeryLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1, // Only 1 request per 10 minutes
  message: "You can only requery your dedicated virtual account once every 10 minutes"
});

DVARouter.use(AuthMiddleware.protect);

DVARouter.get("/", globalRateLimiter, DVAController.getDVA);
DVARouter.post("/requery", requeryLimiter, DVAController.requeryDVA);

export default DVARouter;
