import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { store } from '../../store';
import { ReviewSubmissionScreen } from '../../screens/reviews/ReviewSubmissionScreen';
import { ReviewModerationScreen } from '../../screens/reviews/ReviewModerationScreen';
import { ReviewCard } from '../../components/reviews/ReviewCard';
import apiService from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useReviews } from '../../hooks/useReviews';
import { Review } from '../../types';

// Mock the API service
jest.mock('../../services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock the hooks
jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/useReviews');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseReviews = useReviews as jest.MockedFunction<typeof useReviews>;

// Mock navigation
const Stack = createStackNavigator();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Test" component={() => <>{children}</>} />
      </Stack.Navigator>
    </NavigationContainer>
  </Provider>
);

describe('Review API Integration', () => {
  const mockReview: Review = {
    id: 1,
    bookingId: 1,
    reviewerId: 2,
    revieweeId: 1,
    reviewerName: 'John Doe',
    revieweeName: 'Jane Smith',
    jobTitle: 'Plumbing Repair',
    rating: 5,
    comment: 'Excellent work!',
    status: 'approved',
    createdAt: '2024-01-15T10:30:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth mock
    mockUseAuth.mockReturnValue({
      currentUserId: 1,
      currentUserName: 'Test User',
      currentUserRole: 'client',
      isLoggedIn: true,
      isAuthenticated: true,
      user: {
        id: 1,
        email: 'test@example.com',
        phone: '+1234567890',
        role: 'client',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
      },
      token: 'mock-token',
      refreshToken: null,
      isLoading: false,
      error: null,
      isEmailVerified: true,
      isPhoneVerified: true,
      onboardingCompleted: true,
      needsEmailVerification: false,
      needsPhoneVerification: false,
      needsOnboarding: false,
      canAccessApp: true,
      login: jest.fn(),
      register: jest.fn(),
      loginWithSocial: jest.fn(),
      logout: jest.fn(),
      clearAuthError: jest.fn(),
      markEmailVerified: jest.fn(),
      markPhoneVerified: jest.fn(),
      completeOnboarding: jest.fn(),
    });

    // Setup default reviews mock
    mockUseReviews.mockReturnValue({
      reviews: [mockReview],
      ratingSummary: {
        averageRating: 4.5,
        totalReviews: 10,
        ratingDistribution: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 },
      },
      isLoading: false,
      isRefreshing: false,
      loadReviews: jest.fn(),
      refreshReviews: jest.fn(),
      submitReview: jest.fn(),
      reportReview: jest.fn(),
      respondToReview: jest.fn(),
      getReviewById: jest.fn(),
      moderateReview: jest.fn(),
    });
  });

  describe('ReviewSubmissionScreen', () => {
    const mockRoute = {
      params: {
        bookingId: 1,
        revieweeId: 2,
        revieweeName: 'Jane Smith',
        jobTitle: 'Plumbing Repair',
      },
    };

    it('should submit review with proper API integration', async () => {
      const mockSubmitReview = jest.fn().mockResolvedValue(mockReview);
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        submitReview: mockSubmitReview,
      });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ReviewSubmissionScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      // Set rating
      const starRating = getByText('Tap a star to rate');
      fireEvent.press(starRating);

      // Enter comment
      const commentInput = getByPlaceholderText(/Tell us about your experience/);
      fireEvent.changeText(commentInput, 'Great service, very professional!');

      // Submit review
      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSubmitReview).toHaveBeenCalledWith({
          bookingId: 1,
          revieweeId: 2,
          rating: expect.any(Number),
          comment: 'Great service, very professional!',
        });
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockSubmitReview = jest.fn().mockRejectedValue(new Error('Network error'));
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        submitReview: mockSubmitReview,
      });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ReviewSubmissionScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      // Set rating and comment
      const commentInput = getByPlaceholderText(/Tell us about your experience/);
      fireEvent.changeText(commentInput, 'Great service, very professional!');

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSubmitReview).toHaveBeenCalled();
      });

      // Should handle error without crashing
      expect(getByText('Submit Review')).toBeTruthy();
    });

    it('should validate authentication before submission', async () => {
      mockUseAuth.mockReturnValue({
        ...mockUseAuth(),
        isLoggedIn: false,
        currentUserId: null,
      });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ReviewSubmissionScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      const commentInput = getByPlaceholderText(/Please select a rating first/);
      fireEvent.changeText(commentInput, 'Great service!');

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      // Should show authentication alert
      await waitFor(() => {
        expect(getByText('Submit Review')).toBeTruthy();
      });
    });
  });

  describe('ReviewModerationScreen', () => {
    const mockRoute = {
      params: {
        reviewId: 1,
      },
    };

    it('should load review data on mount', async () => {
      const mockGetReviewById = jest.fn().mockResolvedValue(mockReview);
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        getReviewById: mockGetReviewById,
      });

      render(
        <TestWrapper>
          <ReviewModerationScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetReviewById).toHaveBeenCalledWith(1);
      });
    });

    it('should moderate review with API integration', async () => {
      const mockModerateReview = jest.fn().mockResolvedValue(undefined);
      const mockGetReviewById = jest.fn().mockResolvedValue(mockReview);
      
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        getReviewById: mockGetReviewById,
        moderateReview: mockModerateReview,
      });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ReviewModerationScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetReviewById).toHaveBeenCalled();
      });

      // Add moderation note
      const noteInput = getByPlaceholderText('Enter your moderation note...');
      fireEvent.changeText(noteInput, 'Review approved - meets guidelines');

      // Approve review
      const approveButton = getByText('Approve');
      fireEvent.press(approveButton);

      await waitFor(() => {
        expect(mockModerateReview).toHaveBeenCalledWith(1, 'approve', 'Review approved - meets guidelines');
      });
    });
  });

  describe('ReviewCard', () => {
    it('should handle report functionality with API integration', async () => {
      const mockReportReview = jest.fn().mockResolvedValue(undefined);
      const onReport = jest.fn((reviewId, reason) => {
        mockReportReview(reviewId, reason);
      });

      const { getByText } = render(
        <TestWrapper>
          <ReviewCard
            review={mockReview}
            onReport={onReport}
            currentUserId={3} // Different from reviewer
          />
        </TestWrapper>
      );

      const reportButton = getByText('Report');
      fireEvent.press(reportButton);

      // Should open report modal
      expect(getByText('Report Review')).toBeTruthy();
    });

    it('should handle response functionality with API integration', async () => {
      const mockRespondToReview = jest.fn().mockResolvedValue(undefined);
      const onRespond = jest.fn((reviewId, response) => {
        mockRespondToReview(reviewId, response);
      });

      const { getByText } = render(
        <TestWrapper>
          <ReviewCard
            review={mockReview}
            onRespond={onRespond}
            currentUserId={1} // Same as reviewee
          />
        </TestWrapper>
      );

      const respondButton = getByText('Respond');
      fireEvent.press(respondButton);

      // Should open response modal
      expect(getByText('Respond to Review')).toBeTruthy();
    });

    it('should use auth context for current user ID when not provided', () => {
      const { getByText } = render(
        <TestWrapper>
          <ReviewCard
            review={mockReview}
            onReport={jest.fn()}
            // No currentUserId prop - should use auth context
          />
        </TestWrapper>
      );

      // Should render without errors and use auth context
      expect(getByText(mockReview.comment)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockApiService.submitReview.mockRejectedValue(new Error('Network error'));
      
      const mockSubmitReview = jest.fn().mockRejectedValue(new Error('Network error'));
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        submitReview: mockSubmitReview,
      });

      const mockRoute = {
        params: {
          bookingId: 1,
          revieweeId: 2,
          revieweeName: 'Jane Smith',
          jobTitle: 'Plumbing Repair',
        },
      };

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ReviewSubmissionScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      const commentInput = getByPlaceholderText(/Tell us about your experience/);
      fireEvent.changeText(commentInput, 'Great service!');

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSubmitReview).toHaveBeenCalled();
      });

      // Should not crash and maintain UI state
      expect(getByText('Submit Review')).toBeTruthy();
    });

    it('should handle offline scenarios', async () => {
      const mockSubmitReview = jest.fn().mockRejectedValue(
        new Error('Cannot submit review while offline')
      );
      
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        submitReview: mockSubmitReview,
      });

      const mockRoute = {
        params: {
          bookingId: 1,
          revieweeId: 2,
          revieweeName: 'Jane Smith',
          jobTitle: 'Plumbing Repair',
        },
      };

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ReviewSubmissionScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      const commentInput = getByPlaceholderText(/Tell us about your experience/);
      fireEvent.changeText(commentInput, 'Great service!');

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockSubmitReview).toHaveBeenCalled();
      });

      // Should handle offline error appropriately
      expect(getByText('Submit Review')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading states during API calls', async () => {
      const mockSubmitReview = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        submitReview: mockSubmitReview,
      });

      const mockRoute = {
        params: {
          bookingId: 1,
          revieweeId: 2,
          revieweeName: 'Jane Smith',
          jobTitle: 'Plumbing Repair',
        },
      };

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <ReviewSubmissionScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      const commentInput = getByPlaceholderText(/Tell us about your experience/);
      fireEvent.changeText(commentInput, 'Great service!');

      const submitButton = getByText('Submit Review');
      fireEvent.press(submitButton);

      // Should show loading state
      expect(getByText('Submitting...')).toBeTruthy();
    });

    it('should show loading state in moderation screen', async () => {
      mockUseReviews.mockReturnValue({
        ...mockUseReviews(),
        isLoading: true,
      });

      const mockRoute = {
        params: {
          reviewId: 1,
        },
      };

      const { getByText } = render(
        <TestWrapper>
          <ReviewModerationScreen route={mockRoute} navigation={{} as any} />
        </TestWrapper>
      );

      expect(getByText('Loading review...')).toBeTruthy();
    });
  });
});