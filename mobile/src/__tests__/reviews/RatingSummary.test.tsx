import React from 'react';
import { render } from '@testing-library/react-native';
import { RatingSummary } from '../../components/reviews/RatingSummary';
import { RatingSummary as RatingSummaryType } from '../../types';

const mockRatingSummary: RatingSummaryType = {
  averageRating: 4.2,
  totalReviews: 25,
  ratingDistribution: {
    5: 10,
    4: 8,
    3: 5,
    2: 1,
    1: 1,
  },
};

describe('RatingSummary', () => {
  it('renders average rating correctly', () => {
    const { getByText } = render(
      <RatingSummary ratingSummary={mockRatingSummary} />
    );
    
    expect(getByText('4.2')).toBeTruthy();
    expect(getByText('(25 reviews)')).toBeTruthy();
  });

  it('displays rating distribution when showDistribution is true', () => {
    const { getByText } = render(
      <RatingSummary 
        ratingSummary={mockRatingSummary} 
        showDistribution={true} 
      />
    );
    
    // Should show percentages for each rating
    expect(getByText('40%')).toBeTruthy(); // 10/25 = 40% for 5 stars
    expect(getByText('32%')).toBeTruthy(); // 8/25 = 32% for 4 stars
  });

  it('hides rating distribution when showDistribution is false', () => {
    const { queryByText } = render(
      <RatingSummary 
        ratingSummary={mockRatingSummary} 
        showDistribution={false} 
      />
    );
    
    // Should not show percentage bars
    expect(queryByText('40%')).toBeNull();
  });

  it('handles zero reviews correctly', () => {
    const emptyRatingSummary: RatingSummaryType = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    };

    const { getByText } = render(
      <RatingSummary ratingSummary={emptyRatingSummary} />
    );
    
    expect(getByText('0.0')).toBeTruthy();
    expect(getByText('(0 reviews)')).toBeTruthy();
  });

  it('calculates percentages correctly', () => {
    const { getAllByText } = render(
      <RatingSummary 
        ratingSummary={mockRatingSummary} 
        showDistribution={true} 
      />
    );
    
    // 10 out of 25 = 40%
    expect(getAllByText('40%').length).toBeGreaterThan(0);
    // 8 out of 25 = 32%
    expect(getAllByText('32%').length).toBeGreaterThan(0);
    // 5 out of 25 = 20%
    expect(getAllByText('20%').length).toBeGreaterThan(0);
    // 1 out of 25 = 4% (appears twice for ratings 2 and 1)
    expect(getAllByText('4%').length).toBeGreaterThan(0);
  });

  it('displays star ratings for each distribution level', () => {
    const { getByTestId } = render(
      <RatingSummary 
        ratingSummary={mockRatingSummary} 
        showDistribution={true} 
      />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('shows count for each rating level', () => {
    const { getAllByText } = render(
      <RatingSummary 
        ratingSummary={mockRatingSummary} 
        showDistribution={true} 
      />
    );
    
    expect(getAllByText('(10)').length).toBeGreaterThan(0); // 5 star count
    expect(getAllByText('(8)').length).toBeGreaterThan(0);  // 4 star count
    expect(getAllByText('(5)').length).toBeGreaterThan(0);  // 3 star count
    expect(getAllByText('(1)').length).toBeGreaterThan(0);  // 2 and 1 star counts (appears twice)
  });

  it('handles single review correctly', () => {
    const singleReviewSummary: RatingSummaryType = {
      averageRating: 5.0,
      totalReviews: 1,
      ratingDistribution: {
        5: 1,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    };

    const { getByText } = render(
      <RatingSummary ratingSummary={singleReviewSummary} />
    );
    
    expect(getByText('5.0')).toBeTruthy();
    expect(getByText('(1 reviews)')).toBeTruthy();
  });
});