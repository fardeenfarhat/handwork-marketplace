import React from 'react';
import {
  TextInput,
  View,
  Text,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/styles/DesignSystem';

interface ModernInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'default' | 'floating' | 'minimal';
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  error,
  disabled,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'default',
  style,
  inputStyle,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginBottom: error ? Spacing[1] : Spacing[4],
    };

    return { ...baseStyle, ...style };
  };

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.background.primary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing[4],
      borderWidth: 2,
      borderColor: error ? Colors.danger[500] : isFocused ? Colors.primary[500] : Colors.neutral[200],
    };

    if (variant === 'floating') {
      return {
        ...baseStyle,
        ...Shadows.base,
        backgroundColor: Colors.background.primary,
      };
    }

    if (variant === 'minimal') {
      return {
        ...baseStyle,
        backgroundColor: Colors.neutral[50],
        borderWidth: 0,
        borderBottomWidth: 2,
        borderRadius: 0,
        paddingHorizontal: 0,
      };
    }

    if (isFocused) {
      return {
        ...baseStyle,
        ...Shadows.sm,
      };
    }

    return baseStyle;
  };

  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.normal as any,
      color: Colors.text.primary,
      paddingVertical: Spacing[4],
      ...inputStyle,
    };
  };

  const getLabelStyle = (): TextStyle => {
    return {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium as any,
      color: Colors.text.secondary,
      marginBottom: Spacing[2],
    };
  };

  const getErrorStyle = (): TextStyle => {
    return {
      fontSize: Typography.fontSize.sm,
      color: Colors.danger[500],
      marginTop: Spacing[1],
      fontWeight: Typography.fontWeight.medium as any,
    };
  };

  return (
    <View style={getContainerStyle()}>
      {label && <Text style={getLabelStyle()}>{label}</Text>}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <Ionicons
            name={leftIcon as any}
            size={20}
            color={isFocused ? Colors.primary[500] : Colors.neutral[400]}
            style={{ marginRight: Spacing[3] }}
          />
        )}
        
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={Colors.neutral[400]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={!disabled}
          style={getInputStyle()}
        />
        
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ padding: Spacing[1] }}
          >
            <Ionicons
              name={rightIcon as any}
              size={20}
              color={isFocused ? Colors.primary[500] : Colors.neutral[400]}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={getErrorStyle()}>{error}</Text>}
    </View>
  );
};