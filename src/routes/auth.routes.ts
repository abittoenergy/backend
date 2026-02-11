import express from "express";
import AuthController from "../controllers/auth.controller";
import { authLimiter } from "../middlewares/rate-limiting";

const AuthRouter = express.Router();

AuthRouter.post("/signup", authLimiter, AuthController.signup);
AuthRouter.post("/signin", authLimiter, AuthController.signin);

export default AuthRouter;
