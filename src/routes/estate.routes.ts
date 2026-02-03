
import express from "express";
import EstateController from "../controllers/estate.controller";
import AuthMiddleware from "../middlewares/auth";
import { Role } from "../db/schema/users.schema";

const EstateRouter = express.Router();

EstateRouter.post(
  "/",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo(Role.ADMIN, Role.SUPER_ADMIN),
  EstateController.createEstate
);

EstateRouter.put(
  "/:id",
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo(Role.ADMIN, Role.SUPER_ADMIN),
  EstateController.updateEstate
);

EstateRouter.get("/", AuthMiddleware.protect, EstateController.getEstates);

export default EstateRouter;
