import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Button,
  LoadingState,
  SkeletonLoader,
  SkeletonCard,
  ShareButton,
} from '../../components/common';
import { StarRating } from '../../components/reviews';
import { ClipboardService, HapticService } from '../../utils';
import { useNotificationBadge } from '../../hooks/useNotificationBadge';

/**
 * Example screen demonstrating all the new UI enhancements from Task 29:
 * - Clipboard functionality for deep linking and sharing
 * - Enhanced loading states and skeleton screens
 * - Haptic feedback and micro-interactions
 * - Real-time notification badges
 */
export const EnhancedUIExampleScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const { counts } = useNotificationBadge();

  const handleClipboardDemo = async () => {
    try {
      await ClipboardService.copyToClipboard('Hello from Enhanced UI!');
      await HapticService.success();
    } catch (error) {
      await HapticService.error();
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  const handleHapticDemo = async (type: string) => {
    switch (type) {
      case 'light':
        await HapticService.light();
        break;
      case 'medium':
        await HapticService.medium();
        break;
      case 'heavy':
        await HapticService.heavy();
        break;
      case 'success':
        await HapticService.success();
        break;
      case 'warning':
        await HapticService.warning();
        break;
      case 'error':
        await HapticService.error();
        break;
      case 'selection':
        await HapticService.selection();
        break;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingState type="list" itemCount={3} showAvatar={true} lines={2} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced UI Features Demo</Text>
        <Text style={styles.subtitle}>Task 29 Implementation</Text>
      </View>

      {/* Notification Badge Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Real-time Notification Badges</Text>
        <View style={styles.badgeContainer}>
          <View style={styles.badgeItem}>
            <Ionicons name="chatbubbles-outline" size={24} color="#007AFF" />
            {counts.messages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.messages}</Text>
              </View>
            )}
            <Text style={styles.badgeLabel}>Messages</Text>
          </View>
          <View style={styles.badgeItem}>
            <Ionicons name="briefcase-outline" size={24} color="#007AFF" />
            {counts.jobs > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.jobs}</Text>
              </View>
            )}
            <Text style={styles.badgeLabel}>Jobs</Text>
          </View>
          <View style={styles.badgeItem}>
            <Ionicons name="card-outline" size={24} color="#007AFF" />
            {counts.payments > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.payments}</Text>
              </View>
            )}
            <Text style={styles.badgeLabel}>Payments</Text>
          </View>
        </View>
      </View>

      {/* Clipboard and Sharing Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clipboard & Sharing</Text>
        <View style={styles.buttonRow}>
          <Button
            title="Copy to Clipboard"
            onPress={handleClipboardDemo}
            hapticFeedback="light"
            style={styles.demoButton}
          />
          <ShareButton
            type="job"
            id={123}
            title="Sample Job"
            style={styles.shareButton}
          />
        </View>
      </View>

      {/* Haptic Feedback Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Haptic Feedback</Text>
        <View style={styles.hapticGrid}>
          {['light', 'medium', 'heavy', 'success', 'warning', 'error', 'selection'].map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.hapticButton}
              onPress={() => handleHapticDemo(type)}
            >
              <Text style={styles.hapticButtonText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Interactive Star Rating Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interactive Star Rating</Text>
        <View style={styles.ratingContainer}>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            interactive={true}
            size={32}
          />
          <Text style={styles.ratingText}>Rating: {rating}/5</Text>
        </View>
      </View>

      {/* Loading States Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loading States & Skeletons</Text>
        <Button
          title="Show Loading Demo"
          onPress={handleLoadingDemo}
          hapticFeedback="medium"
          style={styles.demoButton}
        />
        
        <Text style={styles.subsectionTitle}>Skeleton Examples:</Text>
        <SkeletonLoader width="80%" height={20} style={styles.skeletonExample} />
        <SkeletonCard showAvatar={true} lines={3} style={styles.skeletonExample} />
      </View>

      {/* Enhanced Button Examples */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enhanced Buttons</Text>
        <View style={styles.buttonColumn}>
          <Button
            title="Primary with Success Haptic"
            onPress={() => {}}
            variant="primary"
            hapticFeedback="success"
            style={styles.demoButton}
          />
          <Button
            title="Secondary with Medium Haptic"
            onPress={() => {}}
            variant="secondary"
            hapticFeedback="medium"
            style={styles.demoButton}
          />
          <Button
            title="Outline with Light Haptic"
            onPress={() => {}}
            variant="outline"
            hapticFeedback="light"
            style={styles.demoButton}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badgeItem: {
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonColumn: {
    gap: 12,
  },
  demoButton: {
    flex: 1,
    marginRight: 8,
  },
  shareButton: {
    marginLeft: 8,
  },
  hapticGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hapticButton: {
    backgroundColor: '#F2F8FC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E9EE',
  },
  hapticButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  ratingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  ratingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  skeletonExample: {
    marginBottom: 12,
  },
});