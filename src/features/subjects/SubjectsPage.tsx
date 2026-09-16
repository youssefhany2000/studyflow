import { useEffect, useState, type FormEvent } from 'react';
import { Archive, Plus } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

import { archiveSubject, createSubject, fetchSubjects, selectSubjects, selectSubjectsStatus } from './subjectsSlice';

export default function SubjectsPage() {
  const dispatch = useAppDispatch();
  const subjects = useAppSelector(selectSubjects);
  const status = useAppSelector(selectSubjectsStatus);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0F6E5D');
  const [weeklyGoal, setWeeklyGoal] = useState('');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchSubjects());
  }, [status, dispatch]);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch(
      createSubject({
        name: name.trim(),
        color,
        weekly_goal_minutes: weeklyGoal ? Number(weeklyGoal) : null,
      }),
    );
    setName('');
    setWeeklyGoal('');
    setShowForm(false);
  }

  return (
    <div className="space-y-6 p-10 w-full h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">Subjects</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} />
          Add subject
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New subject</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-[2fr_auto_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="subject-name">Name</Label>
                <Input
                  id="subject-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Biology"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-color">Color</Label>
                <input
                  id="subject-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-14 rounded-md border border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-goal">Weekly goal (min)</Label>
                <Input
                  id="subject-goal"
                  type="number"
                  min={0}
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {status === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
      {status === 'failed' && <p className="text-sm text-red-600">Couldn't load subjects.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <Card key={subject.id} className="border-l-4" style={{ borderLeftColor: subject.color }}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{subject.name}</CardTitle>
              <button
                onClick={() => dispatch(archiveSubject(subject.id))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Archive ${subject.name}`}
              >
                <Archive size={14} />
              </button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {subject.weekly_goal_minutes ? `${subject.weekly_goal_minutes} min/week goal` : 'No weekly goal set'}
              </p>
            </CardContent>
          </Card>
        ))}
        {status === 'succeeded' && subjects.length === 0 && (
          <p className="text-sm text-muted-foreground">No subjects yet — add your first one above.</p>
        )}
      </div>
    </div>
  );
}