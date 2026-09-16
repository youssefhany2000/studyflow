import { describe, expect, it } from 'vitest';

import { getTodayDate } from '@/lib/date';
import type { StudySession, StudyMethod } from '@shared/types';

import { deriveDailyBreakdown, deriveMethodBreakdown } from './deriveAnalytics';

function makeSession(overrides: Partial<StudySession>): StudySession {
  return {
    id: 1,
    subject_id: 1,
    method: 'pomodoro',
    status: 'completed',
    started_at: new Date().toISOString(),
    ended_at: null,
    duration_seconds: 1500,
    mood: null,
    productivity_score: null,
    interruptions_count: 0,
    notes: '',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('deriveDailyBreakdown', () => {
  it('sums duration for sessions on the same local day', () => {
    const iso = new Date().toISOString();
    const points = deriveDailyBreakdown(
      [makeSession({ started_at: iso, duration_seconds: 1200 }), makeSession({ started_at: iso, duration_seconds: 600 })],
      1,
    );
    expect(points[0].minutes).toBe(30);
  });

  it('ignores sessions that are not completed', () => {
    const points = deriveDailyBreakdown([makeSession({ status: 'abandoned', duration_seconds: 1200 })], 1);
    expect(points[0].minutes).toBe(0);
  });

  it('averages productivity scores, or returns null with no ratings', () => {
    const iso = new Date().toISOString();
    const withRatings = deriveDailyBreakdown(
      [makeSession({ started_at: iso, productivity_score: 6 }), makeSession({ started_at: iso, productivity_score: 8 })],
      1,
    );
    expect(withRatings[0].avgProductivity).toBe(7);

    const withoutRatings = deriveDailyBreakdown([makeSession({ productivity_score: null })], 1);
    expect(withoutRatings[0].avgProductivity).toBeNull();
  });

  it('returns one point per requested day, chronologically, ending today', () => {
    const points = deriveDailyBreakdown([], 7);
    expect(points).toHaveLength(7);
    expect(points[6].date).toBe(getTodayDate());
    for (let i = 1; i < points.length; i++) {
      expect(points[i].date > points[i - 1].date).toBe(true);
    }
  });
});

describe('deriveMethodBreakdown', () => {
  const methods: StudyMethod[] = ['pomodoro', 'flowtime', 'deep_work', 'active_recall', 'blurting'];

  it('includes every requested method even with zero sessions', () => {
    const result = deriveMethodBreakdown([], methods);
    expect(result).toHaveLength(6);
    expect(result.every((r) => r.count === 0 && r.minutes === 0)).toBe(true);
  });

  it('groups totals by method correctly', () => {
    const result = deriveMethodBreakdown(
      [
        makeSession({ method: 'pomodoro', duration_seconds: 1500 }),
        makeSession({ method: 'pomodoro', duration_seconds: 1500 }),
        makeSession({ method: 'blurting', duration_seconds: 600 }),
      ],
      methods,
    );
    expect(result.find((r) => r.method === 'pomodoro')).toMatchObject({ count: 2, minutes: 50 });
    expect(result.find((r) => r.method === 'blurting')).toMatchObject({ count: 1, minutes: 10 });
  });

  it('ignores non-completed sessions', () => {
    const result = deriveMethodBreakdown([makeSession({ method: 'pomodoro', status: 'planned' })], methods);
    expect(result.find((r) => r.method === 'pomodoro')?.count).toBe(0);
  });
});
