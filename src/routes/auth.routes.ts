import express from "express";
import AuthController from "../controllers/auth.controller";
import { authLimiter } from "../middlewares/rate-limiting";
import AuthMiddleware from "../middlewares/auth";

const AuthRouter = express.Router();

AuthRouter.post("/signup", authLimiter, AuthController.signup);
AuthRouter.post("/signin", authLimiter, AuthController.signin);
AuthRouter.post("/change-password", authLimiter, AuthMiddleware.protect, AuthController.changePassword);

export default AuthRouter;
