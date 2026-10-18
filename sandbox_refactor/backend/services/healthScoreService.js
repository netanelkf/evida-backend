// Health Score service
import { HealthScore, VitalsSnapshot, UserBaseline, Alert } from '../models/index.js';
import { formatDate, getToday, getYesterday } from '../utils/dateHelpers.js';

export async function calculateDailyScore(userId, date = getToday()) {
  const vitals = await VitalsSnapshot.findDailySummary(userId, date);
  const baselines = await UserBaseline.findByUser(userId);
  const alertsToday = await Alert.countByUserAndDate(userId, date);

  if (!vitals) {
    return null;
  }

  let score = 0;
  const breakdown = {};

  const hrvBaseline = baselines.find(b => b.metric_type === 'hrv_sdnn');
  if (vitals.hrv_sdnn && hrvBaseline) {
    const hrvRatio = vitals.hrv_sdnn / hrvBaseline.baseline_value;
    breakdown.hrv_score = Math.min(25, Math.round(hrvRatio * 25));
  } else {
    breakdown.hrv_score = 15;
  }
  score += breakdown.hrv_score;

  const hrBaseline = baselines.find(b => b.metric_type === 'resting_hr');
  if (vitals.resting_heart_rate && hrBaseline) {
    const hrRatio = vitals.resting_heart_rate / hrBaseline.baseline_value;
    if (hrRatio <= 1) {
      breakdown.heart_rate_score = 25;
    } else {
      breakdown.heart_rate_score = Math.max(0, Math.round(25 - (hrRatio - 1) * 50));
    }
  } else {
    breakdown.heart_rate_score = 15;
  }
  score += breakdown.heart_rate_score;

  if (vitals.sleep_duration_minutes && vitals.sleep_efficiency) {
    const durationHours = vitals.sleep_duration_minutes / 60;
    let durationScore;

    if (durationHours >= 7 && durationHours <= 9) {
      durationScore = 12.5;
    } else if (durationHours >= 6 && durationHours < 7) {
      durationScore = 10;
    } else if (durationHours >= 5 && durationHours < 6) {
      durationScore = 7;
    } else {
      durationScore = 5;
    }

    const efficiencyScore = (vitals.sleep_efficiency / 100) * 12.5;
    breakdown.sleep_score = Math.round(durationScore + efficiencyScore);
  } else {
    breakdown.sleep_score = 12;
  }
  score += breakdown.sleep_score;

  if (vitals.steps !== undefined) {
    const stepsScore = Math.min(10, (vitals.steps / 10000) * 10);
    const activeMinutes = vitals.active_minutes || 0;
    const activeScore = Math.min(5, (activeMinutes / 30) * 5);
    breakdown.activity_score = Math.round(stepsScore + activeScore);
  } else {
    breakdown.activity_score = 7;
  }
  score += breakdown.activity_score;

  if (alertsToday > 0) {
    breakdown.anomaly_penalty = Math.min(10, alertsToday * 3);
  } else {
    breakdown.anomaly_penalty = 0;
  }
  score -= breakdown.anomaly_penalty;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const yesterdayScore = await HealthScore.findByUserAndDate(userId, getYesterday());
  let scoreTrend = 'stable';
  if (yesterdayScore) {
    if (score > yesterdayScore.score + 5) {
      scoreTrend = 'improving';
    } else if (score < yesterdayScore.score - 5) {
      scoreTrend = 'declining';
    }
  }

  const healthScore = await HealthScore.create({
    user_id: userId,
    score_date: date,
    score,
    score_trend: scoreTrend,
    hrv_score: breakdown.hrv_score,
    heart_rate_score: breakdown.heart_rate_score,
    sleep_score: breakdown.sleep_score,
    activity_score: breakdown.activity_score,
    anomaly_penalty: breakdown.anomaly_penalty,
    hrv_baseline: hrvBaseline?.baseline_value || null,
    resting_hr_baseline: hrBaseline?.baseline_value || null,
    data_completeness: calculateDataCompleteness(vitals),
    data_sources_used: [vitals.source]
  });

  return {
    score,
    score_trend: scoreTrend,
    date,
    breakdown,
    baselines: {
      hrv_sdnn: hrvBaseline?.baseline_value || null,
      resting_hr: hrBaseline?.baseline_value || null
    },
    data_completeness: calculateDataCompleteness(vitals),
    interpretation: getInterpretation(score, breakdown),
    calculated_at: healthScore.calculated_at
  };
}

function calculateDataCompleteness(vitals) {
  const fields = [
    'heart_rate', 'resting_heart_rate', 'hrv_sdnn',
    'steps', 'calories', 'active_minutes',
    'sleep_duration_minutes', 'sleep_efficiency'
  ];

  const available = fields.filter(f => vitals[f] !== null && vitals[f] !== undefined).length;
  return Math.round((available / fields.length) * 100);
}

function getInterpretation(score, breakdown) {
  if (score >= 80) {
    return 'Excellent health stability today. Keep up the great work!';
  } else if (score >= 60) {
    let advice = 'Good overall health.';
    if (breakdown.sleep_score < 15) {
      advice += ' Sleep could be improved.';
    }
    if (breakdown.activity_score < 10) {
      advice += ' Try to be more active.';
    }
    return advice;
  } else if (score >= 40) {
    let advice = 'Your health metrics need attention.';
    if (breakdown.hrv_score < 15) {
      advice += ' HRV is below your baseline - consider rest.';
    }
    if (breakdown.anomaly_penalty > 0) {
      advice += ' Review your active alerts.';
    }
    return advice;
  } else {
    return 'Low health score today. Consider consulting a healthcare provider if symptoms persist.';
  }
}

export async function getLatest(userId) {
  const latest = await HealthScore.findLatestByUser(userId);

  if (!latest) {
    return await calculateDailyScore(userId);
  }

  return {
    score: latest.score,
    score_trend: latest.score_trend,
    date: latest.score_date,
    breakdown: {
      hrv_score: latest.hrv_score,
      heart_rate_score: latest.heart_rate_score,
      sleep_score: latest.sleep_score,
      activity_score: latest.activity_score,
      anomaly_penalty: latest.anomaly_penalty
    },
    baselines: {
      hrv_sdnn: latest.hrv_baseline,
      resting_hr: latest.resting_hr_baseline
    },
    data_completeness: latest.data_completeness,
    interpretation: getInterpretation(latest.score, latest),
    calculated_at: latest.calculated_at
  };
}

export async function getHistory(userId, days = 7) {
  const history = await HealthScore.findHistory(userId, days);

  return {
    scores: history.map(h => ({
      date: h.score_date,
      score: h.score
    })),
    average: await HealthScore.getAverageScore(userId, days),
    trend: history.length > 0 ? history[0].score_trend : 'stable'
  };
}

export default {
  calculateDailyScore,
  getLatest,
  getHistory
};
