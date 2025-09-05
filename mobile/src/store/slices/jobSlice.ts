import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Job } from '@/types';

interface JobState {
  jobs: Job[];
  selectedJob: Job | null;
  isLoading: boolean;
  filters: {
    category?: string;
    location?: string;
    budgetMin?: number;
    budgetMax?: number;
  };
}

const initialState: JobState = {
  jobs: [],
  selectedJob: null,
  isLoading: false,
  filters: {},
};

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setJobs: (state, action: PayloadAction<Job[]>) => {
      state.jobs = action.payload;
    },
    addJob: (state, action: PayloadAction<Job>) => {
      state.jobs.unshift(action.payload);
    },
    updateJob: (state, action: PayloadAction<Job>) => {
      const index = state.jobs.findIndex(job => job.id === action.payload.id);
      if (index !== -1) {
        state.jobs[index] = action.payload;
      }
    },
    setSelectedJob: (state, action: PayloadAction<Job | null>) => {
      state.selectedJob = action.payload;
    },
    setFilters: (state, action: PayloadAction<JobState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
});

export const { 
  setLoading, 
  setJobs, 
  addJob, 
  updateJob, 
  setSelectedJob, 
  setFilters 
} = jobSlice.actions;
export default jobSlice.reducer;