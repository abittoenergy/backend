import express from "express";
import AuthController from "../controllers/auth.controller";
import { rateLimit } from "express-rate-limit";

const authLimiter = rateLimit({
    windowMs: 1000 * 60 * 60, // 1 hour
    limit: 10,
    message: "Too many authentication attempts, please try again later",
});

const AuthRouter = express.Router();

AuthRouter.post("/signup", authLimiter, AuthController.signup);
AuthRouter.post("/signin", authLimiter, AuthController.signin);

export default AuthRouter;
