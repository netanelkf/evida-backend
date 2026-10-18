const nodemailer = require('nodemailer');
const EmergencyContact = require('../models/EmergencyContact');
const User = require('../models/User');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');

// expo-server-sdk ships as an ESM-only package. Loading it via a dynamic
// import (instead of require()) keeps this file working as CommonJS on any
// supported Node version, rather than depending on Node's newer require(esm)
// interop.
let expoClientPromise;
function loadExpoClient() {
  if (!expoClientPromise) {
    expoClientPromise = import('expo-server-sdk').then(({ Expo }) => ({ Expo, expo: new Expo() }));
  }
  return expoClientPromise;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendEmail(to, subject, text) {
  if (!process.env.SMTP_HOST) {
    logger.warn('SMTP not configured — skipping email to', to);
    return;
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"eVida Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    logger.info('Email sent to', to);
  } catch (err) {
    logger.error('Email send failed:', err.message);
  }
}

async function sendPushNotification(expoPushToken, title, body) {
  const { Expo, expo } = await loadExpoClient();
  if (!Expo.isExpoPushToken(expoPushToken)) {
    logger.warn('Invalid Expo push token:', expoPushToken);
    return;
  }
  try {
    const chunks = expo.chunkPushNotifications([{ to: expoPushToken, title, body, sound: 'default' }]);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    logger.info('Push notification sent to', expoPushToken);
  } catch (err) {
    logger.error('Push notification failed:', err.message);
  }
}

async function sendAlerts(userId, alert) {
  const user = await User.findById(userId);
  if (!user) return;

  const metricLabel = alert.metric.replace(/_/g, ' ');
  const subject = `[eVida ${alert.severity.toUpperCase()}] Abnormal ${metricLabel} detected`;
  const body =
    `Alert for ${user.name || user.email}:\n\n` +
    `Metric: ${metricLabel}\n` +
    `Value: ${alert.value}\n` +
    `Normal range: ${alert.threshold_min} – ${alert.threshold_max}\n` +
    `Severity: ${alert.severity}\n` +
    `Time: ${new Date().toISOString()}\n\n` +
    `Please check on them immediately.`;

  const pushTitle = `eVida ${alert.severity === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'}`;
  const pushBody = `${metricLabel}: ${alert.value} (normal: ${alert.threshold_min}–${alert.threshold_max})`;

  // Notify the user themselves
  const tasks = [];
  if (user.email)           tasks.push(sendEmail(user.email, subject, body));
  if (user.expo_push_token) tasks.push(sendPushNotification(user.expo_push_token, pushTitle, pushBody));

  // Notify emergency contacts
  const contacts = await EmergencyContact.findByUser(userId);
  for (const contact of contacts) {
    if (contact.notify_email && contact.email) {
      tasks.push(sendEmail(contact.email, subject, body));
    }
  }

  await Promise.allSettled(tasks);

  await Alert.markNotified(alert.id);
  logger.info(`Notifications sent for alert ${alert.id}`);
}

module.exports = { sendAlerts };
