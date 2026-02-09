import express from "express";
import WebhookController from "../controllers/webhook.controller";

const WebhookRouter = express.Router();

WebhookRouter.post("/paystack", WebhookController.handlePaystack);

export default WebhookRouter;
