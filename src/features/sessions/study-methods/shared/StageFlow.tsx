import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';

import { RatingInput } from './RatingInput';

export interface StageDef {
  name: string;
  label: string;
  prompt: string;
  /** Self-assessment-style stages capture a 1-5 rating alongside optional text. */
  hasRating?: boolean;
}

export interface StageResult {
  stage_name: string;
  content: string | null;
  rating: number | null;
}

export function StageFlow({
  stages,
  onComplete,
}: {
  stages: StageDef[];
  onComplete: (results: StageResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<StageResult[]>([]);
  const [text, setText] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  const stage = stages[index];
  const isLast = index === stages.length - 1;

  function handleNext() {
    const next = [...results, { stage_name: stage.name, content: text || null, rating }];
    setText('');
    setRating(null);

    if (isLast) {
      onComplete(next);
    } else {
      setResults(next);
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {stages.map((s, i) => (
          <div key={s.name} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{stage.label}</CardTitle>
          <CardDescription>{stage.prompt}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage.hasRating && <RatingInput value={rating} onChange={setRating} max={5} />}
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Type here..." />
          <Button onClick={handleNext}>{isLast ? 'Finish' : 'Next'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
