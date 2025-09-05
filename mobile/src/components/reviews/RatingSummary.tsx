import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RatingSummary as RatingSummaryType } from '../../types';
import { StarRating } from './StarRating';

interface RatingSummaryProps {
  ratingSummary: RatingSummaryType;
  showDistribution?: boolean;
}

export const RatingSummary: React.FC<RatingSummaryProps> = ({
  ratingSummary,
  showDistribution = true,
}) => {
  const { averageRating, totalReviews, ratingDistribution } = ratingSummary;

  const getBarWidth = (count: number) => {
    if (totalReviews === 0) return 0;
    return (count / totalReviews) * 100;
  };

  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.overallRating}>
        <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
        <View style={styles.starsContainer}>
          <StarRating rating={averageRating} size={20} />
          <Text style={styles.totalReviews}>({totalReviews} reviews)</Text>
        </View>
      </View>

      {showDistribution && totalReviews > 0 && (
        <View style={styles.distribution}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const percentage = getPercentage(count);
            const barWidth = getBarWidth(count);

            return (
              <View key={rating} style={styles.distributionRow}>
                <Text style={styles.ratingLabel}>{rating}</Text>
                <StarRating rating={1} size={12} />
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${barWidth}%` }]} />
                </View>
                <Text style={styles.percentage}>{percentage}%</Text>
                <Text style={styles.count}>({count})</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  overallRating: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  starsContainer: {
    alignItems: 'center',
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  distribution: {
    marginTop: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#333',
    width: 12,
    textAlign: 'center',
    marginRight: 8,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 12,
    color: '#666',
    width: 32,
    textAlign: 'right',
    marginRight: 8,
  },
  count: {
    fontSize: 12,
    color: '#999',
    width: 32,
    textAlign: 'right',
  },
});