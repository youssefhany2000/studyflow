// Kept dependency-free (no @shared/types import) since tailwind.config.ts
// loads this outside Vite's own module resolution and can't rely on its
// path aliases.
export const METHOD_COLORS = {
  pomodoro: '#C2410C',
  flowtime: '#0E7490',
  deep_work: '#3730A3',
  active_recall: '#7E22CE',
  blurting: '#BE185D',
} as const;
