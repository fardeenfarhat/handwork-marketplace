import { apiService } from './api';
import {
  PaymentBreakdown,
  PaymentIntent,
  PaymentMethod,
  WorkerEarnings,
  Payout,
  Payment,
} from '@/types';

// Platform fee percentage (should match backend configuration)
const PLATFORM_FEE_PERCENTAGE = 10;

class PaymentService {
  /**
   * Calculate payment breakdown based on working hours and hourly rate
   * Requirements: 1.1, 1.2, 10.1, 10.2, 10.3, 10.4, 10.5
   */
  calculatePayment(
    workingHours: number,
    hourlyRate: number,
    currency: string = 'usd'
  ): PaymentBreakdown {
    // Calculate subtotal (hours × rate)
    const subtotal = Number((workingHours * hourlyRate).toFixed(2));

    // Calculate platform fee
    const platformFee = Number(
      (subtotal * (PLATFORM_FEE_PERCENTAGE / 100)).toFixed(2)
    );

    // Calculate total amount (client pays)
    const total = Number((subtotal + platformFee).toFixed(2));

    // Calculate worker amount (what worker receives after fee)
    const workerAmount = Number((subtotal - platformFee).toFixed(2));

    return {
      workingHours,
      hourlyRate,
      subtotal,
      platformFee,
      platformFeePercentage: PLATFORM_FEE_PERCENTAGE,
      total,
      workerAmount,
      currency,
    };
  }

