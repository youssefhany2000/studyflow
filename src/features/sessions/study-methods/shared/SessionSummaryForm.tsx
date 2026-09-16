import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';

export interface SessionSummaryData {
  mood: number;
  productivity: number;
  notes: string;
}

interface SessionSummaryFormProps {
  durationSeconds: number;
  onFinish: (data: SessionSummaryData) => void;
}

export function SessionSummaryForm({ durationSeconds, onFinish }: SessionSummaryFormProps) {
  const [mood, setMood] = useState(5);
  const [productivity, setProductivity] = useState(10);
  const [notes, setNotes] = useState('');

  const minutes = Math.round(durationSeconds / 60);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onFinish({
      mood,
      productivity,
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6 p-10">
      <h2 className="text-2xl font-display">Session Complete</h2>
      <p className="text-sm text-muted-foreground">You focused for {minutes} minutes. How did it go?</p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Mood (1-5)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((m) => (
            <Button
              key={m}
              type="button"
              variant={mood === m ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setMood(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Productivity (1-10)</label>
        <div className="flex w-full gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
            <Button
              key={p}
              type="button"
              variant={productivity === p ? 'default' : 'outline'}
              className="flex-1 px-0"
              onClick={() => setProductivity(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you work on? Any key takeaways?"
          className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <Button type="submit" variant="outline" className="w-full">
        Save Session
      </Button>
    </form>
  );
}