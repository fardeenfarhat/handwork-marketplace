import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Payment, PaymentMethod, WorkerEarnings, Payout } from '@/types';
import { paymentService } from '@/services/paymentService';

// Payment state interface
// Requirements: 9.1
export interface PaymentState {
  currentPayment: Payment | null;
  paymentMethods: PaymentMethod[];
  earnings: WorkerEarnings | null;
  payouts: Payout[];
  isLoading: boolean;
  error: string | null;
  // Additional loading states for specific operations
  isLoadingPaymentMethods: boolean;
  isLoadingEarnings: boolean;
  isLoadingPayouts: boolean;
  isProcessingPayment: boolean;
}

const initialState: PaymentState = {
  currentPayment: null,
  paymentMethods: [], // Always initialize as empty array
  earnings: null,
  payouts: [],
  isLoading: false,
  error: null,
  isLoadingPaymentMethods: false,
  isLoadingEarnings: false,
  isLoadingPayouts: false,
  isProcessingPayment: false,
};

// Async thunks for payment operations
// Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 5.1

/**
 * Fetch user's payment methods
 * Requirements: 2.3
 */
export const fetchPaymentMethods = createAsyncThunk(
  'payment/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      const methods = await paymentService.getPaymentMethods();
      return methods;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to fetch payment methods'
      );
    }
  }
);

/**
 * Add a new payment method
 * Requirements: 2.1, 2.2
 */
export const addPaymentMethod = createAsyncThunk(
  'payment/addPaymentMethod',
  async (paymentMethodId: string, { rejectWithValue }) => {
    try {
      const method = await paymentService.addPaymentMethod(paymentMethodId);
      return method;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add payment method');
    }
  }
);

/**
 * Set default payment method
 * Requirements: 2.4
 */
export const setDefaultPaymentMethod = createAsyncThunk(
  'payment/setDefaultPaymentMethod',
  async (paymentMethodId: string, { rejectWithValue, dispatch }) => {
    try {
      await paymentService.setDefaultPaymentMethod(paymentMethodId);
      // Refresh payment methods to get updated default status
      await dispatch(fetchPaymentMethods());
      return paymentMethodId;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to set default payment method'
      );
    }
  }
);

/**
 * Delete a payment method
 * Requirements: 2.5
 */
export const deletePaymentMethod = createAsyncThunk(
  'payment/deletePaymentMethod',
  async (paymentMethodId: string, { rejectWithValue }) => {
    try {
      await paymentService.deletePaymentMethod(paymentMethodId);
      return paymentMethodId;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to delete payment method'
      );
    }
  }
);

/**
 * Create a payment intent for a booking
 * Requirements: 1.3, 1.4
 */
export const createPaymentIntent = createAsyncThunk(
  'payment/createPaymentIntent',
  async (
    params: { bookingId: number; workingHours: number; hourlyRate: number },
    { rejectWithValue }
  ) => {
    try {
      const intent = await paymentService.createPaymentIntent(
        params.bookingId,
        params.workingHours,
        params.hourlyRate
      );
      return intent;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'Failed to create payment intent'
      );
    }
  }
);

/**
 * Confirm payment after Stripe SDK confirmation
 * Requirements: 1.5
 */
export const confirmPayment = createAsyncThunk(
  'payment/confirmPayment',
  async (
    params: { paymentIntentId: string; bookingId: number },
    { rejectWithValue }
  ) => {
    try {
      const payment = await paymentService.confirmPayment(
        params.paymentIntentId,
        params.bookingId
      );
      return payment;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to confirm payment');
    }
  }
);

/**
 * Release payment from escrow
 * Requirements: 3.3, 3.4
 */
export const releasePayment = createAsyncThunk(
  'payment/releasePayment',
  async (paymentId: number, { rejectWithValue }) => {
    try {
      const payment = await paymentService.releasePayment(paymentId);
      return payment;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to release payment');
    }
  }
);

/**
 * Fetch worker earnings summary
 * Requirements: 4.1
 */
export const fetchEarnings = createAsyncThunk(
  'payment/fetchEarnings',
  async (_, { rejectWithValue }) => {
    try {
      const earnings = await paymentService.getEarnings();
      return earnings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch earnings');
    }
  }
);

