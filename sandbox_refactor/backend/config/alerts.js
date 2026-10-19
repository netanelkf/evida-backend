// Default alert thresholds and rules
export default {
  defaultRules: [
    {
      rule_type: 'high_hr',
      threshold_max: 120,
      severity: 'warning',
      notify_user: true,
      notify_caregivers: true,
      notify_dispatch: false,
      create_incident: false
    },
    {
      rule_type: 'very_high_hr',
      threshold_max: 150,
      severity: 'critical',
      notify_user: true,
      notify_caregivers: true,
      notify_dispatch: true,
      create_incident: true
    },
    {
      rule_type: 'low_hr',
      threshold_min: 50,
      severity: 'warning',
      notify_user: true,
      notify_caregivers: true,
      notify_dispatch: false,
      create_incident: false
    },
    {
      rule_type: 'very_low_hr',
      threshold_min: 40,
      severity: 'critical',
      notify_user: true,
      notify_caregivers: true,
      notify_dispatch: true,
      create_incident: true
    },
    {
      rule_type: 'low_oxygen',
      threshold_min: 92,
      severity: 'critical',
      notify_user: true,
      notify_caregivers: true,
      notify_dispatch: true,
      create_incident: true
    },
    {
      rule_type: 'hrv_drop',
      threshold_percent: 25,
      severity: 'warning',
      notify_user: true,
      notify_caregivers: true,
      notify_dispatch: false,
      create_incident: false
    },
    {
      rule_type: 'inactivity',
      duration_minutes: 120,
      severity: 'info',
      notify_user: true,
      notify_caregivers: false,
      notify_dispatch: false,
      create_incident: false
    },
    {
      rule_type: 'no_data',
      duration_minutes: 30,
      severity: 'warning',
      notify_user: true,
      notify_caregivers: true,
      notify_dispatch: false,
      create_incident: false
    },
    {
      rule_type: 'low_battery',
      threshold_min: 15,
      severity: 'info',
      notify_user: true,
      notify_caregivers: false,
      notify_dispatch: false,
      create_incident: false
    }
  ],

  severityLevels: {
    info: 0,
    warning: 1,
    critical: 2
  },

  escalationTimeouts: {
    userResponseMs: 2 * 60 * 1000,      // 2 minutes for user to respond
    caregiverResponseMs: 5 * 60 * 1000  // 5 minutes for caregiver to respond
  }
};
