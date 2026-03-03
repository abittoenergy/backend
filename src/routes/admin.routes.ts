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

AdminRouter.get(
  "/activities",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getRecentActivity
);

AdminRouter.get(
  "/leak-reports",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getLeakReports
);

AdminRouter.patch(
  "/leak-reports/:id/resolve",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.resolveLeakReport
);

export default AdminRouter;
