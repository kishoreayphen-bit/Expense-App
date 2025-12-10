import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';

interface Claim {
  id: number;
  amount: number;
  currency: string;
  merchant: string;
  notes: string;
  occurredOn: string;
  reimbursementStatus: string;
  reimbursementRequestedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  companyId: number;
  category: {
    id: number;
    name: string;
    icon: string;
  };
}

export default function GlobalClaimsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialStatus = route.params?.status || null;

  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(initialStatus);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const statusOptions = [
    { label: 'All', value: null, color: '#6B7280' },
    { label: 'Pending', value: 'PENDING', color: '#F59E0B' },
    { label: 'Approved', value: 'APPROVED', color: '#10B981' },
    { label: 'Rejected', value: 'REJECTED', color: '#EF4444' },
    { label: 'Paid', value: 'PAID', color: '#6366F1' },
  ];

  const loadClaims = useCallback(async () => {
    try {
      console.log('[GlobalClaimsScreen] Loading claims - status:', selectedStatus);
      const params: any = {};
      if (selectedStatus) {
        params.status = selectedStatus;
      }
      const response = await api.get('/api/v1/admin/claims', { params });
      console.log('[GlobalClaimsScreen] Claims loaded:', response.data.length);
      setClaims(response.data);
      setFilteredClaims(response.data);
    } catch (error: any) {
      console.error('[GlobalClaimsScreen] Error loading claims:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadClaims();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#F59E0B';
      case 'APPROVED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      case 'PAID':
        return '#6366F1';
      default:
        return '#6B7280';
    }
  };

  const showClaimDetails = (claim: Claim) => {
    setSelectedClaim(claim);
    setShowDetailsModal(true);
  };

  const renderClaim = ({ item }: { item: Claim }) => {
    const statusColor = getStatusColor(item.reimbursementStatus);

    return (
      <TouchableOpacity style={styles.claimCard} onPress={() => showClaimDetails(item)} activeOpacity={0.7}>
        {/* Header */}
        <View style={styles.claimHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: statusColor + '15' }]}>
            <MaterialIcons name={item.category?.icon || 'receipt'} size={20} color={statusColor} />
          </View>
          <View style={styles.claimInfo}>
            <Text style={styles.claimMerchant}>{item.merchant || 'No merchant'}</Text>
            <Text style={styles.claimUser}>{item.user.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.reimbursementStatus}</Text>
          </View>
        </View>

        {/* Amount & Date */}
        <View style={styles.claimDetails}>
          <View style={styles.detailItem}>
            <MaterialIcons name="attach-money" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              {item.currency} {item.amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{new Date(item.occurredOn).toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Notes */}
        {item.notes && (
          <Text style={styles.claimNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.claimFooter}>
          <Text style={styles.companyId}>Company ID: {item.companyId}</Text>
          <Text style={styles.requestedAt}>
            Requested: {new Date(item.reimbursementRequestedAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading claims...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Global Claims</Text>
          <Text style={styles.subtitle}>{filteredClaims.length} claims</Text>
        </View>
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterButton}>
          <MaterialIcons name="filter-list" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Status Filter Chips */}
      <View style={styles.filterChips}>
        {statusOptions.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.filterChip,
              selectedStatus === option.value && { backgroundColor: option.color + '20', borderColor: option.color },
            ]}
            onPress={() => {
              setSelectedStatus(option.value);
              setLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus === option.value && { color: option.color, fontWeight: '700' },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredClaims}
        renderItem={renderClaim}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366F1']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No claims found</Text>
            <Text style={styles.emptySubtext}>Try changing the filter</Text>
          </View>
        }
      />

      {/* Claim Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Claim Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {selectedClaim && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Merchant:</Text>
                  <Text style={styles.detailValue}>{selectedClaim.merchant || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>
                    {selectedClaim.currency} {selectedClaim.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>{selectedClaim.category?.name || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{new Date(selectedClaim.occurredOn).toLocaleDateString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(selectedClaim.reimbursementStatus) }]}>
                    {selectedClaim.reimbursementStatus}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submitted by:</Text>
                  <Text style={styles.detailValue}>{selectedClaim.user.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{selectedClaim.user.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Company ID:</Text>
                  <Text style={styles.detailValue}>{selectedClaim.companyId}</Text>
                </View>
                {selectedClaim.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesValue}>{selectedClaim.notes}</Text>
                  </View>
                )}
              </View>
            )}
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChips: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  claimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  claimInfo: {
    flex: 1,
  },
  claimMerchant: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  claimUser: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  claimDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  claimNotes: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  companyId: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  requestedAt: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  notesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  notesValue: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});
