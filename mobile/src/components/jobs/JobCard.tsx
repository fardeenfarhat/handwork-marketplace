import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Job } from '@/types';

interface JobCardProps {
  job: Job;
  onPress: (jobId: number) => void;
  showDistance?: boolean;
  showApplicationsCount?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  showDistance = false,
  showApplicationsCount = false,
}) => {
  const formatBudget = (min: number, max: number) => {
    return `$${min} - $${max}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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
      onPress={() => onPress(job.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {job.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusText}>{job.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.category}>{job.category}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {job.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Budget:</Text>
          <Text style={styles.budget}>{formatBudget(job.budgetMin, job.budgetMax)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.location} numberOfLines={1}>
            {job.location}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Preferred Date:</Text>
          <Text style={styles.date}>{formatDate(job.preferredDate)}</Text>
        </View>

        {showDistance && job.distance && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Distance:</Text>
            <Text style={styles.distance}>{job.distance.toFixed(1)} miles</Text>
          </View>
        )}

        {showApplicationsCount && job.applicationsCount !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Applications:</Text>
            <Text style={styles.applicationsCount}>{job.applicationsCount}</Text>
          </View>
        )}
      </View>

      {job.clientName && (
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>Posted by: {job.clientName}</Text>
          {job.clientRating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>★ {job.clientRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.postedDate}>Posted {formatDate(job.createdAt)}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clientName: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  postedDate: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
});

export default JobCard;