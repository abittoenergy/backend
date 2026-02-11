import express from "express";
import WalletController from "../controllers/wallet.controller";
import AuthMiddleware from "../middlewares/auth";

const WalletRouter = express.Router();

WalletRouter.get("/balance", AuthMiddleware.protect, WalletController.getBalance);

WalletRouter.get("/transactions", AuthMiddleware.protect, WalletController.getTransactions);

export default WalletRouter;
