// Single source of truth for reading vitals out of a ROOK webhook payload.
//
// Reused by alert checking (webhooks.js) and personal-baseline computation
// (baselineService.js) so both read the exact same fields the same way.
// Shape verified against what index.js's extractMetricsFromRookData already
// parses from real payloads — webhooks.js previously read a different,
// flatter shape (payload.heart_rate.avg) that real ROOK payloads never
// actually send, so its absolute-threshold alerts were never firing.
export function parseVitalsFromPayload(payload) {
  const body = payload?.body_health?.summary?.body_summary;
  const physEvents = payload?.physical_health?.events;
  const bodyEvents = payload?.body_health?.events;

  const heartRateAvg =
    body?.heart_rate?.hr_avg_bpm_int ??
    bodyEvents?.heart_rate_event?.[0]?.heart_rate?.hr_bpm_int ??
    physEvents?.heart_rate_event?.[0]?.heart_rate?.hr_bpm_int ??
    null;

  const heartRateResting = body?.heart_rate?.hr_resting_bpm_int ?? null;

  const oxygenSaturation =
    body?.oxygenation?.saturation_avg_percentage_int ??
    physEvents?.oxygenation_event?.[0]?.oxygenation?.saturation_percentage_int ??
    null;

  const temperatureCelsius = body?.temperature?.temperature_avg_object?.celsius ?? null;

  const bp = body?.blood_pressure?.blood_pressure_avg_object;
  const bloodPressure = {
    systolic: bp?.systolic ?? null,
    diastolic: bp?.diastolic ?? null
  };

  return { heartRateAvg, heartRateResting, oxygenSaturation, temperatureCelsius, bloodPressure };
}
