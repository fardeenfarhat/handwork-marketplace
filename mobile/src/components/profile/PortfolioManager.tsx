import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ModernButton } from '@/components/ui/ModernButton';
import { ModernCard } from '@/components/ui/ModernCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Gradients } from '@/styles/DesignSystem';

interface PortfolioImage {
  id: string;
  uri: string;
  name: string;
  description?: string;
}

interface PortfolioManagerProps {
  images: PortfolioImage[];
  onImagesChange: (images: PortfolioImage[]) => void;
  onSave: (images: PortfolioImage[]) => Promise<void>;
  isLoading?: boolean;
  maxImages?: number;
}

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 2; // 2 columns with padding

export default function PortfolioManager({
  images,
  onImagesChange,
  onSave,
  isLoading = false,
  maxImages = 10,
}: PortfolioManagerProps) {
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload portfolio images.'
        );
        return false;
      }

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos.'
        );
        return false;
      }
    }
    return true;
  };

  const showImagePickerOptions = () => {
    if (images.length >= maxImages) {
      Alert.alert(
        'Maximum Images Reached',
        `You can only upload up to ${maxImages} portfolio images.`
      );
      return;
    }

    Alert.alert(
      'Add Portfolio Image',
      'Choose how you want to add your portfolio image',
      [
        {
          text: 'Camera',
          onPress: takePhoto,
        },
        {
          text: 'Photo Library',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addImage({
          id: Date.now().toString(),
          uri: asset.uri,
          name: `portfolio_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxImages - images.length,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset, index) => ({
          id: (Date.now() + index).toString(),
          uri: asset.uri,
          name: asset.fileName || `portfolio_${Date.now() + index}.jpg`,
        }));
        
        const updatedImages = [...images, ...newImages];
        onImagesChange(updatedImages);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const addImage = (image: PortfolioImage) => {
    const updatedImages = [...images, image];
    onImagesChange(updatedImages);
  };

  const removeImage = (imageId: string) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image from your portfolio?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedImages = images.filter(img => img.id !== imageId);
            onImagesChange(updatedImages);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    try {
      await onSave(images);
    } catch (error) {
      Alert.alert('Error', 'Failed to save portfolio. Please try again.');
    }
  };

  const openImageViewer = (image: PortfolioImage) => {
    setSelectedImage(image);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Saving portfolio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {images.map((image) => (
            <View key={image.id} style={styles.imageContainer}>
              <TouchableOpacity
                style={styles.imageWrapper}
                onPress={() => openImageViewer(image)}
              >
                <Image source={{ uri: image.uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(image.id)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          ))}

          {images.length < maxImages && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={showImagePickerOptions}
            >
              <Ionicons name="add" size={32} color="#007AFF" />
              <Text style={styles.addText}>Add Image</Text>
            </TouchableOpacity>
          )}
        </View>

        {images.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Portfolio Images</Text>
            <Text style={styles.emptyDescription}>
              Add photos of your completed work to showcase your skills and attract more clients.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <ModernButton
          title="Save Portfolio"
          onPress={handleSave}
          disabled={isLoading}
          loading={isLoading}
          style={styles.saveButton}
        />
      </View>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Portfolio Image</Text>
              <TouchableOpacity onPress={closeImageViewer}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: selectedImage.uri }} style={styles.modalImage} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing[3],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing[4],
    gap: Spacing[3],
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral[100],
    ...Shadows.sm,
  },
  removeButton: {
    position: 'absolute',
    top: Spacing[1],
    right: Spacing[1],
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  addButton: {
    width: imageSize,
    height: imageSize,
    borderWidth: 2,
    borderColor: Colors.primary[300],
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    gap: Spacing[2],
  },
  addText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary[600],
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
    gap: Spacing[3],
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
  },
  emptyDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.neutral[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[5],
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  saveButton: {
    marginTop: 0,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    margin: Spacing[5],
    maxHeight: '90%',
    width: '90%',
    ...Shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700' as const,
    color: Colors.neutral[900],
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
});