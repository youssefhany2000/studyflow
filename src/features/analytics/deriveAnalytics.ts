import { formatLocalDate } from '@/lib/date';
import type { StudyMethod, StudySession } from '@shared/types';

export interface DailyPoint {
  date: string;
  minutes: number;
  avgProductivity: number | null;
}

export function deriveDailyBreakdown(sessions: StudySession[], days: number): DailyPoint[] {
  const byDate = new Map<string, StudySession[]>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = formatLocalDate(new Date(s.started_at));
    const existing = byDate.get(key);
    if (existing) existing.push(s);
    else byDate.set(key, [s]);
  }

  const points: DailyPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatLocalDate(d);
    const daySessions = byDate.get(key) ?? [];
    const minutes = Math.round(daySessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60);
    const ratings = daySessions.map((s) => s.productivity_score).filter((p): p is number => p !== null);
    const avgProductivity = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;
    points.push({ date: key, minutes, avgProductivity });
  }
  return points;
}

export interface MethodPoint {
  method: StudyMethod;
  minutes: number;
  count: number;
}

export function deriveMethodBreakdown(sessions: StudySession[], methods: StudyMethod[]): MethodPoint[] {
  const totals = new Map<StudyMethod, { seconds: number; count: number }>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const entry = totals.get(s.method) ?? { seconds: 0, count: 0 };
    entry.seconds += s.duration_seconds;
    entry.count += 1;
    totals.set(s.method, entry);
  }
  return methods.map((method) => {
    const entry = totals.get(method) ?? { seconds: 0, count: 0 };
    return { method, minutes: Math.round(entry.seconds / 60), count: entry.count };
  });
}
