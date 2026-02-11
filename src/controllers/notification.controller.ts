import ControllerHelper from "../utils/helpers/controller.helper";
import ResponseHelper from "../utils/helpers/response.helper";
import NotificationService from "../services/notification.service";
import { notificationQuerySchema, notificationIdSchema } from "../validators/notification.validator";

export default class NotificationController {
  /**
   * Get paginated notifications for authenticated user
   * GET /api/notifications
   */
  static getNotifications = ControllerHelper.createHandler("notification.getNotifications", async (req, res) => {
    const userId = (req as any).user!.id;

    // Validate query parameters
    const { error, value } = notificationQuerySchema.validate(req.query);
    if (error) {
      return ResponseHelper.sendResponse(res, {
        message: error.details[0].message,
        statusCode: ResponseHelper.BAD_REQUEST,
      });
    }

    const result = await NotificationService.getUserNotifications(userId, value);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Notifications retrieved successfully",
      data: {
        notifications: result.notifications,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  });

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  static getUnreadCount = ControllerHelper.createHandler("notification.getUnreadCount", async (req, res) => {
    const userId = (req as any).user!.id;

    const count = await NotificationService.getUnreadCount(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Unread count retrieved successfully",
      data: { count },
    });
  });

  /**
   * Mark notification as read
   * PATCH /api/notifications/:id/read
   */
  static markAsRead = ControllerHelper.createHandler("notification.markAsRead", async (req, res) => {
    const userId = (req as any).user!.id;

    // Validate notification ID
    const { error, value } = notificationIdSchema.validate(req.params);
    if (error) {
      return ResponseHelper.sendResponse(res, {
        message: error.details[0].message,
        statusCode: ResponseHelper.BAD_REQUEST,
      });
    }

    await NotificationService.markAsRead(value.id, userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Notification marked as read",
    });
  });

  /**
   * Mark notification as unread
   * PATCH /api/notifications/:id/unread
   */
  static markAsUnread = ControllerHelper.createHandler("notification.markAsUnread", async (req, res) => {
    const userId = (req as any).user!.id;

    // Validate notification ID
    const { error, value } = notificationIdSchema.validate(req.params);
    if (error) {
      return ResponseHelper.sendResponse(res, {
        message: error.details[0].message,
        statusCode: ResponseHelper.BAD_REQUEST,
      });
    }

    await NotificationService.markAsUnread(value.id, userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "Notification marked as unread",
    });
  });

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/mark-all-read
   */
  static markAllAsRead = ControllerHelper.createHandler("notification.markAllAsRead", async (req, res) => {
    const userId = (req as any).user!.id;

    const count = await NotificationService.markAllAsRead(userId);

    ResponseHelper.sendSuccessResponse(res, {
      message: "All notifications marked as read",
      data: { count },
    });
  });
}
