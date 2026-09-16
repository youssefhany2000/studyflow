import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';
import type {
  PomodoroCycle,
  SessionStage,
  StudySession,
  StudySessionCreateInput,
  StudySessionUpdateInput,
  StudySessionWithChildren,
} from '@shared/types';

interface SessionsState {
  items: StudySession[];
  currentDetail: StudySessionWithChildren | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  activeSession: { id: number; method: string; startedAt: number; subjectId: number; phase: string } | null;
}

const initialState: SessionsState = { 
  items: [], 
  currentDetail: null, 
  status: 'idle', 
  error: null,
  activeSession: null 
};

export const fetchSessions = createAsyncThunk('sessions/fetch', async (method?: string) => window.api.sessions.list(method));

export const fetchSessionDetail = createAsyncThunk('sessions/fetchDetail', async (id: number) => window.api.sessions.get(id));

export const startSession = createAsyncThunk('sessions/start', async (input: StudySessionCreateInput) =>
  window.api.sessions.create(input),
);

export const finishSession = createAsyncThunk(
  'sessions/finish',
  async ({ id, ...input }: StudySessionUpdateInput & { id: number }) => window.api.sessions.update(id, input),
);

//  Delete Session Thunk
export const deleteSession = createAsyncThunk(
  'sessions/delete',
  async (id: number) => {
    await window.api.sessions.delete(id); // Assuming you have a delete method in your Electron/IPC API
    return id;
  }
);

export const addSessionStage = createAsyncThunk(
  'sessions/addStage',
  async (args: { sessionId: number; stage_name: string; stage_order: number; content?: string | null }) => {
    const { sessionId, ...input } = args;
    return window.api.sessions.stages.create(sessionId, input);
  },
);

export const addPomodoroCycle = createAsyncThunk(
  'sessions/addPomodoroCycle',
  async (args: { sessionId: number; cycle_number: number; type: string; planned_minutes: number }) => {
    const { sessionId, ...input } = args;
    return window.api.sessions.pomodoroCycles.create(sessionId, input);
  },
);

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setActiveSession: (state, action: PayloadAction<{ id: number; method: string; startedAt: number; subjectId: number; phase: string }>) => {
      state.activeSession = action.payload;
    },
    clearActiveSession: (state) => {
      state.activeSession = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load sessions';
      })
      .addCase(fetchSessionDetail.fulfilled, (state, action) => {
        state.currentDetail = action.payload;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(finishSession.fulfilled, (state, action) => {
        const idx = state.items.findIndex((s) => s.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      // Handle the delete action by filtering it out of the state array
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.items = state.items.filter(session => session.id !== action.payload);
      });
  },
});

export const { setActiveSession, clearActiveSession } = sessionsSlice.actions;

export default sessionsSlice.reducer;

export const selectSessions = (state: RootState) => state.sessions.items;
export const selectSessionsStatus = (state: RootState) => state.sessions.status;
export const selectCurrentSessionDetail = (state: RootState) => state.sessions.currentDetail;
export const selectActiveSession = (state: RootState) => state.sessions.activeSession;