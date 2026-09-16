import { useParams } from 'react-router';

import { STUDY_METHODS } from '@/lib/constants';
import type { StudyMethod } from '@shared/types';

import ActiveRecallStudy from './study-methods/active-recall/ActiveRecallStudy';
import BlurtingStudy from './study-methods/blurting/BlurtingStudy';
import DeepWorkStudy from './study-methods/deep-work/DeepWorkStudy';
import FlowtimeStudy from './study-methods/flowtime/FlowtimeStudy';
import PomodoroStudy from './study-methods/pomodoro/PomodoroStudy';

const METHOD_COMPONENTS = {
  pomodoro: PomodoroStudy,
  deep_work: DeepWorkStudy,
  active_recall: ActiveRecallStudy,
  flowtime: FlowtimeStudy,
  blurting: BlurtingStudy,
} satisfies Record<StudyMethod, React.ComponentType>;

export default function StudyPage() {
  const { method } = useParams<{ method: string }>();
  const isValidMethod = method !== undefined && method in STUDY_METHODS;
  
  if (!isValidMethod) {
    return (
      <div className="flex h-full w-full items-center justify-center p-10">
        <p className="text-muted-foreground">Unknown study method: {method}</p>
      </div>
    );
  }

  const MethodComponent = METHOD_COMPONENTS[method as StudyMethod];
  
  return (
    <div className="h-full w-full">
      <MethodComponent />
    </div>
  );
}