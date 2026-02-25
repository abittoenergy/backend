import express from "express";
import { Routes } from "../types/app.types";
import AuthRouter from "./auth.routes";
import EstateRouter from "./estate.routes";
import MeterRouter from "./meter.routes";
import OTPRouter from "./otp.routes";
import UserRouter from "./user.routes";
import WalletRouter from "./wallet.routes";
import WebhookRouter from "./webhook.routes";
import SystemSettingsRouter from "./system-settings.routes";
import DVARouter from "./dva.routes";
import GasPurchaseRouter from "./gas-purchase.routes";
import NotificationRouter from "./notification.routes";
import TransactionRouter from "./transaction.routes";
import AdminRouter from "./admin.routes";

const AppRouter = express.Router();

const appRoutes: Routes = [
    {
        path: "/settings",
        router: SystemSettingsRouter
    },
    {
        path: "/dva",
        router: DVARouter
    },
    {
        path: "/gas-purchase",
        router: GasPurchaseRouter
    },
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
    },
    {
        path: "/wallet",
        router: WalletRouter
    },
    {
        path: "/webhooks",
        router: WebhookRouter
    },
    {
        path: "/notifications",
        router: NotificationRouter
    },
    {
        path: "/transactions",
        router: TransactionRouter
    },
    {
        path: "/admin",
        router: AdminRouter
    }
];

appRoutes.forEach((route) => {
    AppRouter.use(route.path, route.router);
});

export default AppRouter;
