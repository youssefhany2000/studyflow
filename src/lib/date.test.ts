import { describe, expect, it } from 'vitest';

import { formatLocalDate, getCurrentWeekStartDate, getDaysAgoDate, getTodayDate, getWeekStart } from './date';

describe('formatLocalDate', () => {
  it('pads single-digit months and days', () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('reads local calendar fields, not UTC — the exact thing toISOString().slice(0, 10) gets wrong near midnight', () => {
    const d = new Date(2026, 7, 22, 0, 30); // Aug 22 2026, 00:30, local time
    expect(formatLocalDate(d)).toBe('2026-08-22');
  });
});

describe('getWeekStart', () => {
  // Aug 22, 2026 is a Saturday.
  it('returns the same date when given a Saturday', () => {
    expect(formatLocalDate(getWeekStart(new Date(2026, 7, 22)))).toBe('2026-08-22');
  });

  it('returns the previous Saturday when given a Sunday', () => {
    expect(formatLocalDate(getWeekStart(new Date(2026, 7, 23)))).toBe('2026-08-22');
  });

  it('returns the previous Saturday when given a Friday', () => {
    expect(formatLocalDate(getWeekStart(new Date(2026, 7, 28)))).toBe('2026-08-22');
  });

  it('zeroes out the time component', () => {
    const result = getWeekStart(new Date(2026, 7, 22, 14, 30, 0));
    expect([result.getHours(), result.getMinutes(), result.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe('getCurrentWeekStartDate', () => {
  it('always lands on a Saturday', () => {
    const parsed = new Date(`${getCurrentWeekStartDate()}T00:00:00`);
    expect(parsed.getDay()).toBe(6); // 0=Sun ... 6=Sat
  });
});

describe('getTodayDate', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(getTodayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDaysAgoDate', () => {
  it('returns today for an offset of 0', () => {
    expect(getDaysAgoDate(0)).toBe(getTodayDate());
  });

  it('returns a date strictly before today for a positive offset', () => {
    expect(getDaysAgoDate(10) < getTodayDate()).toBe(true);
  });
});
