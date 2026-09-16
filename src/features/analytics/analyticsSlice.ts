import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';
import type { AnalyticsSummary } from '@shared/types';

interface AnalyticsState {
  summary: AnalyticsSummary | null;
  streak: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AnalyticsState = { summary: null, streak: 0, status: 'idle' };

export const fetchAnalyticsSummary = createAsyncThunk('analytics/fetchSummary', async (range: { from: string; to: string }) =>
  window.api.analytics.summary(range),
);

export const fetchStreak = createAsyncThunk('analytics/fetchStreak', async () => window.api.analytics.streak());

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.summary = action.payload;
      })
      .addCase(fetchStreak.fulfilled, (state, action) => {
        state.streak = action.payload.streak;
      });
  },
});

export default analyticsSlice.reducer;

export const selectAnalyticsSummary = (state: RootState) => state.analytics.summary;
export const selectStreak = (state: RootState) => state.analytics.streak;
