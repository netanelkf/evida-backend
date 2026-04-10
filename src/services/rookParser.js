// Normalizes Rook webhook payloads into the flat health_data schema.
// Rook sends different shapes per data_type — this is the single place to handle that.

function parseRookPayload(payload) {
  const { data_type, data = [], rook_user_id } = payload;
  const rows = [];

  for (const item of data) {
    const base = {
      rook_user_id,
      source: item.source_device || item.data_source || 'unknown',
      recorded_at: item.datetime || item.start_datetime || new Date().toISOString(),
      raw_payload: item,
    };

    switch (data_type) {
      case 'heart_rate_summary':
      case 'heart_rate_event':
        rows.push({ ...base, heart_rate: item.avg_heart_rate_bpm || item.heart_rate_bpm });
        break;

      case 'oxygenation_summary':
      case 'oxygenation_event':
        rows.push({ ...base, spo2: item.avg_saturation_percentage || item.saturation_percentage });
        break;

      case 'blood_pressure_summary':
      case 'blood_pressure_event':
        rows.push({
          ...base,
          systolic_bp: item.systolic_blood_pressure_mmhg,
          diastolic_bp: item.diastolic_blood_pressure_mmhg,
        });
        break;

      case 'blood_glucose_summary':
      case 'blood_glucose_event':
        rows.push({ ...base, blood_glucose: item.blood_glucose_mg_per_dl });
        break;

      case 'body_temperature_summary':
      case 'body_temperature_event':
        rows.push({ ...base, temperature: item.body_temperature_celsius });
        break;

      case 'physical_summary':
        rows.push({ ...base, steps: item.steps });
        break;

      case 'sleep_summary':
        rows.push({ ...base, sleep_minutes: item.sleep_duration_in_minutes });
        break;

      default:
        // Unknown type — store raw so nothing is lost
        rows.push(base);
    }
  }

  return rows;
}

module.exports = { parseRookPayload };
