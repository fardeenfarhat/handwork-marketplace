import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkerProfile, ClientProfile } from '@/types';

interface ProfileViewerProps {
  profile: WorkerProfile | ClientProfile;
  userType: 'worker' | 'client';
  isOwnProfile?: boolean;
  onEdit?: () => void;
}

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 3; // 3 columns with padding

export default function ProfileViewer({
  profile,
  userType,
  isOwnProfile = false,
  onEdit,
}: ProfileViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color="#FFD700" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#FFD700" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />
      );
    }

    return stars;
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  const getKYCStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Verified';
      case 'rejected':
        return 'Not Verified';
      case 'pending':
        return 'Pending Verification';
      default:
        return 'Not Verified';
    }
  };

  const renderWorkerProfile = (workerProfile: WorkerProfile) => (
    <>
      {/* Bio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{workerProfile.bio}</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {renderStars(workerProfile.rating)}
              </View>
              <Text style={styles.ratingText}>
                {workerProfile.rating.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workerProfile.totalJobs}</Text>
            <Text style={styles.statLabel}>Jobs Completed</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${workerProfile.hourlyRate}</Text>
            <Text style={styles.statLabel}>Per Hour</Text>
          </View>
        </View>
      </View>

      {/* Verification Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification Status</Text>
        <View style={styles.verificationContainer}>
          <View
            style={[
              styles.verificationBadge,
              { backgroundColor: getKYCStatusColor(workerProfile.kycStatus) },
            ]}
          >
            <Ionicons
              name={workerProfile.kycStatus === 'approved' ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color="#fff"
            />
            <Text style={styles.verificationText}>
              {getKYCStatusText(workerProfile.kycStatus)}
            </Text>
          </View>
        </View>
      </View>

      {/* Skills Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsContainer}>
          {workerProfile.skills.map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Service Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Categories</Text>
        <View style={styles.categoriesContainer}>
          {workerProfile.serviceCategories.map((category, index) => (
            <View key={index} style={styles.categoryTag}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Portfolio Section */}
      {workerProfile.portfolioImages && workerProfile.portfolioImages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio</Text>
          <View style={styles.portfolioGrid}>
            {workerProfile.portfolioImages.map((imageUri, index) => (
              <TouchableOpacity
                key={index}
                style={styles.portfolioImageContainer}
                onPress={() => setSelectedImage(imageUri)}
              >
                <Image source={{ uri: imageUri }} style={styles.portfolioImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={20} color="#666" />
          <Text style={styles.locationText}>{workerProfile.location}</Text>
        </View>
      </View>
    </>
  );

  const renderClientProfile = (clientProfile: ClientProfile) => (
    <>
      {/* Company Info */}
      {clientProfile.companyName && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company</Text>
          <Text style={styles.companyName}>{clientProfile.companyName}</Text>
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{clientProfile.description}</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {renderStars(clientProfile.rating)}
              </View>
              <Text style={styles.ratingText}>
                {clientProfile.rating.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{clientProfile.totalJobsPosted}</Text>
            <Text style={styles.statLabel}>Jobs Posted</Text>
          </View>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={20} color="#666" />
          <Text style={styles.locationText}>{clientProfile.location}</Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.profileTitle}>
            {userType === 'worker' ? 'Worker Profile' : 'Client Profile'}
          </Text>
          {isOwnProfile && onEdit && (
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Ionicons name="pencil" size={20} color="#007AFF" />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {userType === 'worker'
          ? renderWorkerProfile(profile as WorkerProfile)
          : renderClientProfile(profile as ClientProfile)}
      </ScrollView>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.modal}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Image source={{ uri: selectedImage }} style={styles.modalImage} />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  bio: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    alignItems: 'center',
    gap: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verificationContainer: {
    alignItems: 'flex-start',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  verificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  skillText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioImageContainer: {
    width: imageSize,
    height: imageSize,
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    position: 'relative',
    width: '90%',
    height: '70%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});