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
  "/roles",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getAdminRoles
);

AdminRouter.get(
  "/groups",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getAdminGroups
);

AdminRouter.post(
  "/groups",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("super-admin"),
  AdminController.createAdminGroup
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

// Admin Management
AdminRouter.get(
  "/admins",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getAllAdmins
);

AdminRouter.patch(
  "/admins/:id/role",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("super-admin"),
  AdminController.changeAdminRole
);

AdminRouter.delete(
  "/admins/:id",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("super-admin"),
  AdminController.deleteAdmin
);

// Invitations
AdminRouter.post(
  "/invitations",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("super-admin"),
  AdminController.sendInvitation
);

AdminRouter.get(
  "/invitations",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("admin", "super-admin"),
  AdminController.getInvitations
);

AdminRouter.get(
  "/invitations/verify",
  AdminController.verifyInvitation
);

AdminRouter.delete(
  "/invitations/:id",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo("super-admin"),
  AdminController.cancelInvitation
);

AdminRouter.post(
  "/invitations/complete-setup",
  AdminController.completeAdminSetup
);

export default AdminRouter;
