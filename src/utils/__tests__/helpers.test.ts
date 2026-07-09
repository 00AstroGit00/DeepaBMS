import { inr, parseNum, dateKey, uid, daysBetween } from '../helpers';

describe('Helper Utilities', () => {
  test('inr currency formatting', () => {
    expect(inr(1500)).toBe('₹1,500');
    expect(inr(-500)).toBe('-₹500');
    expect(inr(0)).toBe('₹0');
  });

  test('parseNum cleaning and conversion', () => {
    expect(parseNum('₹1,500.50')).toBe(1500.5);
    expect(parseNum('abc')).toBe(0);
    expect(parseNum(123.45)).toBe(123.45);
    expect(parseNum('')).toBe(0);
  });

  test('dateKey date formatting', () => {
    const testDate = new Date('2026-07-08T12:00:00Z');
    expect(dateKey(testDate)).toBe('2026-07-08');
  });

  test('daysBetween range array generator', () => {
    const dates = daysBetween('2026-07-01', '2026-07-03');
    expect(dates).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
  });

  test('uid length and format', () => {
    const id = uid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThanOrEqual(8);
  });
});
