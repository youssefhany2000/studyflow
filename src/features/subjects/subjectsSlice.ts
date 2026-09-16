import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RootState } from '@/app/store';
import type { Subject, SubjectInput } from '@shared/types';

interface SubjectsState {
  items: Subject[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SubjectsState = { items: [], status: 'idle', error: null };

export const fetchSubjects = createAsyncThunk('subjects/fetch', async (includeArchived?: boolean) =>
  window.api.subjects.list(includeArchived ?? false),
);

export const createSubject = createAsyncThunk('subjects/create', async (input: SubjectInput) =>
  window.api.subjects.create(input),
);

export const archiveSubject = createAsyncThunk('subjects/archive', async (id: number) => {
  await window.api.subjects.delete(id);
  return id;
});

const subjectsSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load subjects';
      })
      .addCase(createSubject.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(archiveSubject.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
      });
  },
});

export default subjectsSlice.reducer;

export const selectSubjects = (state: RootState) => state.subjects.items;
export const selectSubjectsStatus = (state: RootState) => state.subjects.status;