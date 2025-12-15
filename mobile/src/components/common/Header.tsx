import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { BackButton } from './BackButton';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  titleColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  rightComponent,
  style,
  backgroundColor = '#fff',
  titleColor = '#333',
}) => {
  return (
    <View style={[styles.header, { backgroundColor }, style]}>
      <View style={styles.leftSection}>
        {showBackButton ? (
          <BackButton onPress={onBackPress} />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
      
      <View style={styles.centerSection}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      
      <View style={styles.rightSection}>
        {rightComponent || <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    minHeight: 56,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 80, // Approximate width of back button to maintain balance
  },
});

export default Header;
