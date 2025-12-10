import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeView';
import { radius, space } from '../theme/tokens';

interface ThemedButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  textStyle,
  size = 'medium',
}) => {
  const { theme } = useTheme();
  
  const getBackgroundColor = () => {
    if (disabled) return theme.subtle;
    switch (variant) {
      case 'primary':
        return theme.primary;
      case 'secondary':
        return theme.card;
      case 'danger':
        return theme.danger;
      case 'success':
        return theme.success;
      default:
        return theme.primary;
    }
  };
  
  const getTextColor = () => {
    if (disabled) return theme.textDim;
    return variant === 'secondary' ? theme.text : '#fff';
  };
  
  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: space.sm, paddingHorizontal: space.md };
      case 'large':
        return { paddingVertical: space.lg, paddingHorizontal: space.xl };
      default:
        return { paddingVertical: space.md, paddingHorizontal: space.lg };
    }
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { 
          backgroundColor: getBackgroundColor(),
          borderRadius: radius.lg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: variant === 'secondary' ? theme.border : 'transparent',
          ...getPadding(),
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && (
            <MaterialIcons 
              name={icon} 
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
              color={getTextColor()} 
              style={{ marginRight: space.sm }}
            />
          )}
          <Text style={[
            styles.text,
            { 
              color: getTextColor(),
              fontSize: size === 'small' ? 13 : size === 'large' ? 17 : 15,
            },
            textStyle,
          ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
  },
});