  /**
   * Create a payment intent for a booking
   * Requirements: 1.3, 1.4
   */
  async createPaymentIntent(
    bookingId: number,
    workingHours: number,
    hourlyRate: number
  ): Promise<PaymentIntent> {
    try {
      const response = await apiService.request<{
        client_secret: string;
        payment_intent_id: string;
        amount: number;
        currency: string;
      }>('/payments/intent', {
        method: 'POST',
        body: JSON.stringify({
          booking_id: bookingId,
          working_hours: workingHours,
          hourly_rate: hourlyRate,
        }),
      });

      return {
        clientSecret: response.client_secret,
        paymentIntentId: response.payment_intent_id,
        amount: response.amount,
        currency: response.currency,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm payment after Stripe SDK confirmation
   * Requirements: 1.5, 9.4
   */
  async confirmPayment(
    paymentIntentId: string,
    bookingId: number
  ): Promise<Payment> {
    try {
      const response = await apiService.request<any>('/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          booking_id: bookingId,
        }),
      });

      // Transform snake_case to camelCase
      return {
        id: response.id,
        bookingId: response.booking_id,
        amount: response.amount,
        platformFee: response.platform_fee,
        workerAmount: response.worker_amount,
        workingHours: response.working_hours,
        hourlyRate: response.hourly_rate,
        stripePaymentId: response.stripe_payment_intent_id,
        status: response.status,
        createdAt: response.created_at,
        releasedAt: response.released_at,
        refundedAt: response.refunded_at,
        failureReason: response.failure_reason,
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Add a payment method
   * Requirements: 2.1, 2.2
   */
  async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    try {
      const response = await apiService.request<any>('/payments/methods', {
        method: 'POST',
        body: JSON.stringify({
          payment_method_id: paymentMethodId,
        }),
      });

      // Transform snake_case to camelCase
      return {
        id: response.id,
        type: response.type,
        last4: response.last4 || undefined,
        brand: response.brand || undefined,
        expiryMonth: response.expiry_month || undefined,
        expiryYear: response.expiry_year || undefined,
        email: response.email || undefined,
        bankName: response.bank_name || undefined,
        isDefault: response.is_default,
        createdAt: response.created_at,
      };
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Get user's payment methods
   * Requirements: 2.3
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiService.request<any[]>('/payments/methods');

      // Transform snake_case to camelCase
      return response.map((pm) => ({
        id: pm.id,
        type: pm.type,
        last4: pm.last4 || undefined,
        brand: pm.brand || undefined,
        expiryMonth: pm.expiry_month || undefined,
        expiryYear: pm.expiry_year || undefined,
        email: pm.email || undefined,
        bankName: pm.bank_name || undefined,
        isDefault: pm.is_default,
        createdAt: pm.created_at,
      }));
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   * Requirements: 2.4
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await apiService.request(`/payments/methods/${paymentMethodId}/default`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Delete a payment method
   * Requirements: 2.5
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await apiService.request(`/payments/methods/${paymentMethodId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * Get worker earnings summary
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  async getEarnings(): Promise<WorkerEarnings> {
    try {
      const response = await apiService.request<any>('/payments/earnings');

      // Transform snake_case to camelCase
      return {
        totalEarned: response.total_earned,
        availableBalance: response.available_balance,
        pendingBalance: response.pending_balance,
        totalWithdrawn: response.total_withdrawn,
        platformFeesPaid: response.platform_fees_paid,
      };
    } catch (error) {
      console.error('Error fetching earnings:', error);
      throw error;
    }
  }

  /**
   * Request a payout
   * Requirements: 5.1, 5.2
   */
  async requestPayout(amount: number): Promise<Payout> {
    try {
      const response = await apiService.request<any>('/payments/payouts/request', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });

      // Transform snake_case to camelCase
      return {
        id: response.id,
        amount: response.amount,
        status: response.status,
        requestedAt: response.requested_at,
        processedAt: response.processed_at,
        failureReason: response.failure_reason,
      };
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw error;
    }
  }

  /**
   * Get payout history
   * Requirements: 4.5, 5.1, 5.2
   */
  async getPayouts(): Promise<Payout[]> {
    try {
      const response = await apiService.request<any[]>('/payments/payouts');

      // Transform snake_case to camelCase
      return response.map((payout) => ({
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        requestedAt: payout.requested_at,
        processedAt: payout.processed_at,
        failureReason: payout.failure_reason,
      }));
    } catch (error) {
      console.error('Error fetching payouts:', error);
      throw error;
    }
  }

  /**
   * Release payment from escrow
   * Requirements: 3.3, 3.4
   */
  async releasePayment(paymentId: number): Promise<Payment> {
    try {
      const response = await apiService.request<any>(
        `/payments/${paymentId}/release`,
        {
          method: 'POST',
        }
      );

      // Transform snake_case to camelCase
      return {
        id: response.id,
        bookingId: response.booking_id,
        amount: response.amount,
        platformFee: response.platform_fee,
        workerAmount: response.worker_amount,
        workingHours: response.working_hours,
        hourlyRate: response.hourly_rate,
        stripePaymentId: response.stripe_payment_intent_id,
        status: response.status,
        createdAt: response.created_at,
        releasedAt: response.released_at,
        refundedAt: response.refunded_at,
        failureReason: response.failure_reason,
      };
    } catch (error) {
      console.error('Error releasing payment:', error);
      throw error;
    }
  }

  /**
   * Request a refund
   * Requirements: 6.1, 6.2
   */
  async requestRefund(paymentId: number, reason: string): Promise<Payment> {
    try {
      const response = await apiService.request<any>('/payments/refund', {
        method: 'POST',
        body: JSON.stringify({
          payment_id: paymentId,
          reason,
        }),
      });

      // Transform snake_case to camelCase
      return {
        id: response.id,
        bookingId: response.booking_id,
        amount: response.amount,
        platformFee: response.platform_fee,
        workerAmount: response.worker_amount,
        workingHours: response.working_hours,
        hourlyRate: response.hourly_rate,
        stripePaymentId: response.stripe_payment_intent_id,
        status: response.status,
        createdAt: response.created_at,
        releasedAt: response.released_at,
        refundedAt: response.refunded_at,
        failureReason: response.failure_reason,
      };
    } catch (error) {
      console.error('Error requesting refund:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   * Requirements: 4.5
   */
  async getTransactionHistory(): Promise<any[]> {
    try {
      const response = await apiService.request<any[]>('/payments/transactions');
      return response;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService;
