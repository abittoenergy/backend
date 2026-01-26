import express from "express";
import OTPController from "../controllers/otp.controller";
import { rateLimit } from "express-rate-limit";

const otpLimiter = rateLimit({
    windowMs: 1000 * 60 * 60, // 1 hour
    limit: 5,
    message: "Too many OTP attempts, please try again later",
});

const OTPRouter = express.Router();

OTPRouter.post("/verify", otpLimiter, OTPController.validateOtp);
OTPRouter.post("/generate", otpLimiter,OTPController.generateOtp);

export default OTPRouter;
