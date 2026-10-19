// Alert Engine service
import { Alert, AlertRule, UserBaseline, CaregiverLink, Notification, VitalsSnapshot } from '../models/index.js';
import incidentService from './incidentService.js';
import notificationService from './notificationService.js';
import alertsConfig from '../config/alerts.js';

export async function evaluate(userId, vitals) {
  const rules = await AlertRule.findActiveByUser(userId);
  const baselines = await UserBaseline.findByUser(userId);
  const triggeredAlerts = [];

  for (const rule of rules) {
    const result = evaluateRule(rule, vitals, baselines);

    if (result.triggered) {
      const alert = await createAlert(userId, rule, vitals, result);
      triggeredAlerts.push(alert);

      if (rule.create_incident && rule.severity === 'critical') {
        await escalateToIncident(alert, userId, vitals);
      }

      await sendNotifications(alert, rule, userId);
    }
  }

  return triggeredAlerts;
}

function evaluateRule(rule, vitals, baselines) {
  switch (rule.rule_type) {
    case 'high_hr':
    case 'very_high_hr':
      if (!vitals.heart_rate) return { triggered: false };
      return {
        triggered: vitals.heart_rate > rule.threshold_max,
        value: vitals.heart_rate,
        threshold: rule.threshold_max,
        message: `Heart rate ${vitals.heart_rate} bpm exceeds threshold of ${rule.threshold_max} bpm`
      };

    case 'low_hr':
    case 'very_low_hr':
      if (!vitals.heart_rate) return { triggered: false };
      return {
        triggered: vitals.heart_rate < rule.threshold_min,
        value: vitals.heart_rate,
        threshold: rule.threshold_min,
        message: `Heart rate ${vitals.heart_rate} bpm below threshold of ${rule.threshold_min} bpm`
      };

    case 'low_oxygen':
      if (!vitals.oxygen_saturation) return { triggered: false };
      return {
        triggered: vitals.oxygen_saturation < rule.threshold_min,
        value: vitals.oxygen_saturation,
        threshold: rule.threshold_min,
        message: `Oxygen saturation ${vitals.oxygen_saturation}% below threshold of ${rule.threshold_min}%`
      };

    case 'hrv_drop':
      const hrvBaseline = baselines.find(b => b.metric_type === 'hrv_sdnn');
      if (!hrvBaseline || !vitals.hrv_sdnn) return { triggered: false };

      const dropPercent = ((hrvBaseline.baseline_value - vitals.hrv_sdnn) / hrvBaseline.baseline_value) * 100;
      return {
        triggered: dropPercent > rule.threshold_percent,
        value: dropPercent,
        threshold: rule.threshold_percent,
        message: `HRV dropped ${Math.round(dropPercent)}% from baseline`
      };

    case 'low_battery':
      if (!vitals.battery_level) return { triggered: false };
      return {
        triggered: vitals.battery_level < rule.threshold_min,
        value: vitals.battery_level,
        threshold: rule.threshold_min,
        message: `Device battery at ${vitals.battery_level}%`
      };

    default:
      return { triggered: false };
  }
}

async function createAlert(userId, rule, vitals, result) {
  const alert = await Alert.create({
    user_id: userId,
    rule_id: rule.id,
    alert_type: rule.rule_type,
    severity: rule.severity,
    title: getAlertTitle(rule.rule_type, rule.severity),
    message: result.message,
    triggered_value: result.value,
    threshold_value: result.threshold,
    vitals_snapshot_id: vitals.id || null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  return alert;
}

function getAlertTitle(ruleType, severity) {
  const titles = {
    high_hr: 'High Heart Rate',
    very_high_hr: 'Critical: Very High Heart Rate',
    low_hr: 'Low Heart Rate',
    very_low_hr: 'Critical: Very Low Heart Rate',
    low_oxygen: 'Low Oxygen Saturation',
    hrv_drop: 'HRV Drop Detected',
    low_battery: 'Low Device Battery'
  };

  return titles[ruleType] || `${severity.toUpperCase()}: Health Alert`;
}

async function escalateToIncident(alert, userId, vitals) {
  const incident = await incidentService.create({
    user_id: userId,
    source_type: 'alert_escalation',
    source_alert_id: alert.id,
    priority: 'critical',
    title: alert.title,
    description: alert.message,
    vitals_at_incident: vitals
  });

  await Alert.escalateToIncident(alert.id, incident.id);

  return incident;
}

async function sendNotifications(alert, rule, userId) {
  const notifications = [];

  if (rule.notify_user) {
    notifications.push({
      recipient_id: userId,
      recipient_type: 'user',
      type: 'alert',
      title: alert.title,
      body: alert.message,
      channel: 'push',
      data: { alert_id: alert.id }
    });
  }

  if (rule.notify_caregivers) {
    const links = await CaregiverLink.findByUser(userId);

    for (const link of links) {
      if (!link.can_receive_alerts) continue;
      if (link.can_receive_critical_only && alert.severity !== 'critical') continue;

      notifications.push({
        recipient_id: link.caregiver_id,
        recipient_type: 'caregiver',
        type: 'alert',
        title: `Health Alert`,
        body: alert.message,
        channel: 'push',
        data: { alert_id: alert.id, user_id: userId }
      });
    }
  }

  await Notification.bulkInsert(notifications);
}

export async function checkInactivity(userId, lastActivityTime, thresholdMinutes) {
  const minutesSinceActivity = (Date.now() - new Date(lastActivityTime).getTime()) / 60000;
  return minutesSinceActivity > thresholdMinutes;
}

export async function checkNoData(userId, lastDataTime, thresholdMinutes) {
  const minutesSinceData = (Date.now() - new Date(lastDataTime).getTime()) / 60000;
  return minutesSinceData > thresholdMinutes;
}

export default {
  evaluate,
  checkInactivity,
  checkNoData
};
