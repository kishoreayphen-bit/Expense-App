import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCompany } from '../context/CompanyContext';
import { useNavigation } from '@react-navigation/native';

interface CompanyIndicatorProps {
  showSwitch?: boolean;
  showBackButton?: boolean;
}

export default function CompanyIndicator({ showSwitch = true, showBackButton = false }: CompanyIndicatorProps) {
  const { activeCompany, activeCompanyId } = useCompany();
  const navigation = useNavigation<any>();

  if (!activeCompanyId) {
    return null;
  }

  const handleBackPress = () => {
    // Navigate back to Company Dashboard
    navigation.navigate('MainTabs', { screen: 'Dashboard' });
  };

  const handleSwitchPress = () => {
    // Navigate to company selection flow
    navigation.navigate('CompanySelection');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <MaterialIcons name="business" size={16} color="#16A34A" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Active Company</Text>
          <Text style={styles.companyName}>{activeCompany?.companyName || 'Company'}</Text>
          {activeCompany?.companyCode ? (
            <Text style={styles.companyMeta}>{activeCompany.companyCode}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.buttonContainer}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <MaterialIcons name="arrow-back" size={18} color="#16A34A" />
          </TouchableOpacity>
        )}
        {showSwitch && (
          <TouchableOpacity
            style={styles.switchButton}
            onPress={handleSwitchPress}
          >
            <MaterialIcons name="swap-horiz" size={18} color="#16A34A" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#15803D',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companyName: {
    fontSize: 16,
    color: '#166534',
    fontWeight: '800',
    marginTop: 2,
  },
  companyMeta: {
    fontSize: 12,
    color: '#166534',
    opacity: 0.8,
    marginTop: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#A7E0B5',
  },
  switchButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#A7E0B5',
  },
});
