import express from "express";
import { Routes } from "../types/app.types";
import AuthRouter from "./auth.routes";
import EstateRouter from "./estate.routes";
import MeterRouter from "./meter.routes";
import OTPRouter from "./otp.routes";
import UserRouter from "./user.routes";

const AppRouter = express.Router();

const appRoutes: Routes = [
    {
        path: "/auth",
        router: AuthRouter,
    },
    {
        path: "/estate",
        router: EstateRouter
    },
    {
        path: "/meter",
        router: MeterRouter
    },
    {
        path: "/otp",
        router: OTPRouter
    },
    {
        path: "/user",
        router: UserRouter
    }
];

appRoutes.forEach((route) => {
    AppRouter.use(route.path, route.router);
});

export default AppRouter;
