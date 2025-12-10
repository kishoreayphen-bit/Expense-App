import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CompanyMemberService, CompanyMember } from '../api/companyMemberService';
import { useCompany } from '../context/CompanyContext';

type CompanyMembersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CompanyMembers'>;
type CompanyMembersScreenRouteProp = RouteProp<RootStackParamList, 'CompanyMembers'>;

export default function CompanyMembersScreen() {
  const navigation = useNavigation<CompanyMembersScreenNavigationProp>();
  const route = useRoute<CompanyMembersScreenRouteProp>();
  const { activeCompanyId } = useCompany();
  
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const companyId = route.params?.companyId || activeCompanyId;

  useEffect(() => {
    if (companyId && companyId > 0) {
      loadMembers();
    } else {
      setLoading(false);
      Alert.alert('Error', 'Invalid company ID. Please select a company first.');
      navigation.goBack();
    }
  }, [companyId]);

  const loadMembers = async () => {
    if (!companyId || companyId <= 0) {
      Alert.alert('Error', 'Invalid company ID');
      navigation.goBack();
      return;
    }
    
    try {
      setLoading(true);
      const data = await CompanyMemberService.listMembers(companyId);
      setMembers(data);
      
      // Find current user's role
      const currentMember = data.find(m => m.status === 'ACTIVE');
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    } catch (error: any) {
      console.error('[CompanyMembers] Error loading members:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const handleInviteMember = () => {
    if (!companyId) return;
    navigation.navigate('InviteMember', { companyId });
  };

  const handleRemoveMember = (member: CompanyMember) => {
    if (member.role === 'OWNER') {
      Alert.alert('Cannot Remove', 'Company owner cannot be removed');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.userName} from the company?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!companyId) return;
              await CompanyMemberService.removeMember(companyId, member.id);
              Alert.alert('Success', 'Member removed successfully');
              loadMembers();
            } catch (error: any) {
              console.error('[CompanyMembers] Error removing member:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return '#7C3AED';
      case 'ADMIN': return '#DC2626';
      case 'MANAGER': return '#F59E0B';
      case 'EMPLOYEE': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10B981';
      case 'INVITED': return '#F59E0B';
      case 'SUSPENDED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const renderMember = ({ item }: { item: CompanyMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#fff" />
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{item.userName}</Text>
          <Text style={styles.memberEmail}>{item.userEmail}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
              <Text style={styles.badgeText}>{item.role}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusBadgeColor(item.status) }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
        </View>
      </View>
      {canManageMembers && item.role !== 'OWNER' && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Members</Text>
        {canManageMembers && (
          <TouchableOpacity onPress={handleInviteMember} style={styles.addButton}>
            <Ionicons name="person-add" size={24} color="#7C3AED" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No members yet</Text>
            {canManageMembers && (
              <TouchableOpacity style={styles.inviteButton} onPress={handleInviteMember}>
                <Text style={styles.inviteButtonText}>Invite Members</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 + 12 : 12,
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
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    marginBottom: 24,
  },
  inviteButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
