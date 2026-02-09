import express from "express";
import WalletController from "../controllers/wallet.controller";
import AuthMiddleware from "../middlewares/auth";

const WalletRouter = express.Router();

WalletRouter.get("/balance", AuthMiddleware.protect, WalletController.getBalance);
WalletRouter.post("/topup/initialize", AuthMiddleware.protect, WalletController.initializeTopup);
WalletRouter.get("/topup/verify/:reference", AuthMiddleware.protect, WalletController.verifyTopup);
WalletRouter.get("/transactions", AuthMiddleware.protect, WalletController.getTransactions);

export default WalletRouter;
