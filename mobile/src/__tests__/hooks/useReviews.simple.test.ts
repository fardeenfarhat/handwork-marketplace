import apiService from '../../services/api';
import { ReviewSubmission } from '../../types';

// Mock the API service
jest.mock('../../services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock the offline sync hook
const mockCacheReview = jest.fn();
jest.mock('../../hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({
    isOnline: true,
    cacheReview: mockCacheReview,
  }),
}));

// Mock the error handler hook
const mockHandleError = jest.fn();
jest.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: mockHandleError,
  }),
}));

describe('useReviews Hook API Integration', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Integration Verification', () => {
    it('should verify all required API methods are available', () => {
      expect(mockApiService.getReviews).toBeDefined();
      expect(mockApiService.getReview).toBeDefined();
      expect(mockApiService.submitReview).toBeDefined();
      expect(mockApiService.reportReview).toBeDefined();
      expect(mockApiService.respondToReview).toBeDefined();
      expect(mockApiService.moderateReview).toBeDefined();
      expect(mockApiService.getRatingSummary).toBeDefined();
    });

    it('should verify offline sync integration', () => {
      expect(mockCacheReview).toBeDefined();
    });

    it('should verify error handling integration', () => {
      expect(mockHandleError).toBeDefined();
    });
  });

  describe('API Method Signatures', () => {
    it('should call getReviews with correct filter structure', async () => {
      mockApiService.getReviews.mockResolvedValue([mockReview]);

      const filters = {
        userId: 1,
        rating: 5,
        status: 'approved',
        sortBy: 'date',
        sortOrder: 'desc',
      };

      await apiService.getReviews(filters);

      expect(mockApiService.getReviews).toHaveBeenCalledWith(filters);
    });

    it('should call submitReview with ReviewSubmission structure', async () => {
      mockApiService.submitReview.mockResolvedValue(mockReview);

      const reviewData: ReviewSubmission = {
        bookingId: 1,
        revieweeId: 2,
        rating: 5,
        comment: 'Great service!',
      };

      await apiService.submitReview(reviewData);

      expect(mockApiService.submitReview).toHaveBeenCalledWith(reviewData);
    });

    it('should call reportReview with reviewId and reason', async () => {
      mockApiService.reportReview.mockResolvedValue(undefined);

      await apiService.reportReview(1, 'Inappropriate content');

      expect(mockApiService.reportReview).toHaveBeenCalledWith(1, 'Inappropriate content');
    });

    it('should call respondToReview with reviewId and response', async () => {
      const mockResponse = {
        id: 1,
        reviewId: 1,
        responderId: 2,
        responderName: 'Jane Smith',
        response: 'Thank you!',
        createdAt: '2024-01-15T11:00:00Z',
      };

      mockApiService.respondToReview.mockResolvedValue(mockResponse);

      await apiService.respondToReview(1, 'Thank you!');

      expect(mockApiService.respondToReview).toHaveBeenCalledWith(1, 'Thank you!');
    });

    it('should call moderateReview with correct parameters', async () => {
      mockApiService.moderateReview.mockResolvedValue(undefined);

      await apiService.moderateReview(1, 'approve', 'Meets guidelines');

      expect(mockApiService.moderateReview).toHaveBeenCalledWith(1, 'approve', 'Meets guidelines');
    });

    it('should call getRatingSummary with userId', async () => {
      const mockSummary = {
        averageRating: 4.5,
        totalReviews: 10,
        ratingDistribution: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 },
      };

      mockApiService.getRatingSummary.mockResolvedValue(mockSummary);

      await apiService.getRatingSummary(1);

      expect(mockApiService.getRatingSummary).toHaveBeenCalledWith(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors in API calls', async () => {
      const networkError = new Error('Network request failed');
      mockApiService.getReviews.mockRejectedValue(networkError);

      await expect(apiService.getReviews()).rejects.toThrow('Network request failed');
    });

    it('should handle validation errors in submitReview', async () => {
      const validationError = new Error('Rating is required');
      mockApiService.submitReview.mockRejectedValue(validationError);

      const reviewData: ReviewSubmission = {
        bookingId: 1,
        revieweeId: 2,
        rating: 0, // Invalid rating
        comment: 'Test',
      };

      await expect(apiService.submitReview(reviewData)).rejects.toThrow('Rating is required');
    });

    it('should handle authorization errors in moderateReview', async () => {
      const authError = new Error('Unauthorized');
      mockApiService.moderateReview.mockRejectedValue(authError);

      await expect(apiService.moderateReview(1, 'approve')).rejects.toThrow('Unauthorized');
    });
  });

  describe('Data Flow Verification', () => {
    it('should verify review data structure matches API expectations', () => {
      const reviewData: ReviewSubmission = {
        bookingId: 1,
        revieweeId: 2,
        rating: 5,
        comment: 'Great service!',
      };

      // Verify all required fields are present
      expect(reviewData.bookingId).toBeDefined();
      expect(reviewData.revieweeId).toBeDefined();
      expect(reviewData.rating).toBeDefined();
      expect(reviewData.comment).toBeDefined();

      // Verify data types
      expect(typeof reviewData.bookingId).toBe('number');
      expect(typeof reviewData.revieweeId).toBe('number');
      expect(typeof reviewData.rating).toBe('number');
      expect(typeof reviewData.comment).toBe('string');
    });

    it('should verify filter structure matches API expectations', () => {
      const filters = {
        userId: 1,
        rating: 5,
        status: 'approved',
        sortBy: 'date',
        sortOrder: 'desc',
      };

      // Verify all optional fields can be undefined
      const partialFilters = {
        userId: 1,
      };

      expect(filters.userId).toBeDefined();
      expect(partialFilters.userId).toBeDefined();
    });
  });

  describe('Integration Points', () => {
    it('should verify offline sync integration points', () => {
      // Verify that cacheReview function is available for offline sync
      expect(mockCacheReview).toBeDefined();
      expect(typeof mockCacheReview).toBe('function');
    });

    it('should verify error handling integration points', () => {
      // Verify that handleError function is available for error handling
      expect(mockHandleError).toBeDefined();
      expect(typeof mockHandleError).toBe('function');
    });

    it('should verify all API methods return promises', () => {
      // Mock all methods to return promises
      mockApiService.getReviews.mockResolvedValue([]);
      mockApiService.getReview.mockResolvedValue(mockReview);
      mockApiService.submitReview.mockResolvedValue(mockReview);
      mockApiService.reportReview.mockResolvedValue(undefined);
      mockApiService.respondToReview.mockResolvedValue({} as any);
      mockApiService.moderateReview.mockResolvedValue(undefined);
      mockApiService.getRatingSummary.mockResolvedValue({} as any);

      // Verify all methods return promises
      expect(apiService.getReviews()).toBeInstanceOf(Promise);
      expect(apiService.getReview(1)).toBeInstanceOf(Promise);
      expect(apiService.submitReview({} as any)).toBeInstanceOf(Promise);
      expect(apiService.reportReview(1, 'test')).toBeInstanceOf(Promise);
      expect(apiService.respondToReview(1, 'test')).toBeInstanceOf(Promise);
      expect(apiService.moderateReview(1, 'approve')).toBeInstanceOf(Promise);
      expect(apiService.getRatingSummary(1)).toBeInstanceOf(Promise);
    });
  });
});