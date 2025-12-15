import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Job } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface JobCardProps {
  job: Job;
  onPress: (jobId: number) => void;
  showDistance?: boolean;
  showApplicationsCount?: boolean;
  clientReviewCount?: number;
  currentUserId?: number;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  showDistance = false,
  showApplicationsCount = false,
  clientReviewCount = 0,
  currentUserId,
}) => {
  const { user } = useAuth();
  // Safely convert all job properties to ensure they're renderable
  const safeJob = {
    id: Number(job.id) || 0,
    title: String(job.title || 'No title'),
    category: String(job.category || 'No category'),
    description: String(job.description || 'No description'),
    location: String(job.location || 'No location'),
    status: String(job.status || 'open'),
    clientName: job.clientName ? String(job.clientName) : '',
    budgetMin: Number(job.budgetMin) || 0,
    budgetMax: Number(job.budgetMax) || 0,
    clientRating: Number(job.clientRating) || 0,
    applicationsCount: Number(job.applicationsCount) || 0,
    distance: job.distance ? Number(job.distance) : null,
    preferredDate: String(job.preferredDate || ''),
    createdAt: String(job.createdAt || ''),
    clientUserId: job.clientUserId ? Number(job.clientUserId) : null,
  };

  const formatBudget = (min: number, max: number) => {
    if (!min && !max) return 'Budget not specified';
    return `$${min} - $${max}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return '#4CAF50';
      case 'assigned':
        return '#FF9800';
      case 'in_progress':
        return '#2196F3';
      case 'completed':
        return '#9C27B0';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(safeJob.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {safeJob.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(safeJob.status) }]}>
          <Text style={styles.statusText}>{safeJob.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.category}>{safeJob.category}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {safeJob.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Budget:</Text>
          <Text style={styles.budget}>{formatBudget(safeJob.budgetMin, safeJob.budgetMax)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.location} numberOfLines={1}>
            {safeJob.location}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Preferred Date:</Text>
          <Text style={styles.date}>{formatDate(safeJob.preferredDate)}</Text>
        </View>

        {showDistance && safeJob.distance && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Distance:</Text>
            <Text style={styles.distance}>{safeJob.distance.toFixed(1)} miles</Text>
          </View>
        )}

        {showApplicationsCount && safeJob.applicationsCount !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Applications:</Text>
            <Text style={styles.applicationsCount}>{String(safeJob.applicationsCount)}</Text>
          </View>
        )}
      </View>

      {safeJob.clientName && (
        <View style={styles.clientInfo}>
          <View style={styles.clientInfoHeader}>
            <Text style={styles.clientName}>Posted by: {safeJob.clientName}</Text>
            {/* Profile button removed - should only be in job details */}
          </View>
          {safeJob.clientRating > 0 && (
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>
                <Text style={styles.ratingIcon}>★ </Text>
                <Text style={styles.ratingValue}>{safeJob.clientRating.toFixed(1)}</Text>
                {clientReviewCount > 0 && (
                  <Text style={styles.reviewCount}> ({clientReviewCount} reviews)</Text>
                )}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.postedDate}>Posted {formatDate(safeJob.createdAt)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  category: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 12,
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  budget: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  location: {
    fontSize: 12,
    color: '#444',
    flex: 1,
    textAlign: 'right',
  },
  date: {
    fontSize: 12,
    color: '#444',
  },
  distance: {
    fontSize: 12,
    color: '#2196F3',
  },
  applicationsCount: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  clientInfo: {
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clientInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 14,
    color: '#FFD700',
  },
  ratingValue: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 11,
    color: '#666',
    fontWeight: '400',
  },
  postedDate: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
});

export default JobCard;