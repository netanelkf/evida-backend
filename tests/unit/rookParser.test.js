const { parseRookPayload } = require('../../src/services/rookParser');

describe('parseRookPayload', () => {
  it('maps heart_rate_summary into a heart_rate row', () => {
    const payload = {
      rook_user_id: 'rook-123',
      data_type: 'heart_rate_summary',
      data: [{ avg_heart_rate_bpm: 72, datetime: '2026-01-01T00:00:00Z', source_device: 'fitbit' }],
    };
    const rows = parseRookPayload(payload);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rook_user_id: 'rook-123',
      heart_rate: 72,
      source: 'fitbit',
      recorded_at: '2026-01-01T00:00:00Z',
    });
  });

  it('maps blood_pressure_event into systolic/diastolic fields', () => {
    const payload = {
      rook_user_id: 'rook-123',
      data_type: 'blood_pressure_event',
      data: [{ systolic_blood_pressure_mmhg: 120, diastolic_blood_pressure_mmhg: 80 }],
    };
    const rows = parseRookPayload(payload);
    expect(rows[0]).toMatchObject({ systolic_bp: 120, diastolic_bp: 80 });
  });

  it('falls back to base fields for unknown data types without losing the row', () => {
    const payload = {
      rook_user_id: 'rook-123',
      data_type: 'something_new',
      data: [{ some_field: 42 }],
    };
    const rows = parseRookPayload(payload);
    expect(rows).toHaveLength(1);
    expect(rows[0].raw_payload).toEqual({ some_field: 42 });
  });

  it('returns an empty array when data is missing', () => {
    expect(parseRookPayload({ rook_user_id: 'x', data_type: 'heart_rate_summary' })).toEqual([]);
  });
});
