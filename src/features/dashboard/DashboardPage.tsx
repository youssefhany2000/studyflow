import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MethodBadge } from '@/shared/components/MethodBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { formatLocalDate, getCurrentWeekStartDate, getTodayDate, getWeekStart } from '@/lib/date';
import { formatDuration } from '@/lib/format';

import { fetchStreak, selectStreak } from '../analytics/analyticsSlice';
import { fetchGoals, selectDailyGoalFor, selectWeeklyGoalFor } from '../goals/goalsSlice';
import { fetchSessions, selectSessions } from '../sessions/sessionsSlice';
import { fetchSubjects, selectSubjects } from '../subjects/subjectsSlice';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const today = getTodayDate();
  const weekStart = getCurrentWeekStartDate();

  const sessions = useAppSelector(selectSessions);
  const subjects = useAppSelector(selectSubjects);
  const dailyGoal = useAppSelector(selectDailyGoalFor(today));
  const weeklyGoal = useAppSelector(selectWeeklyGoalFor(weekStart));
  const streak = useAppSelector(selectStreak);

  useEffect(() => {
    dispatch(fetchSessions());
    dispatch(fetchSubjects());
    dispatch(fetchGoals());
    dispatch(fetchStreak());
  }, [dispatch]);

  const subjectLookup = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const todaySeconds = useMemo(
    () =>
      sessions
        .filter((s) => s.status === 'completed' && formatLocalDate(new Date(s.started_at)) === today)
        .reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0),
    [sessions, today],
  );

  const weekSeconds = useMemo(() => {
    const start = getWeekStart(new Date());
    const nextStart = new Date(start);
    nextStart.setDate(start.getDate() + 7);
    return sessions
      .filter((s) => {
        if (s.status !== 'completed') return false;
        const started = new Date(s.started_at);
        return started >= start && started < nextStart;
      })
      .reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0);
  }, [sessions]);

  const summary = useMemo(() => {
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const total_seconds = completedSessions.reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0);

    const subjectMap: Record<number, { name: string; total_seconds: number }> = {};
    for (const s of completedSessions) {
      const subj = subjectLookup[s.subject_id];
      const name = subj ? subj.name : 'Unknown Subject';
      if (!subjectMap[s.subject_id]) {
        subjectMap[s.subject_id] = { name, total_seconds: 0 };
      }
      subjectMap[s.subject_id].total_seconds += (Number(s.duration_seconds) || 0);
    }

    let mostStudiedSubject: { name: string; total_seconds: number } | null = null;
    let maxSubjectSeconds = -1;
    for (const data of Object.values(subjectMap)) {
      if (data.total_seconds > maxSubjectSeconds) {
        maxSubjectSeconds = data.total_seconds;
        mostStudiedSubject = data;
      }
    }

    const methodMap: Record<string, { method: any; count: number; seconds: number }> = {};
    for (const s of completedSessions) {
      if (!methodMap[s.method]) {
        methodMap[s.method] = { method: s.method, count: 0, seconds: 0 };
      }
      methodMap[s.method].count += 1;
      methodMap[s.method].seconds += (Number(s.duration_seconds) || 0);
    }

    let mostUsedMethod: { method: any; count: number; seconds: number } | null = null;
    let maxMethodCount = -1;
    for (const data of Object.values(methodMap)) {
      if (data.count > maxMethodCount) {
        maxMethodCount = data.count;
        mostUsedMethod = data;
      }
    }

    return { total_seconds, mostStudiedSubject, mostUsedMethod };
  }, [sessions, subjectLookup]);

  return (
    <div className="space-y-6 p-10 w-full h-full">
      <h1 className="text-2xl font-display">Dashboard</h1>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressCard label="Today" seconds={todaySeconds} targetSeconds={(dailyGoal?.target_minutes ?? 0) * 60} />
        <ProgressCard label="This week" seconds={weekSeconds} targetSeconds={(weeklyGoal?.target_minutes ?? 0) * 60} />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Streak</p>
            <p className="mt-1 text-xl font-display">
              {streak} {streak === 1 ? 'day' : 'days'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">All-Time Studied</p>
            <p className="mt-1 text-xl font-display">{formatDuration(summary.total_seconds)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most studied subject</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.mostStudiedSubject ? (
              <div className="flex items-center justify-between">
                <span className="font-medium">{summary.mostStudiedSubject.name}</span>
                <span className="text-sm text-muted-foreground">{formatDuration(summary.mostStudiedSubject.total_seconds)}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most used method</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.mostUsedMethod ? (
              <div className="flex items-center justify-between">
                <MethodBadge method={summary.mostUsedMethod.method} />
                <span className="text-sm text-muted-foreground">
                  {summary.mostUsedMethod.count} {summary.mostUsedMethod.count === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {sessions.slice(0, 5).map((session) => {
            const subject = subjectLookup[session.subject_id];
            return (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="flex items-center justify-between border-b border-border py-2 last:border-0 hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{subject?.name ?? 'Unknown'}</span>
                  <MethodBadge method={session.method} />
                </div>
                <span className="text-sm text-muted-foreground">{formatDuration(Number(session.duration_seconds) || 0)}</span>
              </Link>
            );
          })}
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">No sessions logged yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressCard({ label, seconds, targetSeconds }: { label: string; seconds: number; targetSeconds: number }) {
  const pct = targetSeconds > 0 ? Math.min(100, Math.round((seconds / targetSeconds) * 100)) : 0;
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-display">{formatDuration(seconds)}</p>
        {targetSeconds > 0 && (
          <>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">of {formatDuration(targetSeconds)} goal</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}