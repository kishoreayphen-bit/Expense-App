import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CompanyMemberService } from '../api/companyMemberService';

type InviteMemberScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type InviteMemberScreenRouteProp = RouteProp<RootStackParamList, any>;

export default function InviteMemberScreen() {
  const navigation = useNavigation<InviteMemberScreenNavigationProp>();
  const route = useRoute<InviteMemberScreenRouteProp>();
  
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [loading, setLoading] = useState(false);

  const companyId = (route.params as any)?.companyId;

  const roles: Array<{ value: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'; label: string; description: string; color: string }> = [
    {
      value: 'ADMIN',
      label: 'Admin',
      description: 'Can manage members and company settings',
      color: '#DC2626',
    },
    {
      value: 'MANAGER',
      label: 'Manager',
      description: 'Can approve expenses and view reports',
      color: '#F59E0B',
    },
    {
      value: 'EMPLOYEE',
      label: 'Employee',
      description: 'Can create and manage own expenses',
      color: '#10B981',
    },
  ];

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!companyId) {
      Alert.alert('Error', 'Company ID not found');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await CompanyMemberService.inviteMember(companyId, {
        email: email.trim(),
        role: selectedRole,
      });
      
      Alert.alert(
        'Success',
        `Invitation sent to ${email}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[InviteMember] Error inviting member:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Member</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="member@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.helperText}>Select the role for this member</Text>
          
          {roles.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.roleCard,
                selectedRole === role.value && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedRole(role.value)}
              disabled={loading}
            >
              <View style={styles.roleInfo}>
                <View style={styles.roleHeader}>
                  <View style={[styles.roleBadge, { backgroundColor: role.color }]}>
                    <Text style={styles.roleBadgeText}>{role.label}</Text>
                  </View>
                  {selectedRole === role.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
                  )}
                </View>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.inviteButton, loading && styles.inviteButtonDisabled]}
          onPress={handleInvite}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="mail-outline" size={20} color="#fff" />
              <Text style={styles.inviteButtonText}>Send Invitation</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  roleCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  roleCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  roleInfo: {
    gap: 8,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  inviteButton: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
