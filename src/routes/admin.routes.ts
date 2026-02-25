import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import AuthMiddleware from "../middlewares/auth";

const AdminRouter = Router();

AdminRouter.get(
  "/stats",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getStats
);

export default AdminRouter;
