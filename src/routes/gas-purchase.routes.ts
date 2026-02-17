import express from "express";
import GasPurchaseController from "../controllers/gas-purchase.controller";
import AuthMiddleware from "../middlewares/auth";
import { gasPurchaseLimiter } from "../middlewares/rate-limiting";

const GasPurchaseRouter = express.Router();

GasPurchaseRouter.use(AuthMiddleware.protect);

GasPurchaseRouter.post("/initialize", gasPurchaseLimiter, GasPurchaseController.initializePurchase);
GasPurchaseRouter.post("/wallet-purchase", gasPurchaseLimiter, GasPurchaseController.purchaseFromWallet);

GasPurchaseRouter.get("/status/:reference", gasPurchaseLimiter, GasPurchaseController.checkPaymentStatus);

export default GasPurchaseRouter;
