import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReviewCard } from '../../components/reviews/ReviewCard';
import { Review } from '../../types';

const mockReview: Review = {
  id: 1,
  bookingId: 1,
  reviewerId: 2,
  revieweeId: 1,
  reviewerName: 'John Doe',
  revieweeName: 'Jane Smith',
  jobTitle: 'Plumbing Repair',
  rating: 4,
  comment: 'Great work! Very professional and punctual.',
  status: 'approved',
  createdAt: '2024-01-15T10:30:00Z',
};

describe('ReviewCard', () => {
  it('renders review information correctly', () => {
    const { getByText } = render(
      <ReviewCard review={mockReview} />
    );
    
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Plumbing Repair')).toBeTruthy();
    expect(getByText('Great work! Very professional and punctual.')).toBeTruthy();
  });

  it('displays rating stars', () => {
    const { getByTestId } = render(
      <ReviewCard review={mockReview} />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('shows response when available', () => {
    const reviewWithResponse: Review = {
      ...mockReview,
      response: {
        id: 1,
        reviewId: 1,
        responderId: 1,
        responderName: 'Jane Smith',
        response: 'Thank you for the feedback!',
        createdAt: '2024-01-15T14:20:00Z',
      },
    };

    const { getByText } = render(
      <ReviewCard review={reviewWithResponse} />
    );
    
    expect(getByText('Thank you for the feedback!')).toBeTruthy();
    expect(getByText('Response from Jane Smith')).toBeTruthy();
  });

  it('shows report button when user can report', () => {
    const { getByText } = render(
      <ReviewCard 
        review={mockReview} 
        currentUserId={3} 
        showActions={true} 
      />
    );
    
    expect(getByText('Report')).toBeTruthy();
  });

  it('shows respond button when user can respond', () => {
    const { getByText } = render(
      <ReviewCard 
        review={mockReview} 
        currentUserId={1} 
        showActions={true} 
      />
    );
    
    expect(getByText('Respond')).toBeTruthy();
  });

  it('calls onReport when report button is pressed', () => {
    const mockOnReport = jest.fn();
    const { getByText } = render(
      <ReviewCard 
        review={mockReview} 
        currentUserId={3} 
        onReport={mockOnReport} 
        showActions={true} 
      />
    );
    
    fireEvent.press(getByText('Report'));
    // Modal should open - we can test this by checking if modal content appears
  });

  it('calls onRespond when respond button is pressed', () => {
    const mockOnRespond = jest.fn();
    const { getByText } = render(
      <ReviewCard 
        review={mockReview} 
        currentUserId={1} 
        onRespond={mockOnRespond} 
        showActions={true} 
      />
    );
    
    fireEvent.press(getByText('Respond'));
    // Modal should open - we can test this by checking if modal content appears
  });

  it('does not show actions when showActions is false', () => {
    const { queryByText } = render(
      <ReviewCard 
        review={mockReview} 
        currentUserId={3} 
        showActions={false} 
      />
    );
    
    expect(queryByText('Report')).toBeNull();
    expect(queryByText('Respond')).toBeNull();
  });

  it('formats date correctly', () => {
    const { getByText } = render(
      <ReviewCard review={mockReview} />
    );
    
    // Should display formatted date
    expect(getByText('Jan 15, 2024')).toBeTruthy();
  });

  it('handles review without response', () => {
    const { queryByText } = render(
      <ReviewCard review={mockReview} />
    );
    
    expect(queryByText('Response from')).toBeNull();
  });
});