import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: string[];
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  gradient,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
      ...Shadows.base,
    };

    const sizeStyles = {
      sm: { paddingVertical: Spacing[2], paddingHorizontal: Spacing[4] },
      md: { paddingVertical: Spacing[4], paddingHorizontal: Spacing[6] },
      lg: { paddingVertical: Spacing[5], paddingHorizontal: Spacing[8] },
      xl: { paddingVertical: Spacing[6], paddingHorizontal: Spacing[10] },
    };

    const variantStyles = {
      primary: { backgroundColor: Colors.primary[500] },
      secondary: { backgroundColor: Colors.secondary[500] },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary[500],
      },
      ghost: { backgroundColor: 'transparent' },
      gradient: { backgroundColor: 'transparent' },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.5 : 1,
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles = {
      sm: { fontSize: Typography.fontSize.sm },
      md: { fontSize: Typography.fontSize.base },
      lg: { fontSize: Typography.fontSize.lg },
      xl: { fontSize: Typography.fontSize.xl },
    };

    const variantStyles = {
      primary: { color: Colors.text.inverse },
      secondary: { color: Colors.text.inverse },
      outline: { color: Colors.primary[500] },
      ghost: { color: Colors.primary[500] },
      gradient: { color: Colors.text.inverse },
    };

    return {
      fontWeight: Typography.fontWeight.semibold as any,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...textStyle,
    };
  };

  if (variant === 'gradient' || gradient) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[getButtonStyle(), { backgroundColor: 'transparent', overflow: 'hidden' }]}
      >
        <LinearGradient
          colors={gradient || ['#FF6B35', '#FF9F56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: BorderRadius.md,
          }}
        />
        <View style={{ 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}>
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              {icon && <View style={{ marginRight: Spacing[2] }}>{icon}</View>}
              <Text style={getTextStyle()}>{title}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={getButtonStyle()}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary[500] : Colors.text.inverse}
        />
      ) : (
        <>
          {icon && <View style={{ marginRight: Spacing[2] }}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};