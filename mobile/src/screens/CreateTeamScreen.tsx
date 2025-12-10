import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GroupService, UserSummary } from '../api/groupService';
import { CompanyMemberService } from '../api/companyMemberService';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { canCreateTeam, getPermissionContext, PERMISSION_HINTS } from '../utils/permissions';

export default function CreateTeamScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { activeCompanyId, activeCompany } = useCompany();
  const isCompanyMode = !!activeCompanyId;
  
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<string | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Get system role from AsyncStorage
        const storedRole = await AsyncStorage.getItem('userRole');
        setUserRole(storedRole);
        
        // Get company role from active company
        if (activeCompany && (activeCompany as any).userRole) {
          setCompanyRole((activeCompany as any).userRole);
        } else {
          setCompanyRole(null);
        }
        
        // Check if user has permission
        const hasPermission = canCreateTeam(
          getPermissionContext(storedRole as any, (activeCompany as any)?.userRole as any)
        );
        
        if (!hasPermission && isCompanyMode) {
          Alert.alert(
            'Permission Denied',
            PERMISSION_HINTS.CREATE_TEAM,
            [
              {
                text: 'Go Back',
                onPress: () => navigation.goBack(),
              },
            ],
            { cancelable: false }
          );
        }
        
        setPermissionChecked(true);
      } catch (error) {
        console.error('[CreateTeamScreen] Failed to check permissions:', error);
        setPermissionChecked(true);
      }
    };
    
    checkPermissions();
  }, [activeCompany, isCompanyMode]);

  useEffect(() => {
    if (permissionChecked) {
      loadUsers();
    }
  }, [permissionChecked]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      if (isCompanyMode && activeCompanyId) {
        // Load company members when in company mode
        console.log('[CreateTeamScreen] Loading company members for company:', activeCompanyId);
        const companyMembers = await CompanyMemberService.listMembers(activeCompanyId);
        
        // Filter only ACTIVE members and convert to UserSummary format
        const activeMembers = companyMembers
          .filter(m => m.status === 'ACTIVE')
          .map(m => ({
            id: m.userId,
            name: m.userName || m.userEmail,
            email: m.userEmail,
          }));
        
        console.log('[CreateTeamScreen] Loaded company members:', activeMembers.length);
        setUsers(activeMembers);
      } else {
        // Load users from groups in personal mode
        console.log('[CreateTeamScreen] Loading users from groups (personal mode)');
        const groups = await GroupService.listGroups();
        const usersMap = new Map<number, UserSummary>();
        
        groups.forEach((g) => {
          const members = Array.isArray(g?.members) ? g.members : [];
          members.forEach((m: any) => {
            const id = m?.id ?? m?.userId ?? m?.uid;
            const idNum = typeof id === 'number' ? id : parseInt(id, 10);
            if (!Number.isFinite(idNum)) return;
            
            const email = m?.email || m?.emailAddress || '';
            const name = m?.name || m?.fullName || email || `User #${idNum}`;
            
            if (!usersMap.has(idNum)) {
              usersMap.set(idNum, { id: idNum, name, email });
            }
          });
        });
        
        setUsers(Array.from(usersMap.values()));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }

    if (selectedUserIds.size === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    try {
      setCreating(true);
      const memberIds = Array.from(selectedUserIds.values()).filter(id => id > 0);
      const group = await GroupService.createGroup(teamName.trim(), memberIds);
      
      if (group) {
        Alert.alert('Success', `Team "${group.name}" created successfully!`, [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create team');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
      Alert.alert('Error', 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  const renderUserItem = ({ item }: { item: UserSummary }) => {
    const isSelected = selectedUserIds.has(item.id);
    const initial = item.name.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUser(item.id)}
      >
        <View style={styles.userLeft}>
          <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
            <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
              {initial}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <MaterialIcons name="check" size={18} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isCompanyMode ? 'Create Team' : 'Create Group'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Team Info Card */}
          <View style={styles.card}>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="groups" size={32} color="#7C3AED" />
              </View>
              <Text style={styles.cardTitle}>{isCompanyMode ? 'Team' : 'Group'} Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isCompanyMode ? 'Team' : 'Group'} Name *</Text>
              <TextInput
                style={styles.input}
                placeholder={isCompanyMode ? 'Enter team name' : 'Enter group name'}
                placeholderTextColor="#94A3B8"
                value={teamName}
                onChangeText={setTeamName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={isCompanyMode ? "What's this team for?" : "What's this group for?"}
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Members Card */}
          <View style={styles.card}>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="person-add" size={32} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Add Members</Text>
                <Text style={styles.cardSubtitle}>
                  {selectedUserIds.size} member{selectedUserIds.size !== 1 ? 's' : ''} selected
                  {isCompanyMode && ' from company'}
                </Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#64748B" />
              <TextInput
                style={styles.searchInput}
                placeholder={isCompanyMode ? 'Search company members...' : 'Search members...'}
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Users List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.loadingText}>Loading members...</Text>
              </View>
            ) : (
              <View style={styles.usersList}>
                {filteredUsers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="people-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.emptyText}>
                      {isCompanyMode 
                        ? 'No company members found. Invite members to your company first.' 
                        : 'No members found'}
                    </Text>
                  </View>
                ) : (
                  filteredUsers.map((user) => (
                    <View key={user.id}>
                      {renderUserItem({ item: user })}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Create Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (creating || !teamName.trim() || selectedUserIds.size === 0) &&
                styles.createButtonDisabled,
            ]}
            onPress={createTeam}
            disabled={creating || !teamName.trim() || selectedUserIds.size === 0}
          >
            {creating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="group-add" size={24} color="#FFFFFF" />
                <Text style={styles.createButtonText}>{isCompanyMode ? 'Create Team' : 'Create Group'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 32 : 32,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  usersList: {
    gap: 12,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  userItemSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelected: {
    backgroundColor: '#7C3AED',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#64748B',
  },
  avatarTextSelected: {
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0.1,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
