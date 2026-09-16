import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { WeakConcept, AddConceptInput } from '@shared/types';
import { createSelector } from '@reduxjs/toolkit';

interface SRSState {
  concepts: WeakConcept[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: SRSState = {
  concepts: [],
  status: 'idle',
  error: null,
};

// 1. Fetch concepts from SQLite using the secure bridge
export const fetchSRSConcepts = createAsyncThunk('srs/fetchConcepts', async () => {
  return (await (window as any).api.srs.list()) as WeakConcept[];
});

// 2. Add new weak concepts using the secure bridge
export const addWeakConcepts = createAsyncThunk(
  'srs/addConcepts',
  async (concepts: AddConceptInput[], { dispatch }) => {
    await (window as any).api.srs.addConcepts(concepts);
    // Refresh the list immediately after adding
    dispatch(fetchSRSConcepts());
  }
);

// 3. Review a concept using the secure bridge
export const reviewConcept = createAsyncThunk(
  'srs/reviewConcept',
  async (input: { id: number; passed: boolean }) => {
    return (await (window as any).api.srs.reviewConcept(input)) as WeakConcept;
  }
);

const srsSlice = createSlice({
  name: 'srs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSRSConcepts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSRSConcepts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.concepts = action.payload;
      })
      .addCase(fetchSRSConcepts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      // Update UI instantly when a review is submitted
      .addCase(reviewConcept.fulfilled, (state, action) => {
        const updatedConcept = action.payload;
        const index = state.concepts.findIndex((c) => c.id === updatedConcept.id);
        if (index !== -1) {
          state.concepts[index] = updatedConcept;
        }
      });
  },
});

export default srsSlice.reducer;

// Selectors
export const selectAllSRSConcepts = (state: RootState) => state.srs.concepts;

export const selectDueSRSConcepts = createSelector(
  [selectAllSRSConcepts],
  (concepts) => {
    // Midnight Unlock: Grab everything scheduled for today or earlier
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const cutoff = endOfToday.toISOString();
    
    return concepts.filter((c) => c.next_review_date <= cutoff);
  }
);