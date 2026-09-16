import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';
import type { DailyGoal, WeeklyGoal } from '@shared/types';

interface GoalsState {
  daily: DailyGoal[];
  weekly: WeeklyGoal[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: GoalsState = { daily: [], weekly: [], status: 'idle' };

export const fetchGoals = createAsyncThunk('goals/fetch', async () => {
  const [daily, weekly] = await Promise.all([window.api.goals.daily.list(), window.api.goals.weekly.list()]);
  return { daily, weekly };
});

export const saveDailyGoal = createAsyncThunk('goals/saveDaily', async (input: { date: string; target_minutes: number }) =>
  window.api.goals.daily.upsert(input),
);

export const saveWeeklyGoal = createAsyncThunk(
  'goals/saveWeekly',
  async (input: { week_start_date: string; target_minutes: number }) => window.api.goals.weekly.upsert(input),
);

const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.daily = action.payload.daily;
        state.weekly = action.payload.weekly;
      })
      .addCase(saveDailyGoal.fulfilled, (state, action) => {
        const idx = state.daily.findIndex((g) => g.date === action.payload.date);
        if (idx >= 0) state.daily[idx] = action.payload;
        else state.daily.push(action.payload);
      })
      .addCase(saveWeeklyGoal.fulfilled, (state, action) => {
        const idx = state.weekly.findIndex((g) => g.week_start_date === action.payload.week_start_date);
        if (idx >= 0) state.weekly[idx] = action.payload;
        else state.weekly.push(action.payload);
      });
  },
});

export default goalsSlice.reducer;

export const selectDailyGoalFor = (date: string) => (state: RootState) =>
  state.goals.daily.find((g) => g.date === date) ?? null;
export const selectWeeklyGoalFor = (weekStart: string) => (state: RootState) =>
  state.goals.weekly.find((g) => g.week_start_date === weekStart) ?? null;
