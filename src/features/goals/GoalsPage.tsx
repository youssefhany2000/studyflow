import { useEffect, useState, type FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { getCurrentWeekStartDate, getTodayDate } from '@/lib/date';

import { fetchGoals, saveDailyGoal, saveWeeklyGoal, selectDailyGoalFor, selectWeeklyGoalFor } from './goalsSlice';

export default function GoalsPage() {
  const dispatch = useAppDispatch();
  const today = getTodayDate();
  const weekStart = getCurrentWeekStartDate();

  const dailyGoal = useAppSelector(selectDailyGoalFor(today));
  const weeklyGoal = useAppSelector(selectWeeklyGoalFor(weekStart));

  const [dailyInput, setDailyInput] = useState('60');
  const [weeklyInput, setWeeklyInput] = useState('300');

  useEffect(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  useEffect(() => {
    if (dailyGoal) setDailyInput(String(dailyGoal.target_minutes));
  }, [dailyGoal]);

  useEffect(() => {
    if (weeklyGoal) setWeeklyInput(String(weeklyGoal.target_minutes));
  }, [weeklyGoal]);

  function handleDailySubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(saveDailyGoal({ date: today, target_minutes: Number(dailyInput) }));
  }

  function handleWeeklySubmit(e: FormEvent) {
    e.preventDefault();
    dispatch(saveWeeklyGoal({ week_start_date: weekStart, target_minutes: Number(weeklyInput) }));
  }

  return (
    <div className="space-y-6 p-10 w-full h-full">
      <h1 className="text-2xl font-display">Goals</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>{today}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDailySubmit} className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="daily-target">Target (minutes)</Label>
                <Input
                  id="daily-target"
                  type="number"
                  min={0}
                  value={dailyInput}
                  onChange={(e) => setDailyInput(e.target.value)}
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
            {dailyGoal && <p className="mt-3 text-sm text-muted-foreground">Current target: {dailyGoal.target_minutes} min</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This week</CardTitle>
            <CardDescription>Week of {weekStart} (Saturday–Friday)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWeeklySubmit} className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="weekly-target">Target (minutes)</Label>
                <Input
                  id="weekly-target"
                  type="number"
                  min={0}
                  value={weeklyInput}
                  onChange={(e) => setWeeklyInput(e.target.value)}
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
            {weeklyGoal && <p className="mt-3 text-sm text-muted-foreground">Current target: {weeklyGoal.target_minutes} min</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}