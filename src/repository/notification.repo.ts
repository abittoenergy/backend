import { eq, and, desc, count, sql } from "drizzle-orm";
import { getDb } from "../config/db";
import { notifications, Notification, NewNotification } from "../db/schema/notifications.schema";

export interface NotificationQueryOptions {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class NotificationRepository {
  private db = getDb();

  /**
   * Create a new notification
   */
  async create(data: NewNotification): Promise<Notification> {
    const [result] = await this.db.insert(notifications).values(data).returning();
    return result;
  }

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<Notification | undefined> {
    const [result] = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id))
      .limit(1);
    return result;
  }

  /**
   * Find notification by ID and user ID (for ownership verification)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Notification | undefined> {
    const [result] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    return result;
  }

  /**
   * Get paginated notifications for a user with optional filtering
   */
  async findByUserId(userId: string, options: NotificationQueryOptions = {}): Promise<PaginatedNotifications> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(notifications.userId, userId)];
    if (options.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, options.isRead));
    }

    // Get total count
    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(...conditions));

    // Get paginated results
    const results = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      notifications: results,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const [result] = await this.db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result;
  }

  /**
   * Mark a notification as unread
   */
  async markAsUnread(id: string, userId: string): Promise<Notification | undefined> {
    const [result] = await this.db
      .update(notifications)
      .set({ isRead: false, updatedAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .returning({ id: notifications.id });

    return result.length;
  }

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const [{ value: total }] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return Number(total);
  }

  /**
   * Delete a notification (optional feature)
   */
  async deleteById(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });

    return result.length > 0;
  }
}
