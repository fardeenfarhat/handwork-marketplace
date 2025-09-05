import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { SkeletonLoader, SkeletonCard, SkeletonList } from './SkeletonLoader';
import LoadingSpinner from './LoadingSpinner';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'card' | 'list';
  text?: string;
  itemCount?: number;
  showAvatar?: boolean;
  lines?: number;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  text,
  itemCount = 5,
  showAvatar = false,
  lines = 3,
  style,
}) => {
  switch (type) {
    case 'skeleton':
      return (
        <View style={[styles.container, style]}>
          <SkeletonLoader />
        </View>
      );
    
    case 'card':
      return (
        <View style={[styles.container, style]}>
          <SkeletonCard showAvatar={showAvatar} lines={lines} />
        </View>
      );
    
    case 'list':
      return (
        <View style={[styles.container, style]}>
          <SkeletonList 
            itemCount={itemCount} 
            showAvatar={showAvatar} 
            lines={lines} 
          />
        </View>
      );
    
    case 'spinner':
    default:
      return (
        <View style={[styles.container, styles.spinnerContainer, style]}>
          <LoadingSpinner text={text} />
        </View>
      );
  }
};

// Specific loading components for common use cases
export const JobCardSkeleton: React.FC = () => (
  <SkeletonCard showAvatar={false} lines={4} style={styles.jobCard} />
);

export const MessageSkeleton: React.FC = () => (
  <SkeletonCard showAvatar={true} lines={2} style={styles.messageCard} />
);

export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profileContainer}>
    <View style={styles.profileHeader}>
      <SkeletonLoader width={80} height={80} borderRadius={40} style={styles.profileAvatar} />
      <View style={styles.profileInfo}>
        <SkeletonLoader width="70%" height={20} style={styles.profileName} />
        <SkeletonLoader width="50%" height={16} style={styles.profileRole} />
        <SkeletonLoader width="60%" height={14} style={styles.profileLocation} />
      </View>
    </View>
    <View style={styles.profileStats}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.statItem}>
          <SkeletonLoader width={40} height={24} style={styles.statValue} />
          <SkeletonLoader width={60} height={12} style={styles.statLabel} />
        </View>
      ))}
    </View>
    <View style={styles.profileBio}>
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={index === 2 ? '80%' : '100%'}
          height={14}
          style={styles.bioLine}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobCard: {
    margin: 16,
  },
  messageCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  profileContainer: {
    backgroundColor: '#fff',
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    marginBottom: 8,
  },
  profileRole: {
    marginBottom: 6,
  },
  profileLocation: {
    marginBottom: 0,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    marginBottom: 4,
  },
  statLabel: {
    marginBottom: 0,
  },
  profileBio: {
    marginTop: 8,
  },
  bioLine: {
    marginBottom: 8,
  },
});