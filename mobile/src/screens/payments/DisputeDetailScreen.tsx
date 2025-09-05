import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { PaymentStackParamList, Dispute, DisputeStatus } from '@/types';
import { Button, LoadingSpinner } from '@/components/common';
import apiService from '@/services/api';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'DisputeDetail'>;
type RouteProps = RouteProp<PaymentStackParamList, 'DisputeDetail'>;

const DisputeDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { disputeId } = route.params;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDisputeData();
  }, []);

  const loadDisputeData = async () => {
    try {
      const disputeData = await apiService.getDispute(disputeId);
      setDispute(disputeData as Dispute);
    } catch (error) {
      console.error('Error loading dispute data:', error);
      Alert.alert('Error', 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDisputeData();
    setRefreshing(false);
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'open':
        return '#FF9800';
      case 'investigating':
        return '#2196F3';
      case 'resolved':
        return '#4CAF50';
      case 'closed':
        return '#666';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: DisputeStatus) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'investigating':
        return 'Under Investigation';
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'payment':
        return 'Payment Issue';
      case 'quality':
        return 'Work Quality';
      case 'no_show':
        return 'No Show';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  const renderEvidenceItem = (evidenceUri: string, index: number) => (
    <TouchableOpacity key={index} style={styles.evidenceItem}>
      <Text style={styles.evidenceType}>
        {evidenceUri.includes('photo') ? '📷' : '📄'} Evidence {index + 1}
      </Text>
      <Text style={styles.evidenceUri}>{evidenceUri}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Dispute not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dispute #{dispute.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) }]}>
            <Text style={styles.statusText}>{getStatusText(dispute.status)}</Text>
          </View>
        </View>

        {/* Dispute Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispute Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{getTypeLabel(dispute.type)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reported by:</Text>
              <Text style={styles.detailValue}>{dispute.reporterName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date reported:</Text>
              <Text style={styles.detailValue}>
                {new Date(dispute.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {dispute.resolvedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Resolved:</Text>
                <Text style={styles.detailValue}>
                  {new Date(dispute.resolvedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.card}>
            <Text style={styles.description}>{dispute.description}</Text>
          </View>
        </View>

        {/* Evidence */}
        {dispute.evidence.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supporting Evidence</Text>
            <View style={styles.evidenceContainer}>
              {dispute.evidence.map((evidence, index) => 
                renderEvidenceItem(evidence, index)
              )}
            </View>
          </View>
        )}

        {/* Resolution */}
        {dispute.resolution && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution</Text>
            <View style={styles.resolutionCard}>
              <Text style={styles.resolution}>{dispute.resolution}</Text>
            </View>
          </View>
        )}

        {/* Status Information */}
        <View style={styles.section}>
          <View style={styles.statusCard}>
            <Text style={styles.statusCardTitle}>What happens next?</Text>
            {dispute.status === 'open' && (
              <Text style={styles.statusCardText}>
                Your dispute has been received and will be reviewed by our team within 24-48 hours. 
                We may contact you for additional information.
              </Text>
            )}
            {dispute.status === 'investigating' && (
              <Text style={styles.statusCardText}>
                Our team is currently investigating your dispute. Both parties have been contacted 
                and we are reviewing all evidence provided. This process typically takes 3-7 business days.
              </Text>
            )}
            {dispute.status === 'resolved' && (
              <Text style={styles.statusCardText}>
                Your dispute has been resolved. Please review the resolution above. 
                If you have any questions, please contact our support team.
              </Text>
            )}
            {dispute.status === 'closed' && (
              <Text style={styles.statusCardText}>
                This dispute has been closed. No further action is required.
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {dispute.status === 'open' && (
          <View style={styles.actionButtons}>
            <Button
              title="Contact Support"
              onPress={() => Alert.alert('Contact Support', 'Support contact feature would be implemented here')}
              style={styles.actionButton}
            />
          </View>
        )}

        {dispute.status === 'resolved' && (
          <View style={styles.actionButtons}>
            <Button
              title="Accept Resolution"
              onPress={() => Alert.alert('Accept Resolution', 'Resolution acceptance feature would be implemented here')}
              style={styles.actionButton}
            />
            <Button
              title="Appeal Decision"
              onPress={() => Alert.alert('Appeal Decision', 'Appeal process would be implemented here')}
              style={[styles.actionButton, { backgroundColor: '#666' }]}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  evidenceContainer: {
    gap: 8,
  },
  evidenceItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  evidenceType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  evidenceUri: {
    fontSize: 12,
    color: '#666',
  },
  resolutionCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  resolution: {
    fontSize: 16,
    color: '#2e7d32',
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
  },
  statusCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  statusCardText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 0,
  },

  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 32,
  },
});

export default DisputeDetailScreen;