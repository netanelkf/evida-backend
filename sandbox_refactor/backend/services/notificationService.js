// Notification service
import { Notification } from '../models/index.js';

export async function send(data) {
  const notification = await Notification.create(data);

  await deliverNotification(notification);

  return notification;
}

export async function sendUrgent(data) {
  const notification = await Notification.create({
    ...data,
    channel: 'push'
  });

  await deliverNotification(notification);

  return notification;
}

async function deliverNotification(notification) {
  try {
    switch (notification.channel) {
      case 'push':
        await sendPushNotification(notification);
        break;
      case 'email':
        await sendEmailNotification(notification);
        break;
      case 'sms':
        await sendSmsNotification(notification);
        break;
      default:
        break;
    }

    await Notification.markSent(notification.id);
  } catch (error) {
    console.error('Notification delivery failed:', error);
    await Notification.markFailed(notification.id, error.message);
  }
}

async function sendPushNotification(notification) {
  console.log('Push notification:', notification.title, 'to', notification.recipient_id);
}

async function sendEmailNotification(notification) {
  console.log('Email notification:', notification.title, 'to', notification.recipient_id);
}

async function sendSmsNotification(notification) {
  console.log('SMS notification:', notification.title, 'to', notification.recipient_id);
}

export async function getForRecipient(recipientId, recipientType, unreadOnly = false) {
  return Notification.findByRecipient(recipientId, recipientType, unreadOnly);
}

export async function markAsRead(notificationId) {
  return Notification.markAsRead(notificationId);
}

export async function markAllRead(recipientId, recipientType) {
  return Notification.markAllRead(recipientId, recipientType);
}

export async function getUnreadCount(recipientId, recipientType) {
  return Notification.countUnread(recipientId, recipientType);
}

export default {
  send,
  sendUrgent,
  getForRecipient,
  markAsRead,
  markAllRead,
  getUnreadCount
};
