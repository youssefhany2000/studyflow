import { configureStore } from '@reduxjs/toolkit';

import analyticsReducer from '@/features/analytics/analyticsSlice';
import goalsReducer from '@/features/goals/goalsSlice';
import plannerReducer from '@/features/planner/plannerSlice';
import sessionsReducer from '@/features/sessions/sessionsSlice';
import subjectsReducer from '@/features/subjects/subjectsSlice';
import srsReducer from '../features/srs/srsSlice';

export const store = configureStore({
  reducer: {
    subjects: subjectsReducer,
    goals: goalsReducer,
    sessions: sessionsReducer,
    planner: plannerReducer,
    analytics: analyticsReducer,
    srs: srsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

