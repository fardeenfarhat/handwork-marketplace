import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animated = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animated, animatedValue]);

  const backgroundColor = animated
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['#E1E9EE', '#F2F8FC'],
      })
    : '#E1E9EE';

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
  style?: ViewStyle;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = false,
  lines = 3,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        {showAvatar && (
          <SkeletonLoader
            width={40}
            height={40}
            borderRadius={20}
            style={styles.avatar}
          />
        )}
        <View style={styles.headerContent}>
          <SkeletonLoader width="60%" height={16} style={styles.title} />
          <SkeletonLoader width="40%" height={12} style={styles.subtitle} />
        </View>
      </View>
      <View style={styles.cardBody}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            width={index === lines - 1 ? '70%' : '100%'}
            height={14}
            style={styles.line}
          />
        ))}
      </View>
    </View>
  );
};

interface SkeletonListProps {
  itemCount?: number;
  showAvatar?: boolean;
  lines?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  itemCount = 5,
  showAvatar = false,
  lines = 3,
}) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <SkeletonCard
          key={index}
          showAvatar={showAvatar}
          lines={lines}
          style={styles.listItem}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 0,
  },
  cardBody: {
    flex: 1,
  },
  line: {
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
  listItem: {
    marginBottom: 12,
  },
});