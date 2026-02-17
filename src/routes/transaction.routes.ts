import express from "express";
import TransactionController from "../controllers/transaction.controller";
import AuthMiddleware from "../middlewares/auth";
import { Role } from "../db/schema/users.schema";

const TransactionRouter = express.Router();

TransactionRouter.get(
  "/admin/list",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo(Role.ADMIN, Role.SUPER_ADMIN),
  TransactionController.adminGetTransactions
);

TransactionRouter.get(
  "/admin/:id",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo(Role.ADMIN, Role.SUPER_ADMIN),
  TransactionController.adminGetTransactionById
);

TransactionRouter.get(
  "/mine",
  AuthMiddleware.protect,
  TransactionController.getUserTransactions
);

TransactionRouter.get(
  "/meter/:meterId",
  AuthMiddleware.protect,
  TransactionController.getMeterTransactions
);

export default TransactionRouter;
