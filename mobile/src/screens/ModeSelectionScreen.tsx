import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCompany } from '../context/CompanyContext';

export default function ModeSelectionScreen() {
  const navigation = useNavigation<any>();
  const { setActiveCompanyId } = useCompany();

  const handleUserMode = () => {
    // Ensure we exit company mode fully
    try { setActiveCompanyId(null); } catch {}
    navigation.navigate('MainTabs');
  };

  const handleCompanyMode = () => {
    navigation.navigate('CompanySelection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Expense Tracker</Text>
        <Text style={styles.subtitle}>Choose how you want to use the app</Text>

        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={styles.card}
            onPress={handleUserMode}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <MaterialIcons name="person" size={48} color="#1976D2" />
            </View>
            <Text style={styles.cardTitle}>Personal Mode</Text>
            <Text style={styles.cardDescription}>
              Track your personal expenses, budgets, and splits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={handleCompanyMode}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcons name="business" size={48} color="#4CAF50" />
            </View>
            <Text style={styles.cardTitle}>Company Mode</Text>
            <Text style={styles.cardDescription}>
              Manage company expenses, budgets, and team collaboration
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
