import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCompany } from '../context/CompanyContext';
import { useNavigation } from '@react-navigation/native';

export default function CompanyModeBar() {
  const { activeCompany, activeCompanyId, setActiveCompanyId } = useCompany();
  const navigation = useNavigation<any>();

  if (!activeCompanyId || !activeCompany) {
    return null;
  }

  const handleExitCompanyMode = () => {
    Alert.alert(
      'Exit Company Mode',
      `Exit ${activeCompany.companyName}? You'll return to your personal workspace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            setActiveCompanyId(null);
            // Tabs will automatically switch to personal mode with Dashboard
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <MaterialIcons name="business" size={16} color="#16A34A" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>COMPANY MODE</Text>
          <Text style={styles.companyName}>{activeCompany.companyName}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.exitButton}
        onPress={handleExitCompanyMode}
      >
        <MaterialIcons name="close" size={18} color="#16A34A" />
        <Text style={styles.exitText}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    color: '#15803D',
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  companyName: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '700',
    marginTop: 1,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  exitText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
  },
});