/**
 * Request a payout
 * Requirements: 5.1
 */
export const requestPayout = createAsyncThunk(
  'payment/requestPayout',
  async (amount: number, { rejectWithValue, dispatch }) => {
    try {
      const payout = await paymentService.requestPayout(amount);
      // Refresh earnings after payout request
      await dispatch(fetchEarnings());
      return payout;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to request payout');
    }
  }
);

/**
 * Fetch payout history
 * Requirements: 4.5, 5.1, 5.2
 */
export const fetchPayouts = createAsyncThunk(
  'payment/fetchPayouts',
  async (_, { rejectWithValue }) => {
    try {
      const payouts = await paymentService.getPayouts();
      return payouts;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch payouts');
    }
  }
);

// Payment slice with reducers
// Requirements: 9.3, 9.5
const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    // Synchronous actions
    setCurrentPayment: (state, action: PayloadAction<Payment | null>) => {
      state.currentPayment = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentPayment: (state) => {
      state.currentPayment = null;
    },
    resetPaymentState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch Payment Methods
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.isLoadingPaymentMethods = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.isLoadingPaymentMethods = false;
        // Ensure payload is always an array and filter out invalid items
        state.paymentMethods = Array.isArray(action.payload)
          ? action.payload.filter((pm) => pm && pm.id && pm.type)
          : [];
        state.error = null;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.isLoadingPaymentMethods = false;
        state.error = action.payload as string;
      })

      // Add Payment Method
      .addCase(addPaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        // Only add if payload is valid
        if (action.payload && action.payload.id && action.payload.type) {
          state.paymentMethods.push(action.payload);
          // If it's the first payment method, it becomes default
          if (state.paymentMethods.length === 1) {
            state.paymentMethods[0].isDefault = true;
          }
        }
        state.error = null;
      })
      .addCase(addPaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Set Default Payment Method
      .addCase(setDefaultPaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update default status locally (will be refreshed by fetchPaymentMethods)
        state.paymentMethods = state.paymentMethods.map((method) => ({
          ...method,
          isDefault: method.id === action.payload,
        }));
        state.error = null;
      })
      .addCase(setDefaultPaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Delete Payment Method
      .addCase(deletePaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentMethods = state.paymentMethods.filter(
          (method) => method.id !== action.payload
        );
        state.error = null;
      })
      .addCase(deletePaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Payment Intent
      .addCase(createPaymentIntent.pending, (state) => {
        state.isProcessingPayment = true;
        state.error = null;
      })
      .addCase(createPaymentIntent.fulfilled, (state) => {
        state.isProcessingPayment = false;
        state.error = null;
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.isProcessingPayment = false;
        state.error = action.payload as string;
      })

      // Confirm Payment
      .addCase(confirmPayment.pending, (state) => {
        state.isProcessingPayment = true;
        state.error = null;
      })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.isProcessingPayment = false;
        state.currentPayment = action.payload;
        state.error = null;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.isProcessingPayment = false;
        state.error = action.payload as string;
      })

      // Release Payment
      .addCase(releasePayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(releasePayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPayment = action.payload;
        state.error = null;
      })
      .addCase(releasePayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Earnings
      .addCase(fetchEarnings.pending, (state) => {
        state.isLoadingEarnings = true;
        state.error = null;
      })
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        state.isLoadingEarnings = false;
        state.earnings = action.payload;
        state.error = null;
      })
      .addCase(fetchEarnings.rejected, (state, action) => {
        state.isLoadingEarnings = false;
        state.error = action.payload as string;
      })

      // Request Payout
      .addCase(requestPayout.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestPayout.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payouts.unshift(action.payload); // Add to beginning of array
        state.error = null;
      })
      .addCase(requestPayout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Payouts
      .addCase(fetchPayouts.pending, (state) => {
        state.isLoadingPayouts = true;
        state.error = null;
      })
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.isLoadingPayouts = false;
        state.payouts = action.payload;
        state.error = null;
      })
      .addCase(fetchPayouts.rejected, (state, action) => {
        state.isLoadingPayouts = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setCurrentPayment,
  clearError,
  clearCurrentPayment,
  resetPaymentState,
} = paymentSlice.actions;

// Export reducer
export default paymentSlice.reducer;
