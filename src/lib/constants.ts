import type { StudyMethod } from '@shared/types';

export const STUDY_METHODS: Record<StudyMethod, { label: string; borderClass: string; dotClass: string }> = {
  pomodoro: { label: 'Pomodoro', borderClass: 'border-method-pomodoro', dotClass: 'bg-method-pomodoro' },
  flowtime: { label: 'Flowtime', borderClass: 'border-method-flowtime', dotClass: 'bg-method-flowtime' },
  deep_work: { label: 'Deep Work', borderClass: 'border-method-deep-work', dotClass: 'bg-method-deep-work' },
  active_recall: {
    label: 'Active Recall',
    borderClass: 'border-method-active-recall',
    dotClass: 'bg-method-active-recall',
  },
  blurting: { label: 'Blurting', borderClass: 'border-method-blurting', dotClass: 'bg-method-blurting' },
};
