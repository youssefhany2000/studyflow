import { useAppSelector } from '@/app/hooks';
import { selectSubjects } from '@/features/subjects/subjectsSlice';
import type { Subject } from '@shared/types';

export function SubjectPicker({ onSelect }: { onSelect: (subjectId: number) => void }) {
  const subjects = useAppSelector(selectSubjects) as Subject[];

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No subjects found. Please add a subject in the Subjects tab first!
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {subjects.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(Number(s.id))}
          className="rounded-md border-l-4 border-y border-r border-border py-2 pl-4 pr-4 text-sm font-medium hover:bg-muted transition-colors"
          style={{ borderLeftColor: s.color || '#7E22CE' }}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}