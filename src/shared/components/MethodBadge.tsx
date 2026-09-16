import { Badge } from '@/shared/components/ui/badge';
import { STUDY_METHODS } from '@/lib/constants';
import type { StudyMethod } from '@shared/types';

export function MethodBadge({ method }: { method: string }) {
  // Safe fallback for deleted methods like 'feynman'
  const methodData = STUDY_METHODS[method as StudyMethod] || {
    label: 'Unknown Method',
    dotClass: 'bg-gray-500', 
  };

  return (
    <Badge variant="outline" className="gap-1.5 border-transparent bg-muted">
      <span
        className={`h-2 w-2 rounded-full ${methodData.dotClass}`}
        aria-hidden="true"
      />
      {methodData.label}
    </Badge>
  );
}