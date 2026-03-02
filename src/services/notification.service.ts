import { NotificationRepository, NotificationQueryOptions, PaginatedNotifications } from "../repository/notification.repo";
import { NewNotification } from "../db/schema/notifications.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";
import { notificationEvents } from "../events/notification.events";
import { UserRepository } from "../repository/user";

export type NotificationCategory = "WALLET" | "GAS_PURCHASE" | "METER" | "ACCOUNT" | "SYSTEM";

export interface CreateNotificationData {
  title: string;
  description: string;
  category: NotificationCategory;
}

export default class NotificationService {
  private static notificationRepo = new NotificationRepository();

  /**
   * Create a notification for a user
   */
  static async createNotification(userId: string, data: CreateNotificationData): Promise<void> {
    try {
      const notificationData: NewNotification = {
        userId,
        title: data.title,
        description: data.description,
        category: data.category,
        isRead: false,
      };

      const notification = await this.notificationRepo.create(notificationData);

      notificationEvents.emitCreated(notification);

      logger.info("Notification created", {
        userId,
        category: data.category,
        title: data.title,
      });
    } catch (error: any) {
      logger.error("Failed to create notification", {
        error: error.message,
        userId,
        data,
      });
      // Don't throw - notification creation should not break main flow
    }
  }

  /**
   * Get paginated notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    options: NotificationQueryOptions = {}
  ): Promise<PaginatedNotifications> {
    try {
      return await this.notificationRepo.findByUserId(userId, options);
    } catch (error: any) {
      logger.error("Failed to get user notifications", {
        error: error.message,
        userId,
        options,
      });
      throw new AppError("Failed to retrieve notifications", ResponseHelper.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await this.notificationRepo.markAsRead(notificationId, userId);

      if (!notification) {
        throw new AppError("Notification not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      logger.info("Notification marked as read", {
        notificationId,
        userId,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Failed to mark notification as read", {
        error: error.message,
        notificationId,
        userId,
      });
      throw new AppError("Failed to update notification", ResponseHelper.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Mark a notification as unread
   */
  static async markAsUnread(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await this.notificationRepo.markAsUnread(notificationId, userId);

      if (!notification) {
        throw new AppError("Notification not found", ResponseHelper.RESOURCE_NOT_FOUND);
      }

      logger.info("Notification marked as unread", {
        notificationId,
        userId,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Failed to mark notification as unread", {
        error: error.message,
        notificationId,
        userId,
      });
      throw new AppError("Failed to update notification", ResponseHelper.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const count = await this.notificationRepo.markAllAsRead(userId);

      logger.info("All notifications marked as read", {
        userId,
        count,
      });

      return count;
    } catch (error: any) {
      logger.error("Failed to mark all notifications as read", {
        error: error.message,
        userId,
      });
      throw new AppError("Failed to update notifications", ResponseHelper.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get count of unread notifications
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationRepo.getUnreadCount(userId);
    } catch (error: any) {
      logger.error("Failed to get unread count", {
        error: error.message,
        userId,
      });
      throw new AppError("Failed to retrieve unread count", ResponseHelper.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Notify all admin users
   */
  static async notifyAdmins(data: CreateNotificationData): Promise<void> {
    try {
      const userRepo = new UserRepository();
      const admins = await userRepo.findAllAdmins();

      if (admins.length === 0) {
        logger.warn("No admins found to notify");
        return;
      }

      logger.info(`Broadcasting notification to ${admins.length} admins`, { title: data.title });

      await Promise.all(
        admins.map((admin) => this.createNotification(admin.id, data))
      );
    } catch (error: any) {
      logger.error("Failed to notify admins", {
        error: error.message,
        data,
      });
    }
  }
}
