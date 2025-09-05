import { renderHook, act } from '@testing-library/react-hooks';
import { useReviews } from '../../hooks/useReviews';
import apiService from '../../services/api';
import { ReviewSubmission } from '../../types';

// Mock the API service
jest.mock('../../services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock the offline sync hook
jest.mock('../../hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({
    isOnline: true,
    cacheReview: jest.fn(),
  }),
}));

// Mock the error handler hook
jest.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

describe('useReviews Hook Integration', () => {
  const mockReview = {
    id: 1,
    bookingId: 1,
    reviewerId: 2,
    revieweeId: 1,
    reviewerName: 'John Doe',
    revieweeName: 'Jane Smith',
    jobTitle: 'Plumbing Repair',
    rating: 5,
    comment: 'Excellent work!',
    status: 'approved' as const,
    createdAt: '2024-01-15T10:30:00Z',
  };

  const mockRatingSummary = {
    averageRating: 4.5,
    totalReviews: 10,
    ratingDistribution: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadReviews', () => {
    it('should load reviews from API when online', async () => {
      mockApiService.getReviews.mockResolvedValue([mockReview]);
      mockApiService.getRatingSummary.mockResolvedValue(mockRatingSummary);

      const { result } = renderHook(() => useReviews());

      await act(async () => {
        await result.current.loadReviews({ rating: 5 }, 1);
      });

      expect(mockApiService.getReviews).toHaveBeenCalledWith({
        userId: 1,
        rating: 5,
        status: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
      expect(mockApiService.getRatingSummary).toHaveBeenCalledWith(1);
      expect(result.current.reviews).toEqual([mockReview]);
      expect(result.current.ratingSummary).toEqual(mockRatingSummary);
    });

    it('should handle API errors gracefully', async () => {
      mockApiService.getReviews.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReviews());

      await act(async () => {
        await result.current.loadReviews();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.reviews).toEqual([]);
    });

    it('should set loading state correctly', async () => {
      mockApiService.getReviews.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([mockReview]), 100))
      );

      const { result } = renderHook(() => useReviews());

      act(() => {
        result.current.loadReviews();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('submitReview', () => {
    it('should submit review when online', async () => {
      mockApiService.submitReview.mockResolvedValue(mockReview);

      const { result } = renderHook(() => useReviews());

      const reviewData: ReviewSubmission = {
        bookingId: 1,
        revieweeId: 2,
        rating: 5,
        comment: 'Great service!',
      };

      let submittedReview;
      await act(async () => {
        submittedReview = await result.current.submitReview(reviewData);
      });

      expect(mockApiService.submitReview).toHaveBeenCalledWith(reviewData);
      expect(submittedReview).toEqual(mockReview);
      expect(result.current.reviews).toContain(mockReview);
    });

    it('should handle offline scenario', async () => {
      // Mock offline state
      jest.doMock('../../hooks/useOfflineSync', () => ({
        useOfflineSync: () => ({
          isOnline: false,
          cacheReview: jest.fn(),
        }),
      }));

      const { result } = renderHook(() => useReviews());

      const reviewData: ReviewSubmission = {
        bookingId: 1,
        revieweeId: 2,
        rating: 5,
        comment: 'Great service!',
      };

      await act(async () => {
        await expect(result.current.submitReview(reviewData)).rejects.toThrow(
          'Cannot submit review while offline'
        );
      });
    });
  });

  describe('reportReview', () => {
    it('should report review when online', async () => {
      mockApiService.reportReview.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReviews());

      // Set initial reviews state
      act(() => {
        result.current.reviews.push(mockReview);
      });

      await act(async () => {
        await result.current.reportReview(1, 'Inappropriate content');
      });

      expect(mockApiService.reportReview).toHaveBeenCalledWith(1, 'Inappropriate content');
    });

    it('should handle offline scenario', async () => {
      // Mock offline state
      jest.doMock('../../hooks/useOfflineSync', () => ({
        useOfflineSync: () => ({
          isOnline: false,
          cacheReview: jest.fn(),
        }),
      }));

      const { result } = renderHook(() => useReviews());

      await act(async () => {
        await expect(result.current.reportReview(1, 'Spam')).rejects.toThrow(
          'Cannot report review while offline'
        );
      });
    });
  });

  describe('respondToReview', () => {
    it('should respond to review when online', async () => {
      const mockResponse = {
        id: 1,
        reviewId: 1,
        responderId: 2,
        responderName: 'Jane Smith',
        response: 'Thank you!',
        createdAt: '2024-01-15T11:00:00Z',
      };

      mockApiService.respondToReview.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useReviews());

      await act(async () => {
        await result.current.respondToReview(1, 'Thank you!');
      });

      expect(mockApiService.respondToReview).toHaveBeenCalledWith(1, 'Thank you!');
    });
  });

  describe('getReviewById', () => {
    it('should return review from local state if available', async () => {
      const { result } = renderHook(() => useReviews());

      // Set initial state
      act(() => {
        result.current.reviews.push(mockReview);
      });

      let review;
      await act(async () => {
        review = await result.current.getReviewById(1);
      });

      expect(review).toEqual(mockReview);
      expect(mockApiService.getReview).not.toHaveBeenCalled();
    });

    it('should fetch from API if not in local state', async () => {
      mockApiService.getReview.mockResolvedValue(mockReview);

      const { result } = renderHook(() => useReviews());

      let review;
      await act(async () => {
        review = await result.current.getReviewById(1);
      });

      expect(mockApiService.getReview).toHaveBeenCalledWith(1);
      expect(review).toEqual(mockReview);
    });
  });

  describe('moderateReview', () => {
    it('should moderate review when online', async () => {
      mockApiService.moderateReview.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReviews());

      // Set initial state
      act(() => {
        result.current.reviews.push(mockReview);
      });

      await act(async () => {
        await result.current.moderateReview(1, 'approve', 'Meets guidelines');
      });

      expect(mockApiService.moderateReview).toHaveBeenCalledWith(1, 'approve', 'Meets guidelines');
    });
  });

  describe('refreshReviews', () => {
    it('should set refreshing state and call loadReviews', async () => {
      mockApiService.getReviews.mockResolvedValue([mockReview]);

      const { result } = renderHook(() => useReviews());

      act(() => {
        result.current.refreshReviews({ rating: 5 }, 1);
      });

      expect(result.current.isRefreshing).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockApiService.getReviews).toHaveBeenCalled();
      expect(result.current.isRefreshing).toBe(false);
    });
  });
});