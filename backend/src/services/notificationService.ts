import { prisma } from '../config/prisma';

export interface SendNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type?: 'QUEUE' | 'DISTRIBUTION' | 'COMPLAINT' | 'SYSTEM';
}

export class NotificationService {
  /**
   * Pluggable notification service dispatching in-app notifications and logging external SMS/email triggers
   */
  public static async send(options: SendNotificationOptions) {
    const { userId, title, message, type = 'SYSTEM' } = options;

    try {
      // 1. Persist In-App Notification record
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          isRead: false
        }
      });

      // 2. Extensible External Channel Dispatcher (SMS / Email Simulation)
      const smsConfigured = process.env.TWILIO_SMS_ENABLED === 'true';
      if (smsConfigured) {
        console.log(`[Notification Channel: SMS] Dispatched SMS to User ID ${userId}: ${title}`);
      } else {
        console.log(`[Notification Channel: In-App Delivered] Notification created for User ID ${userId}. External SMS disabled (Twilio credentials not configured).`);
      }

      return notification;
    } catch (error) {
      console.error('[NotificationService Error] Failed to dispatch notification:', error);
      return null;
    }
  }
}
