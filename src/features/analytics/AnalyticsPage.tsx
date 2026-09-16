import { useEffect, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { STUDY_METHODS } from '@/lib/constants';
import { METHOD_COLORS } from '@/lib/methodColors';
import type { StudyMethod } from '@shared/types';

import { fetchSessions, selectSessions } from '../sessions/sessionsSlice';
import { deriveDailyBreakdown, deriveMethodBreakdown } from './deriveAnalytics';

const DAYS = 14;
const ALL_METHODS = Object.keys(STUDY_METHODS) as StudyMethod[];

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};
const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export default function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const sessions = useAppSelector(selectSessions);

  useEffect(() => {
    dispatch(fetchSessions());
  }, [dispatch]);

  const dailyBreakdown = useMemo(() => deriveDailyBreakdown(sessions, DAYS), [sessions]);
  const methodBreakdown = useMemo(() => deriveMethodBreakdown(sessions, ALL_METHODS), [sessions]);
  const hasProductivityData = dailyBreakdown.some((d) => d.avgProductivity !== null);

  return (
    <div className="space-y-6 p-10">
      <h1 className="text-2xl font-display">Analytics</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Study time — last {DAYS} days</CardTitle>
          <CardDescription>Minutes of completed study per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              {/* Used 'any' to bypass strict recharts typing issues */}
              <Tooltip formatter={(value: any) => [`${value} min`, 'Study time']} contentStyle={chartTooltipStyle} />
              <Bar dataKey="minutes" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {hasProductivityData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productivity trend</CardTitle>
            <CardDescription>Average self-rated productivity per day (1-10)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: any) => [value ?? '—', 'Avg. productivity']} contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="avgProductivity" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time by method</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={methodBreakdown} layout="vertical" margin={{ left: 16 }}>
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="method"
                tickFormatter={(m: StudyMethod) => STUDY_METHODS[m].label}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip formatter={(value: any) => [`${value} min`, 'Time']} contentStyle={chartTooltipStyle} />
              <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                {methodBreakdown.map((entry) => (
                  <Cell key={entry.method} fill={METHOD_COLORS[entry.method]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}