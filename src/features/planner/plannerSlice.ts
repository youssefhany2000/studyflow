import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';
import type { PlannedSession } from '@shared/types';

interface PlannerState {
  items: PlannedSession[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: PlannerState = { items: [], status: 'idle' };

export const fetchPlannedSessions = createAsyncThunk('planner/fetch', async (range?: { from: string; to: string }) =>
  window.api.planner.list(range),
);

export const createPlannedSession = createAsyncThunk(
  'planner/create',
  async (input: {
    subject_id: number;
    method: string;
    planned_date: string;
    planned_start_time?: string | null;
    planned_duration_minutes: number;
  }) => window.api.planner.create(input),
);

export const deletePlannedSession = createAsyncThunk('planner/delete', async (id: number) => {
  await window.api.planner.delete(id);
  return id;
});

const plannerSlice = createSlice({
  name: 'planner',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlannedSessions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPlannedSessions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(createPlannedSession.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(deletePlannedSession.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
      });
  },
});

export default plannerSlice.reducer;

export const selectPlannedSessions = (state: RootState) => state.planner.items;
