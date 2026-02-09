import express from "express";
import UserController from "../controllers/user.controller";
import { userRateLimiter } from "../middlewares/rate-limiting";
import AuthMiddleware from "../middlewares/auth";

const UserRouter = express.Router();

UserRouter.put("/profile/onboarding", userRateLimiter, AuthMiddleware.protect, UserController.updateProfileOnboarding);
UserRouter.get("/profile", userRateLimiter, AuthMiddleware.protect, UserController.getProfile);

export default UserRouter;
