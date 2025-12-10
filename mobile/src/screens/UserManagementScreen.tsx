import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRole } from '../context/RoleContext';
import { useCompany } from '../context/CompanyContext';
import UserManagementService, { User } from '../api/userManagementService';
import RoleService from '../api/roleService';
import { CompanyMemberService } from '../api/companyMemberService';

export default function UserManagementScreen() {
  const { isSuperAdmin, isAdmin } = useRole();
  const { activeCompanyId } = useCompany();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedRole, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await UserManagementService.getAllUsers(0, 100);
      setUsers(response.content);
      setFilteredUsers(response.content);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'ALL') {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleChangeRole = async (user: User) => {
    if (!isSuperAdmin) {
      Alert.alert('Access Denied', 'Only Super Admins can change user roles');
      return;
    }

    Alert.alert(
      'Change Role',
      `Select new role for ${user.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'EMPLOYEE',
          onPress: () => changeUserRole(user.id, 'EMPLOYEE'),
        },
        {
          text: 'MANAGER',
          onPress: () => changeUserRole(user.id, 'MANAGER'),
        },
        {
          text: 'ADMIN',
          onPress: () => changeUserRole(user.id, 'ADMIN'),
        },
        {
          text: 'SUPER_ADMIN',
          onPress: () => changeUserRole(user.id, 'SUPER_ADMIN'),
        },
      ]
    );
  };

  const changeUserRole = async (userId: number, newRole: string) => {
    try {
      await RoleService.assignRole({ userId, roleName: newRole });
      Alert.alert('Success', 'User role updated successfully');
      loadUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      Alert.alert('Error', 'Failed to change user role');
    }
  };

  const handleDisableUser = async (user: User) => {
    if (!isAdmin && !isSuperAdmin) {
      Alert.alert('Access Denied', 'Only Admins can disable users');
      return;
    }

    Alert.alert(
      'Disable User',
      `Are you sure you want to disable ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              // For now, we'll use role change as disable (set to inactive role)
              Alert.alert('Info', 'User disable feature will be implemented');
              // await UserManagementService.disableUser(user.id);
              // loadUsers();
            } catch (error) {
              console.error('Error disabling user:', error);
              Alert.alert('Error', 'Failed to disable user');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFromCompany = async (user: User) => {
    if (!activeCompanyId) {
      Alert.alert('Error', 'No active company selected');
      return;
    }

    if (!isAdmin && !isSuperAdmin) {
      Alert.alert('Access Denied', 'Only Admins can remove users from company');
      return;
    }

    Alert.alert(
      'Remove User',
      `Remove ${user.name} from this company?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the member ID and remove
              const members = await CompanyMemberService.listMembers(activeCompanyId);
              const member = members.find(m => m.userId === user.id);
              if (member) {
                await CompanyMemberService.removeMember(activeCompanyId, member.id);
                Alert.alert('Success', 'User removed from company');
                loadUsers();
              }
            } catch (error) {
              console.error('Error removing user:', error);
              Alert.alert('Error', 'Failed to remove user from company');
            }
          },
        },
      ]
    );
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionModal(true);
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
      </View>

      <View style={styles.userActions}>
        <View style={[styles.roleBadge, getRoleBadgeStyle(item.role)]}>
          <Text style={styles.roleBadgeText}>{item.role}</Text>
        </View>
        
        <View style={styles.actionButtons}>
          {(isAdmin || isSuperAdmin) && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleChangeRole(item)}
              >
                <MaterialIcons name="edit" size={18} color="#6366F1" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleManagePermissions(item)}
              >
                <MaterialIcons name="security" size={18} color="#10B981" />
              </TouchableOpacity>
              
              {activeCompanyId && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRemoveFromCompany(item)}
                >
                  <MaterialIcons name="person-remove" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDisableUser(item)}
              >
                <MaterialIcons name="block" size={18} color="#F59E0B" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Role Filter - Scrollable */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
      >
        {['ALL', 'EMPLOYEE', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.filterChip,
              selectedRole === role && styles.filterChipActive,
            ]}
            onPress={() => setSelectedRole(role)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedRole === role && styles.filterChipTextActive,
              ]}
            >
              {role}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Permission Management Modal */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Manage Permissions: {selectedUser?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowPermissionModal(false)}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.permissionList}>
              <Text style={styles.permissionNote}>
                Permission management will be implemented based on role-specific actions.
                Current role: <Text style={styles.boldText}>{selectedUser?.role}</Text>
              </Text>
              
              <View style={styles.permissionSection}>
                <Text style={styles.sectionTitle}>Available Actions:</Text>
                <View style={styles.permissionItem}>
                  <MaterialIcons name="visibility" size={20} color="#6366F1" />
                  <Text style={styles.permissionText}>View expenses</Text>
                </View>
                <View style={styles.permissionItem}>
                  <MaterialIcons name="edit" size={20} color="#6366F1" />
                  <Text style={styles.permissionText}>Manage own expenses</Text>
                </View>
                <View style={styles.permissionItem}>
                  <MaterialIcons name="check-circle" size={20} color="#6366F1" />
                  <Text style={styles.permissionText}>Approve expenses (if Manager/Admin)</Text>
                </View>
                <View style={styles.permissionItem}>
                  <MaterialIcons name="people" size={20} color="#6366F1" />
                  <Text style={styles.permissionText}>Manage teams (if Manager/Admin)</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPermissionModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getRoleBadgeStyle = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return { backgroundColor: '#FEE2E2' };
    case 'ADMIN':
      return { backgroundColor: '#FECACA' };
    case 'MANAGER':
      return { backgroundColor: '#FEF3C7' };
    default:
      return { backgroundColor: '#E0E7FF' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  filterScrollView: {
    marginBottom: 16,
    height: 56,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  userActions: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  permissionList: {
    paddingHorizontal: 20,
  },
  permissionNote: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  permissionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  permissionText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#6366F1',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
