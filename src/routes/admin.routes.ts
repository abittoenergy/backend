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
  "/incident-reports",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getIncidentReports
);

AdminRouter.patch(
  "/incident-reports/:id/resolve",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.resolveIncidentReport
);

export default AdminRouter;
