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
  TextInput,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { CompanyMemberService, CompanyMember } from '../api/companyMemberService';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';

type PendingInvitationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PendingInvitationsScreen() {
  const navigation = useNavigation<PendingInvitationsScreenNavigationProp>();
  const { activeCompanyId } = useCompany();
  const inCompanyMode = activeCompanyId !== null && activeCompanyId !== undefined && activeCompanyId > 0;
  
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [invitations, setInvitations] = useState<CompanyMember[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedInvitation, setSelectedInvitation] = useState<CompanyMember | null>(null);

  useEffect(() => {
    loadInvitations();
    loadHistory();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await CompanyMemberService.getPendingInvitations();
      setInvitations(data);
    } catch (error: any) {
      console.error('[PendingInvitations] Error loading invitations:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'pending') {
      await loadInvitations();
    } else {
      await loadHistory();
    }
    setRefreshing(false);
  };

  const loadHistory = async () => {
    try {
      // Load invitation-related notifications
      // If in company mode, pass companyId to get company-scoped notifications
      const params = inCompanyMode && activeCompanyId ? { companyId: activeCompanyId } : {};
      const response = await api.get('/api/v1/notifications', { params });
      const notifications = response.data;
      
      // Filter for invitation-related notifications
      const invitationHistory = notifications.filter((n: any) => 
        n.type === 'INVITATION_ACCEPTED' || n.type === 'INVITATION_DECLINED'
      );
      
      setHistory(invitationHistory);
    } catch (error: any) {
      console.error('[PendingInvitations] Error loading history:', error);
    }
  };

  const handleAccept = async (invitation: CompanyMember) => {
    try {
      setProcessingId(invitation.id);
      await CompanyMemberService.acceptInvitation(invitation.companyId);
      
      Alert.alert(
        'Success',
        `You are now a member of ${invitation.companyName}!`,
        [
          {
            text: 'OK',
            onPress: () => loadInvitations(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[PendingInvitations] Error accepting invitation:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = (invitation: CompanyMember) => {
    setSelectedInvitation(invitation);
    setDeclineReason('');
    setDeclineModalVisible(true);
  };

  const confirmDecline = async () => {
    if (!selectedInvitation) return;
    
    try {
      setProcessingId(selectedInvitation.id);
      setDeclineModalVisible(false);
      
      await CompanyMemberService.declineInvitation(
        selectedInvitation.companyId,
        declineReason.trim() || undefined
      );
      
      Alert.alert('Success', 'Invitation declined');
      loadInvitations();
    } catch (error: any) {
      console.error('[PendingInvitations] Error declining invitation:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
      setSelectedInvitation(null);
      setDeclineReason('');
    }
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

  const renderInvitation = ({ item }: { item: CompanyMember }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.invitationCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={32} color="#7C3AED" />
        </View>
        
        <View style={styles.invitationContent}>
          <Text style={styles.companyName}>{item.companyName}</Text>
          <Text style={styles.invitationText}>
            You've been invited to join as{' '}
            <Text style={[styles.roleText, { color: getRoleBadgeColor(item.role) }]}>
              {item.role}
            </Text>
          </Text>
          {item.invitedAt && (
            <Text style={styles.dateText}>
              Invited {new Date(item.invitedAt).toLocaleDateString()}
            </Text>
          )}
          
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleAccept(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.declineButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleDecline(item)}
              disabled={isProcessing}
            >
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading invitations...</Text>
      </View>
    );
  }

  const renderHistoryItem = ({ item }: { item: any }) => {
    const data = item.data ? JSON.parse(item.data) : {};
    const isAccepted = item.type === 'INVITATION_ACCEPTED';
    
    return (
      <View style={[styles.invitationCard, { borderLeftColor: isAccepted ? '#10B981' : '#EF4444' }]}>
        <View style={[styles.iconContainer, { backgroundColor: isAccepted ? '#ECFDF5' : '#FEF2F2' }]}>
          <Ionicons 
            name={isAccepted ? 'checkmark-circle' : 'close-circle'} 
            size={32} 
            color={isAccepted ? '#10B981' : '#EF4444'} 
          />
        </View>
        
        <View style={styles.invitationContent}>
          <Text style={styles.companyName}>{data.companyName || 'Company'}</Text>
          <Text style={styles.invitationText}>
            {data.userEmail} {isAccepted ? 'accepted' : 'declined'} your invitation
          </Text>
          {!isAccepted && data.reason && (
            <Text style={styles.reasonText}>Reason: {data.reason}</Text>
          )}
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitations</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs - History available in both personal and company mode */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({invitations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History ({history.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'pending' ? invitations : history}
        renderItem={activeTab === 'pending' ? renderInvitation : renderHistoryItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'No pending invitations' : 'No invitation history'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'pending' 
                ? "You'll see company invitations here"
                : "You'll see accepted/declined invitations here"}
            </Text>
          </View>
        }
      />

      {/* Decline Modal */}
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Invitation</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to decline the invitation to join{' '}
              <Text style={styles.modalCompanyName}>{selectedInvitation?.companyName}</Text>?
            </Text>
            
            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Let the admin know why you're declining..."
              placeholderTextColor="#9CA3AF"
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setDeclineModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeclineButton]}
                onPress={confirmDecline}
              >
                <Text style={styles.modalDeclineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  listContainer: {
    padding: 16,
  },
  invitationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invitationContent: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  invitationText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  roleText: {
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  declineButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalCompanyName: {
    fontWeight: '600',
    color: '#7C3AED',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  modalDeclineButton: {
    backgroundColor: '#EF4444',
  },
  modalDeclineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#7C3AED',
  },
  reasonText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
