import { EventEmitter } from "events";
import { Notification } from "../db/schema/notifications.schema";

export const NOTIFICATION_EVENT = "notification:created";

class NotificationEvents extends EventEmitter {
  emitCreated(notification: Notification) {
    this.emit(NOTIFICATION_EVENT, notification);
  }

  onCreated(handler: (notification: Notification) => void) {
    this.on(NOTIFICATION_EVENT, handler);
  }

  removeCreatedHandler(handler: (notification: Notification) => void) {
    this.removeListener(NOTIFICATION_EVENT, handler);
  }
}

export const notificationEvents = new NotificationEvents();
