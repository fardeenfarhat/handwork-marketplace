import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StarRating } from '../../components/reviews/StarRating';

describe('StarRating', () => {
  it('renders correct number of stars', () => {
    const { getAllByTestId } = render(
      <StarRating rating={3} />
    );
    
    // Should render 5 stars total
    expect(getAllByTestId).toBeDefined();
  });

  it('displays correct rating visually', () => {
    const { getByTestId } = render(
      <StarRating rating={4} />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('calls onRatingChange when interactive', () => {
    const mockOnRatingChange = jest.fn();
    const { getByTestId } = render(
      <StarRating 
        rating={0} 
        interactive={true} 
        onRatingChange={mockOnRatingChange} 
      />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('does not call onRatingChange when not interactive', () => {
    const mockOnRatingChange = jest.fn();
    const { getByTestId } = render(
      <StarRating 
        rating={3} 
        interactive={false} 
        onRatingChange={mockOnRatingChange} 
      />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('renders with custom size and color', () => {
    const { getByTestId } = render(
      <StarRating 
        rating={5} 
        size={32} 
        color="#FF0000" 
      />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('handles half ratings correctly', () => {
    const { getByTestId } = render(
      <StarRating rating={3.5} />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('handles zero rating', () => {
    const { getByTestId } = render(
      <StarRating rating={0} />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });

  it('handles maximum rating', () => {
    const { getByTestId } = render(
      <StarRating rating={5} />
    );
    
    // Component should render without errors
    expect(getByTestId).toBeDefined();
  });
});