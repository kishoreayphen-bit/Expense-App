import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import BillService, { Bill, BillSearchFilters } from '../api/billService';
import { useCompany } from '../context/CompanyContext';

export default function BillsScreen() {
  const { activeCompanyId } = useCompany();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Search filters
  const [searchBillNumber, setSearchBillNumber] = useState('');
  const [searchMerchant, setSearchMerchant] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [activeCompanyId])
  );

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await BillService.listBills(activeCompanyId || 0);
      setBills(data);
    } catch (error: any) {
      console.error('Failed to load bills:', error);
      Alert.alert('Error', 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBills();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      
      const filters: BillSearchFilters = {
        billNumber: searchBillNumber || undefined,
        merchant: searchMerchant || undefined,
        startDate: searchStartDate || undefined,
        endDate: searchEndDate || undefined,
        companyId: activeCompanyId || 0,
      };

      const data = await BillService.searchBills(filters);
      setBills(data);
      setIsSearchActive(true);
      setShowSearchModal(false);
    } catch (error: any) {
      console.error('Failed to search bills:', error);
      Alert.alert('Error', 'Failed to search bills');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchBillNumber('');
    setSearchMerchant('');
    setSearchStartDate('');
    setSearchEndDate('');
    setIsSearchActive(false);
    loadBills();
  };

  const handleDownload = async (bill: Bill) => {
    try {
      Alert.alert('Download', `Bill ${bill.fileName} download initiated. File will be available in your downloads.`);
      // In production, you would implement actual file download here
    } catch (error: any) {
      console.error('Failed to download bill:', error);
      Alert.alert('Error', 'Failed to download bill');
    }
  };

  const handleDelete = (bill: Bill) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete ${bill.fileName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await BillService.deleteBill(bill.id);
              Alert.alert('Success', 'Bill deleted');
              loadBills();
            } catch (error: any) {
              console.error('Failed to delete bill:', error);
              Alert.alert('Error', 'Failed to delete bill');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderBillItem = ({ item }: { item: Bill }) => (
    <View style={styles.billCard}>
      <View style={styles.billHeader}>
        <View style={styles.billIcon}>
          <MaterialIcons 
            name={item.mimeType?.includes('pdf') ? 'picture-as-pdf' : 'image'} 
            size={32} 
            color="#6366F1" 
          />
        </View>
        <View style={styles.billInfo}>
          <Text style={styles.billFileName}>{item.fileName}</Text>
          {item.billNumber && (
            <Text style={styles.billNumber}>#{item.billNumber}</Text>
          )}
          {item.merchant && (
            <Text style={styles.billMerchant}>{item.merchant}</Text>
          )}
          <View style={styles.billMeta}>
            <Text style={styles.billMetaText}>{formatFileSize(item.fileSize)}</Text>
            <Text style={styles.billMetaText}> • </Text>
            <Text style={styles.billMetaText}>{formatDate(item.uploadedAt)}</Text>
          </View>
        </View>
      </View>
      
      {item.amount && (
        <View style={styles.billAmount}>
          <Text style={styles.billAmountText}>
            {item.currency} {item.amount.toFixed(2)}
          </Text>
        </View>
      )}
      
      <View style={styles.billActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDownload(item)}
        >
          <MaterialIcons name="download" size={20} color="#6366F1" />
          <Text style={styles.actionButtonText}>Download</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <MaterialIcons name="delete" size={20} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bills</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSearchModal(true)}
          >
            <MaterialIcons name="search" size={24} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Active Banner */}
      {isSearchActive && (
        <View style={styles.searchBanner}>
          <MaterialIcons name="filter-list" size={16} color="#6366F1" />
          <Text style={styles.searchBannerText}>Search active</Text>
          <TouchableOpacity onPress={clearSearch}>
            <Text style={styles.clearSearchText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bills List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : bills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No bills found</Text>
          <Text style={styles.emptySubtext}>
            Bills attached to expenses will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={bills}
          renderItem={renderBillItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
          }
        />
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Bills</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bill Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter bill number"
                  value={searchBillNumber}
                  onChangeText={setSearchBillNumber}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Merchant</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter merchant name"
                  value={searchMerchant}
                  onChangeText={setSearchMerchant}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={searchStartDate}
                  onChangeText={setSearchStartDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={searchEndDate}
                  onChangeText={setSearchEndDate}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSearchModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.searchButton]}
                onPress={handleSearch}
              >
                <Text style={styles.searchButtonText}>Search</Text>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  searchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    gap: 8,
  },
  searchBannerText: {
    flex: 1,
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  clearSearchText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  billIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  billNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    marginBottom: 2,
  },
  billMerchant: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  billMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  billAmount: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  billAmountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  billActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  searchButton: {
    backgroundColor: '#6366F1',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
