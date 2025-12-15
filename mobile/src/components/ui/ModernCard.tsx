import React from 'react';
import {
  View,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

interface ModernCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'flat' | 'outlined' | 'gradient';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  gradient?: string[];
  title?: string;
  subtitle?: string;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  variant = 'elevated',
  padding = 'md',
  style,
  gradient,
  title,
  subtitle,
}) => {
  const getPaddingValue = () => {
    const paddingValues = {
      sm: Spacing[3],
      md: Spacing[5],
      lg: Spacing[6],
      xl: Spacing[8],
    };
    return paddingValues[padding];
  };

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius.xl,
      padding: getPaddingValue(),
    };

    const variantStyles = {
      elevated: {
        backgroundColor: Colors.background.primary,
        ...Shadows.lg,
      },
      flat: {
        backgroundColor: Colors.background.secondary,
      },
      outlined: {
        backgroundColor: Colors.background.primary,
        borderWidth: 1,
        borderColor: Colors.neutral[200],
      },
      gradient: {
        backgroundColor: 'transparent',
        ...Shadows.base,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...style,
    };
  };

  const renderContent = () => (
    <>
      {(title || subtitle) && (
        <View style={{ marginBottom: title && subtitle ? Spacing[4] : Spacing[3] }}>
          {title && (
            <Text
              style={{
                fontSize: Typography.fontSize.lg,
                fontWeight: Typography.fontWeight.semibold as any,
                color: variant === 'gradient' ? Colors.text.inverse : Colors.text.primary,
                marginBottom: subtitle ? Spacing[1] : 0,
              }}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={{
                fontSize: Typography.fontSize.sm,
                color: variant === 'gradient' ? Colors.text.inverse : Colors.text.secondary,
                opacity: 0.8,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {children}
    </>
  );

  if (variant === 'gradient' || gradient) {
    return (
      <View style={[getCardStyle(), { overflow: 'hidden' }]}>
        <LinearGradient
          colors={gradient || ['#FF6B35', '#FF9F56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <View style={{ position: 'relative', zIndex: 1 }}>
          {renderContent()}
        </View>
      </View>
    );
  }

  return <View style={getCardStyle()}>{renderContent()}</View>;
};