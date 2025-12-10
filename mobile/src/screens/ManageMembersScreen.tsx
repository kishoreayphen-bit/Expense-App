import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CompanyMemberService } from '../api/companyMemberService';
import { useCompany } from '../context/CompanyContext';
import { canManageCompanyMembers, getPermissionContext, getRoleBadgeColor } from '../utils/permissions';

export default function ManageMembersScreen() {
  const navigation = useNavigation<any>();
  const { activeCompanyId, activeCompany } = useCompany();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [inviting, setInviting] = useState(false);

  // Load roles and check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('userRole');
        setUserRole(storedRole);
        
        // Load user's role in the active company from API
        let compRole = null;
        if (activeCompanyId) {
          const companies = await CompanyMemberService.getMyCompanies();
          const currentCompany = companies.find(c => c.id === activeCompanyId);
          if (currentCompany) {
            compRole = currentCompany.userRole;
            setCompanyRole(compRole);
          }
        }
        
        console.log('[ManageMembers] Permission check:', {
          storedRole,
          compRole,
          activeCompanyId,
          canManage: canManageCompanyMembers(getPermissionContext(storedRole as any, compRole as any))
        });
        
        if (!canManageCompanyMembers(getPermissionContext(storedRole as any, compRole as any))) {
          Alert.alert(
            'Permission Denied',
            'Only Admins can manage company members',
            [{ text: 'Go Back', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        console.error('[ManageMembers] Permission check error:', error);
        Alert.alert(
          'Error',
          'Failed to verify permissions',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
      }
    };
    checkPermissions();
  }, [activeCompanyId]);

  // Load members
  useEffect(() => {
    if (activeCompanyId) {
      loadMembers();
    }
  }, [activeCompanyId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await CompanyMemberService.listMembers(activeCompanyId!);
      setMembers(data);
    } catch (error) {
      console.error('[ManageMembers] Load error:', error);
      Alert.alert('Error', 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      setInviting(true);
      await CompanyMemberService.inviteMember(activeCompanyId!, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      
      Alert.alert('Success', 'Invitation sent successfully');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('EMPLOYEE');
      loadMembers();
    } catch (error: any) {
      console.error('[ManageMembers] Invite error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = (member: any) => {
    Alert.alert(
      'Change Role',
      `Change role for ${member.userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Admin', onPress: () => updateMemberRole(member.id, 'ADMIN') },
        { text: 'Manager', onPress: () => updateMemberRole(member.id, 'MANAGER') },
        { text: 'Employee', onPress: () => updateMemberRole(member.id, 'EMPLOYEE') },
      ]
    );
  };

  const updateMemberRole = async (memberId: number, newRole: string) => {
    // TODO: Implement updateMember API endpoint
    Alert.alert('Coming Soon', 'Role update functionality will be available soon');
  };

  const handleRemoveMember = (member: any) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.userName} from the company?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await CompanyMemberService.removeMember(activeCompanyId!, member.id);
              Alert.alert('Success', 'Member removed');
              loadMembers();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  const renderMember = ({ item }: { item: any }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={styles.memberAvatar}>
          <Text style={styles.memberAvatarText}>
            {item.userName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{item.userName}</Text>
          <Text style={styles.memberEmail}>{item.userEmail}</Text>
        </View>
      </View>
      
      <View style={styles.memberActions}>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
          <Text style={styles.roleBadgeText}>{item.role}</Text>
        </View>
        
        <TouchableOpacity onPress={() => handleChangeRole(item)}>
          <MaterialIcons name="edit" size={20} color="#64748B" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => handleRemoveMember(item)}>
          <MaterialIcons name="delete" size={20} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Members</Text>
        <TouchableOpacity onPress={() => setShowInviteModal(true)}>
          <MaterialIcons name="person-add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Invite Member</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleButtons}>
              {(['EMPLOYEE', 'MANAGER', 'ADMIN'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    inviteRole === role && styles.roleButtonActive
                  ]}
                  onPress={() => setInviteRole(role)}
                >
                  <Text style={[
                    styles.roleButtonText,
                    inviteRole === role && styles.roleButtonTextActive
                  ]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.inviteButton]}
                onPress={handleInvite}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.inviteButtonText}>Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  listContent: {
    padding: 16,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  inviteButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
