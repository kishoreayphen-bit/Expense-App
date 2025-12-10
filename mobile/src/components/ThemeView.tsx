import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useCompany } from '../context/CompanyContext';
import { getThemeColors } from '../theme/tokens';
import { useRoute } from '@react-navigation/native';

interface ThemeViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  companyStyle?: ViewStyle;
  userStyle?: ViewStyle;
}

export const ThemeView: React.FC<ThemeViewProps> = ({ 
  children, 
  style, 
  companyStyle, 
  userStyle 
}) => {
  const { activeCompanyId } = useCompany();
  const route = useRoute<any>();
  const isCompanyRoute = route?.params?.fromCompany === true;
  const isCompanyMode = isCompanyRoute && !!activeCompanyId && Number(activeCompanyId) > 0;
  
  const modeStyle = isCompanyMode ? companyStyle : userStyle;
  const combinedStyle = [style, modeStyle].filter(Boolean);
  
  return <View style={combinedStyle}>{children}</View>;
};

// Hook to get theme-aware colors
export const useTheme = () => {
  const { activeCompanyId } = useCompany();
  const route = useRoute<any>();
  const isCompanyRoute = route?.params?.fromCompany === true;
  const isCompanyMode = isCompanyRoute && !!activeCompanyId && Number(activeCompanyId) > 0;
  
  return {
    theme: getThemeColors(isCompanyMode),
    isCompanyMode,
  };
};
