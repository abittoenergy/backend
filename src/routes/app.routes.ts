import express from "express";
import { Routes } from "../types/app.types";
import AuthRouter from "./auth.routes";
import MeterRouter from "./meter.routes";
import OTPRouter from "./otp.routes";

const AppRouter = express.Router();

const appRoutes: Routes = [
    {
        path: "/auth",
        router: AuthRouter,
    },
    {
        path:"/meter",
        router: MeterRouter
    },
    {
        path:"/otp",
        router: OTPRouter
    }
];

appRoutes.forEach((route) => {
    AppRouter.use(route.path, route.router);
});

export default AppRouter;
