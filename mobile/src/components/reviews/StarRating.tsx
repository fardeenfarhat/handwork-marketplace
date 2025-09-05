import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticService } from '../../utils/haptics';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  interactive?: boolean;
  color?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  size = 24,
  interactive = false,
  color = '#FF9800'
}) => {
  const renderStar = (index: number) => {
    const isFilled = index < rating;
    const isHalfFilled = index < rating && index + 1 > rating;
    
    const handlePress = async () => {
      if (interactive && onRatingChange) {
        await HapticService.selection();
        onRatingChange(index + 1);
      }
    };

    if (interactive) {
      return (
        <TouchableOpacity key={index} onPress={handlePress} style={styles.starButton}>
          <Ionicons
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? color : '#E0E0E0'}
          />
        </TouchableOpacity>
      );
    }

    return (
      <Ionicons
        key={index}
        name={isFilled ? 'star' : isHalfFilled ? 'star-half' : 'star-outline'}
        size={size}
        color={isFilled || isHalfFilled ? color : '#E0E0E0'}
        style={styles.star}
      />
    );
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map(renderStar)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  starButton: {
    marginRight: 2,
    padding: 2,
  },
});