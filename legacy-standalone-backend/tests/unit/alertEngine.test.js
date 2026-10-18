const { classifySeverity } = require('../../src/services/alertEngine');

describe('classifySeverity', () => {
  it('returns warning for a value just past the max threshold', () => {
    // range = 180 - 40 = 140, deviation = 185 - 180 = 5 -> 5/140 ~ 3.6% (< 20%)
    expect(classifySeverity(185, 40, 180)).toBe('warning');
  });

  it('returns critical when the deviation exceeds 20% of the threshold range', () => {
    // range = 140, need deviation > 28 to cross 20%
    expect(classifySeverity(220, 40, 180)).toBe('critical');
  });

  it('returns warning when min and max are equal (no usable range)', () => {
    expect(classifySeverity(50, 50, 50)).toBe('warning');
  });

  it('classifies a below-minimum value using the same deviation logic', () => {
    // range = 140, deviation = 40 - 5 = 35 -> 35/140 = 25% (> 20%) -> critical
    expect(classifySeverity(5, 40, 180)).toBe('critical');
  });
});
