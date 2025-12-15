import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps {
  onPress?: () => void;
  style?: ViewStyle;
  showText?: boolean;
  text?: string;
  color?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  style,
  showText = true,
  text = 'Back',
  color = '#007AFF'
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={handlePress}
    >
      <Ionicons name="arrow-back" size={20} color={color} />
      {showText && (
        <Text style={[styles.backButtonText, { color }]}>{text}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  backButtonText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BackButton;
