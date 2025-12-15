import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import jobSlice from './slices/jobSlice';
import messageSlice from './slices/messageSlice';
import navigationSlice from './slices/navigationSlice';
import cacheSlice from './slices/cacheSlice';
import paymentSlice from './slices/paymentSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    jobs: jobSlice,
    messages: messageSlice,
    navigation: navigationSlice,
    cache: cacheSlice,
    payment: paymentSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;