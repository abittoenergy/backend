import express from "express";
import NotificationController from "../controllers/notification.controller";
import AuthMiddleware from "../middlewares/auth";
import { notificationRateLimiter } from "../middlewares/rate-limiting";

const NotificationRouter = express.Router();

// All routes require authentication
NotificationRouter.use(AuthMiddleware.protect);

// SSE stream for real-time notifications
NotificationRouter.get("/stream", NotificationController.stream);

// Get unread count (must be before /:id routes)
NotificationRouter.get("/unread-count", notificationRateLimiter, NotificationController.getUnreadCount);

// Mark all as read
NotificationRouter.patch("/mark-all-read", notificationRateLimiter, NotificationController.markAllAsRead);

// Get paginated notifications
NotificationRouter.get("/", notificationRateLimiter, NotificationController.getNotifications);

// Mark single notification as read/unread
NotificationRouter.patch("/:id/read", notificationRateLimiter, NotificationController.markAsRead);
NotificationRouter.patch("/:id/unread", notificationRateLimiter, NotificationController.markAsUnread);

export default NotificationRouter;
