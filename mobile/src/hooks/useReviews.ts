import { useState, useEffect } from 'react';
import { 
  Review, 
  ReviewSubmission, 
  ReviewFilters, 
  RatingSummary 
} from '../types';
import { useErrorHandler } from './useErrorHandler';
import apiService from '../services/api';
import { useOfflineSync } from './useOfflineSync';

export const useReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { handleError } = useErrorHandler();
  const { isOnline, cacheReview } = useOfflineSync();

  const loadReviews = async (filters?: ReviewFilters, userId?: number) => {
    try {
      setIsLoading(true);
      
      if (!isOnline) {
        // TODO: Load from offline cache
        console.log('Loading reviews from offline cache');
        return;
      }
      
      const apiFilters = {
        userId,
        rating: filters?.rating,
        status: filters?.status,
        sortBy: filters?.sortBy,
        sortOrder: filters?.sortOrder,
      };
      
      const reviewsData = await apiService.getReviews(apiFilters);
      setReviews(reviewsData);
      
      // Cache reviews for offline access
      for (const review of reviewsData) {
        await cacheReview(review);
      }
      
      // Load rating summary if userId is provided
      if (userId) {
        const ratingSummaryData = await apiService.getRatingSummary(userId);
        setRatingSummary(ratingSummaryData);
      }
      
    } catch (error) {
      handleError(error);
      
      // Fallback to cached data if available
      if (!isOnline) {
        console.log('Failed to load reviews, using cached data');
        // TODO: Load from offline cache as fallback
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const submitReview = async (reviewData: ReviewSubmission): Promise<Review> => {
    try {
      if (!isOnline) {
        // TODO: Queue for offline sync
        console.log('Queueing review for offline sync:', reviewData);
        throw new Error('Cannot submit review while offline. Review will be submitted when connection is restored.');
      }
      
      const newReview = await apiService.submitReview(reviewData);
      
      // Add to local state
      setReviews(prev => [newReview, ...prev]);
      
      // Cache the new review
      await cacheReview(newReview);
      
      return newReview;
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const reportReview = async (reviewId: number, reason: string): Promise<void> => {
    try {
      if (!isOnline) {
        throw new Error('Cannot report review while offline. Please try again when connected.');
      }
      
      await apiService.reportReview(reviewId, reason);
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, isReported: true, reportReason: reason }
          : review
      ));
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const respondToReview = async (reviewId: number, response: string): Promise<void> => {
    try {
      if (!isOnline) {
        throw new Error('Cannot respond to review while offline. Please try again when connected.');
      }
      
      const responseData = await apiService.respondToReview(reviewId, response);
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, response: responseData }
          : review
      ));
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const getReviewById = async (reviewId: number): Promise<Review | null> => {
    try {
      // Check local state first
      const localReview = reviews.find(review => review.id === reviewId);
      if (localReview) {
        return localReview;
      }
      
      if (!isOnline) {
        // TODO: Check offline cache
        console.log('Checking offline cache for review:', reviewId);
        return null;
      }
      
      const review = await apiService.getReview(reviewId);
      
      // Cache the review
      await cacheReview(review);
      
      return review;
    } catch (error) {
      handleError(error);
      return null;
    }
  };

  const editReview = async (
    reviewId: number, 
    rating: number, 
    comment: string
  ): Promise<void> => {
    try {
      if (!isOnline) {
        throw new Error('Cannot edit review while offline. Please try again when connected.');
      }
      
      const updatedReview = await apiService.editReview(reviewId, { rating, comment });
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, rating, comment, updatedAt: new Date().toISOString() }
          : review
      ));
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const moderateReview = async (
    reviewId: number, 
    action: 'approve' | 'reject', 
    note?: string
  ): Promise<void> => {
    try {
      if (!isOnline) {
        throw new Error('Cannot moderate review while offline. Please try again when connected.');
      }
      
      await apiService.moderateReview(reviewId, action, note);
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, status: newStatus as any }
          : review
      ));
    } catch (error) {
      handleError(error);
      throw error;
    }
  };

  const refreshReviews = (filters?: ReviewFilters, userId?: number) => {
    setIsRefreshing(true);
    loadReviews(filters, userId);
  };

  return {
    reviews,
    ratingSummary,
    isLoading,
    isRefreshing,
    loadReviews,
    refreshReviews,
    submitReview,
    editReview,
    reportReview,
    respondToReview,
    getReviewById,
    moderateReview,
  };
};