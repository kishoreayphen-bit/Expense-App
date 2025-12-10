import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Share,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';
import CompanyIndicator from '../components/CompanyIndicator';
import { canApproveExpenses, getPermissionContext } from '../utils/permissions';
// (No gesture handlers required in this simplified screen)

interface Expense {
  id: number;
  merchant: string;
  amount: number;
  currency: string;
  baseAmount: number;
  baseCurrency: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  status: string;
  isReimbursable: boolean;
  receiptUrl?: string;
  receiptFileName?: string;
  receiptFileSize?: number;
  receiptFileType?: string;
  description?: string;
  notes: string | null;
  occurredOn: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  paymentMethod?: string;
  groupId?: number;
  group?: {
    id: number;
    name: string;
  };
  splitShares?: Array<{
    userId: number;
    userName?: string;
    userEmail?: string;
    shareAmount: number;
    status: string;
  }>;
  approvalStatus?: string; // PENDING | APPROVED | REJECTED
  approvedAt?: string;
  submittedAt?: string;
  userId?: number; // Owner of the expense
  userEmail?: string; // Owner email
  reimbursementStatus?: string; // PENDING | APPROVED | REJECTED | PAID
  reimbursementNotes?: string;
  reimbursementRequestedAt?: string;
  reimbursementApprovedAt?: string;
  reimbursementPaidAt?: string;
}

const ExpenseDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { id: number } }, 'params'>>();
  const navigation = useNavigation<NavigationProp<any>>();
  const id = route.params?.id;
  const { activeCompanyId, activeCompany } = useCompany();
  const isCompanyMode = !!activeCompanyId;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  
  // Approval state
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  
  // Load roles and current user email
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('userRole');
        const storedEmail = await AsyncStorage.getItem('userEmail');
        setUserRole(storedRole);
        setCurrentUserEmail(storedEmail);
        
        if (activeCompany && (activeCompany as any).userRole) {
          setCompanyRole((activeCompany as any).userRole);
        } else {
          setCompanyRole(null);
        }
      } catch (error) {
        console.error('[ExpenseDetail] Failed to load roles:', error);
      }
    };
    loadRoles();
  }, [activeCompany]);
  
  // Check if user can approve expenses
  const canUserApprove = canApproveExpenses(
    getPermissionContext(userRole as any, companyRole as any)
  );
  
  // Prevent self-approval: user cannot approve their own expenses
  const isOwnExpense = expense && currentUserEmail && expense.userEmail === currentUserEmail;
  const canApproveThisExpense = canUserApprove && !isOwnExpense;
  
  // Debug logging
  useEffect(() => {
    if (expense) {
      console.log('[ExpenseDetail] Approval Debug:', {
        canUserApprove,
        isCompanyMode,
        approvalStatus: expense.approvalStatus,
        userRole,
        companyRole,
        currentUserEmail,
        expenseOwner: expense.userEmail,
        isOwnExpense,
        canApproveThisExpense,
        showButtons: canApproveThisExpense && isCompanyMode && (!expense.approvalStatus || expense.approvalStatus === 'PENDING')
      });
    }
  }, [expense, canUserApprove, isCompanyMode, userRole, companyRole]);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [receiptImageData, setReceiptImageData] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [existingGroups, setExistingGroups] = useState<any[]>([]);
  const [selectedGroupOption, setSelectedGroupOption] = useState<'new' | 'existing' | null>(null);
  const [selectedExistingGroup, setSelectedExistingGroup] = useState<any>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const sheetOpacity = React.useRef(new Animated.Value(0)).current;
  const sheetTranslate = React.useRef(new Animated.Value(40)).current;
  const modeName = isCompanyMode ? (activeCompany?.companyName ? `Company: ${activeCompany.companyName}` : 'Company Mode') : 'Personal Mode';

  const fetchReceiptImage = async (receiptUrl: string) => {
    try {
      setIsImageLoading(true);
      console.log('[ExpenseDetail] Fetching receipt image from:', receiptUrl);
      
      const response = await api.get(receiptUrl, {
        responseType: 'arraybuffer',
      });
      
      // Convert arraybuffer to base64
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      const base64Image = `data:image/jpeg;base64,${base64}`;
      setReceiptImageData(base64Image);
      setIsImageLoading(false);
      console.log('[ExpenseDetail] Receipt image loaded successfully');
    } catch (err: any) {
      console.error('[ExpenseDetail] Failed to fetch receipt image:', err);
      setIsImageLoading(false);
    }
  };

  const fetchExpenseDetails = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      const isValidCompany = typeof activeCompanyId === 'number' && activeCompanyId > 0;
      const cfg: any = isCompanyMode && isValidCompany
        ? { params: { companyId: activeCompanyId, company_id: activeCompanyId } }
        : { _skipCompany: true };
      const response = await api.get(`/api/v1/expenses/${id}`, cfg);
      let enhancedExpense = {
        ...response.data,
      };
      
      // Try to fetch split shares
      try {
        const splitResponse = await api.get(`/api/v1/expenses/${id}/splits`, {
          _suppressErrorLog: true as any,
        } as any);
        if (splitResponse.data?.splitShares) {
          enhancedExpense.splitShares = splitResponse.data.splitShares;
        }
      } catch (err) {
        // Ignore - expense just won't have split shares
      }
      
      setExpense(enhancedExpense);
      setError(null);

      // Fetch receipt image with auth if available
      if (enhancedExpense.receiptUrl) {
        fetchReceiptImage(enhancedExpense.receiptUrl);
      }
    } catch (err: any) {
      setError('Failed to load expense details. Please try again.');
      throw err;
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchExpenseDetails(true);
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!expense) return;
    
    try {
      setApproving(true);
      
      const endpoint = approvalAction === 'approve' 
        ? `/api/v1/expenses/${expense.id}/approve`
        : `/api/v1/expenses/${expense.id}/reject`;
      
      const body = approvalAction === 'approve'
        ? { notes: approvalNotes }
        : { reason: approvalNotes };
      
      const response = await api.post(
        endpoint,
        body,
        {
          _skipCompany: false as any,
          params: activeCompanyId && activeCompanyId > 0 ? { companyId: activeCompanyId, company_id: activeCompanyId } : undefined,
        } as any
      );
      
      // Update expense with new status
      setExpense(response.data);
      setShowApprovalModal(false);
      setApprovalNotes('');
      
      Alert.alert(
        'Success',
        `Expense ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`
      );
    } catch (error: any) {
      console.error('[ExpenseDetail] Approval error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || `Failed to ${approvalAction} expense`
      );
    } finally {
      setApproving(false);
    }
  };

  const handleCreateGroupClick = async () => {
    if (!expense || !expense.splitShares || expense.splitShares.length === 0) return;
    
    try {
      // Get all user IDs from split shares
      const participantIds = expense.splitShares.map((share: any) => share.userId);
      
      // Fetch all groups to check if participants are already in a group
      const groupsResponse = await api.get('/api/v1/groups');
      const allGroups = Array.isArray(groupsResponse.data) ? groupsResponse.data : (groupsResponse.data?.items || []);
      
      // Find groups that contain some of the participants
      const matchingGroups = allGroups.filter((group: any) => {
        const memberIds = (group.members || []).map((m: any) => m.id || m.userId);
        const commonMembers = participantIds.filter((pid: number) => memberIds.includes(pid));
        return commonMembers.length > 0 && commonMembers.length < participantIds.length;
      });
      
      setExistingGroups(matchingGroups);
      
      if (matchingGroups.length > 0) {
        // Some users are already in a group - show options
        setSelectedGroupOption(null);
      } else {
        // No existing groups - go straight to new group creation
        setSelectedGroupOption('new');
      }
      
      setShowCreateGroupModal(true);
    } catch (err) {
      console.error('Error checking groups:', err);
      Alert.alert('Error', 'Failed to check existing groups');
    }
  };

  const handleCreateGroup = async () => {
    if (!expense || !expense.splitShares) return;
    
    if (selectedGroupOption === 'new' && !newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    if (selectedGroupOption === 'existing' && !selectedExistingGroup) {
      Alert.alert('Error', 'Please select a group');
      return;
    }
    
    try {
      setCreatingGroup(true);
      const participantIds = expense.splitShares.map((share: any) => share.userId);
      
      console.log('[CreateGroup] Participant IDs:', participantIds);
      
      let groupId: number;
      
      if (selectedGroupOption === 'new') {
        // Create new group
        console.log('[CreateGroup] Creating new group:', newGroupName.trim());
        const createResponse = await api.post('/api/v1/groups', {
          name: newGroupName.trim(),
          memberIds: participantIds,
        });
        groupId = createResponse.data.id;
        console.log('[CreateGroup] Group created with ID:', groupId);
        Alert.alert('Success', `Group "${newGroupName}" created successfully!`);
      } else {
        // Add remaining users to existing group
        const existingMemberIds = (selectedExistingGroup.members || []).map((m: any) => m.id || m.userId);
        const newMemberIds = participantIds.filter((pid: number) => !existingMemberIds.includes(pid));
        
        console.log('[CreateGroup] Adding to existing group:', selectedExistingGroup.id);
        console.log('[CreateGroup] New member IDs:', newMemberIds);
        
        if (newMemberIds.length > 0) {
          await api.post(`/api/v1/groups/${selectedExistingGroup.id}/members`, {
            memberIds: newMemberIds,
          });
        }
        
        groupId = selectedExistingGroup.id;
        Alert.alert('Success', `Users added to "${selectedExistingGroup.name}" successfully!`);
      }
      
      // Link expense to the group
      console.log('[CreateGroup] Linking expense', expense.id, 'to group', groupId);
      const linkResponse = await api.patch(`/api/v1/expenses/${expense.id}/group`, { groupId });
      console.log('[CreateGroup] Link response:', linkResponse.data);
      
      // Refresh expense details
      console.log('[CreateGroup] Refreshing expense details...');
      await fetchExpenseDetails(true);
      
      // Close modal
      setShowCreateGroupModal(false);
      setSelectedGroupOption(null);
      setSelectedExistingGroup(null);
      setNewGroupName('');
      
    } catch (err: any) {
      console.error('[CreateGroup] Error:', err);
      console.error('[CreateGroup] Error response:', err.response?.data);
      Alert.alert('Error', err.response?.data?.message || 'Failed to create/update group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Request media library permission once
  useEffect(() => {
    const ensurePermission = async () => {
      try {
        const res = await MediaLibrary.requestPermissionsAsync();
        setHasMediaPermission(res.granted);
      } catch {
        setHasMediaPermission(false);
      }
    };
    ensurePermission();
  }, []);

  const handleDelete = async () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const isValidCompany = typeof activeCompanyId === 'number' && activeCompanyId > 0;
              const delCfg: any = isCompanyMode && isValidCompany
                ? { params: { companyId: activeCompanyId, company_id: activeCompanyId } }
                : { _skipCompany: true };
              await api.delete(`/api/v1/expenses/${id}`, delCfg);
              Alert.alert('Success', 'Expense deleted successfully', [
                { 
                  text: 'OK', 
                  onPress: () => navigation.goBack() 
                }
              ]);
            } catch (err: any) {
              Alert.alert(
                'Error', 
                err?.response?.data?.message || 'Failed to delete expense',
                [ { text: 'OK' } ]
              );
            }
          },
        },
      ]
    );
  };

  const handleShareReceipt = async () => {
    if (!expense?.receiptUrl) return;

    try {
      await Share.share({
        message: `Check out this receipt for ${expense.merchant} - ${expense.amount} ${expense.currency}`,
        url: expense.receiptUrl,
        title: `Receipt for ${expense.merchant}`
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share receipt. Please try again.');
    }
  };

  // Action sheet controls with animation
  const openActionSheet = async () => {
    try { await Haptics.selectionAsync(); } catch {}
    sheetOpacity.setValue(0);
    sheetTranslate.setValue(40);
    setShowActionSheet(true);
    Animated.parallel([
      Animated.timing(sheetOpacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(sheetTranslate, { toValue: 0, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  };

  const closeActionSheet = () => {
    Animated.parallel([
      Animated.timing(sheetOpacity, { toValue: 0, duration: 150, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(sheetTranslate, { toValue: 40, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start(() => setShowActionSheet(false));
  };

  const handleSaveReceipt = async () => {
    if (!expense?.receiptUrl || !hasMediaPermission) return;

    try {
      setSavingReceipt(true);
      const fileUri = '/tmp/' + `receipt_${expense.id}.jpg`;
      const { uri } = await FileSystem.downloadAsync(
        expense.receiptUrl,
        fileUri
      );
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Expense Receipts', asset, false);
      Alert.alert('Success', 'Receipt saved to your photos');
    } catch (error) {
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    } finally {
      setSavingReceipt(false);
    }
  };

  const handleShareDetails = async () => {
    if (!expense) return;
    try {
      const msg = [
        `Expense: ${expense.merchant || '—'}`,
        `Date: ${formatDate(expense.occurredOn, false)}`,
        `Amount: ${expense.amount} ${expense.currency}`,
        expense.baseAmount && expense.baseCurrency ? `Converted: ${expense.baseAmount} ${expense.baseCurrency}` : null,
        expense.categoryName ? `Category: ${expense.categoryName}` : null,
        expense.status ? `Status: ${expense.status}` : null,
        Array.isArray(expense.tags) && expense.tags.length ? `Tags: ${expense.tags.join(', ')}` : null,
      ].filter(Boolean).join('\n');
      await Share.share({ title: 'Expense Details', message: msg });
    } catch {}
  };

  const handleDuplicate = () => {
    if (!expense) return;
    try {
      navigation.navigate('AddExpense', {
        preset: {
          amount: expense.amount,
          currency: expense.currency,
          occurredOn: expense.occurredOn,
          categoryId: (expense as any).categoryId,
          description: expense.description,
          merchant: expense.merchant,
          groupId: (expense as any).groupId,
        }
      });
    } catch {}
  };

  const handleEdit = () => {
    if (expense) {
      navigation.navigate('EditExpense', { expense });
    }
  };

  const formatDate = (dateString: string | undefined | null, includeTime: boolean = true) => {
    if (!dateString) return 'N/A';
    try {
      const dateToFormat = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
      const formatString = includeTime ? 'MMM dd, yyyy hh:mm a' : 'MMM dd, yyyy';
      return format(new Date(dateToFormat), formatString);
    } catch {
      return 'Invalid date';
    }
  };

  const renderLoading = () => {
    if (loading && !isRefreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading expense details...</Text>
        </View>
      );
    }
    return null;
  };

  const renderError = () => {
    if (error && !isRefreshing) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchExpenseDetails()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderReceiptSection = () => {
    if (!expense?.receiptUrl) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Receipt</Text>
          </View>
          <View style={styles.noReceiptContainer}>
            <Ionicons name="receipt-outline" size={48} color="#9E9E9E" />
            <Text style={styles.noReceiptText}>No Receipt Attached</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Receipt</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity style={styles.sectionAction} onPress={handleShareReceipt}>
              <Ionicons name="share-social-outline" size={18} color="#2196F3" />
              <Text style={styles.sectionActionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sectionAction, { marginLeft: 16 }]} onPress={handleSaveReceipt}>
              <Ionicons name="download-outline" size={18} color="#2196F3" />
              <Text style={styles.sectionActionText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.receiptCard} onPress={() => {
          if (expense.receiptUrl) {
            navigation.navigate('ReceiptViewer', {
              uri: expense.receiptUrl,
              title: expense.merchant,
              subtitle: formatDate(expense.occurredOn),
            });
          }
        }}>
          {receiptImageData ? (
            <Image
              source={{ uri: receiptImageData }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.receiptImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }]}>
              <Ionicons name="image-outline" size={48} color="#ccc" />
            </View>
          )}
          {isImageLoading && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator size="small" color="#2196F3" />
            </View>
          )}
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptFileName} numberOfLines={1}>
              {expense.receiptFileName || 'Receipt'}
            </Text>
            {expense.receiptFileSize && (
              <Text style={styles.receiptFileSize}>{formatFileSize(expense.receiptFileSize)}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !isRefreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading expense details...</Text>
        </View>
      );
    }

    if (error && !isRefreshing) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchExpenseDetails()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!expense) return null;

    const hasConversion = !!expense.baseAmount && expense.baseCurrency && expense.currency && expense.currency.toUpperCase() !== (expense.baseCurrency || '').toUpperCase();
    const impliedRate = hasConversion && expense.amount ? Number(expense.baseAmount) / Number(expense.amount || 1) : null;

    const getCurrencySymbol = (cur?: string) => {
      const c = (cur || '').toUpperCase();
      switch (c) {
        case 'INR': return '₹';
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'JPY': return '¥';
        default: return c ? `${c} ` : '';
      }
    };

    const fmtMoney = (amount?: number, cur?: string) => {
      if (amount === null || amount === undefined) return '—';
      const sym = getCurrencySymbol(cur);
      return `${sym}${Number(amount).toFixed(2)}${sym === '' && cur ? ' ' + cur : ''}`;
    };

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchExpenseDetails(true)}
            colors={["#3b82f6"]}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.merchantText} numberOfLines={1}>{expense.merchant || 'Merchant'}</Text>
              
              {/* Approval Status Badge */}
              {expense.approvalStatus && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 
                    expense.approvalStatus === 'APPROVED' ? '#DCFCE7' :
                    expense.approvalStatus === 'REJECTED' ? '#FEE2E2' :
                    '#FEF3C7',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  marginTop: 8,
                  alignSelf: 'flex-start',
                }}>
                  <MaterialIcons 
                    name={
                      expense.approvalStatus === 'APPROVED' ? 'check-circle' :
                      expense.approvalStatus === 'REJECTED' ? 'cancel' :
                      'pending'
                    }
                    size={16}
                    color={
                      expense.approvalStatus === 'APPROVED' ? '#16A34A' :
                      expense.approvalStatus === 'REJECTED' ? '#DC2626' :
                      '#CA8A04'
                    }
                  />
                  <Text style={{
                    marginLeft: 6,
                    fontSize: 12,
                    fontWeight: '700',
                    color:
                      expense.approvalStatus === 'APPROVED' ? '#16A34A' :
                      expense.approvalStatus === 'REJECTED' ? '#DC2626' :
                      '#CA8A04'
                  }}>
                    {expense.approvalStatus}
                  </Text>
                </View>
              )}
              
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
                <Text style={styles.dateText}>{formatDate(expense.occurredOn, false)}</Text>
              </View>
              <View style={styles.pillRow}>
                {!!expense.categoryName && (
                  <View style={[styles.pillSoft, styles.pillCategory]}>
                    <Ionicons name="pricetag-outline" size={14} color="#0ea5e9" />
                    <Text style={[styles.pillTextSoft, { color:'#0ea5e9' }]} numberOfLines={1}>{expense.categoryName}</Text>
                  </View>
                )}
                {(expense as any)?.group?.name || (expense as any)?.groupId ? (
                  <View style={[styles.pillSoft, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}> 
                    <Ionicons name="people-outline" size={14} color="#4F46E5" />
                    <Text style={[styles.pillTextSoft, { color:'#4F46E5' }]} numberOfLines={1}>
                      {(expense as any)?.group?.name || 'Group Expense'}
                    </Text>
                  </View>
                ) : null}
                {!!expense.status && (
                  <View style={[styles.pillSoft, styles.pillStatus]}>
                    <Ionicons name="ellipse" size={10} color={expense.status === 'APPROVED' ? '#22c55e' : expense.status === 'REJECTED' ? '#ef4444' : '#f59e0b'} />
                    <Text style={styles.pillTextSoft}>{expense.status.charAt(0) + expense.status.slice(1).toLowerCase()}</Text>
                  </View>
                )}
                {expense?.isReimbursable ? (
                  <View style={[styles.pillSoft, styles.pillInfo]}>
                    <Ionicons name="swap-horizontal-outline" size={14} color="#1976D2" />
                    <Text style={[styles.pillTextSoft, { color:'#1976D2' }]}>Reimbursable</Text>
                  </View>
                ) : null}
                {isCompanyMode ? (
                  <View style={[styles.pillSoft, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}> 
                    <Ionicons name="briefcase-outline" size={14} color="#059669" />
                    <Text style={[styles.pillTextSoft, { color:'#059669' }]}>Company</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {!!expense.receiptUrl && (
              <TouchableOpacity onPress={handleShareReceipt} style={[styles.kebabBtn, { marginRight: 6 }]}>
                <Ionicons name="share-social-outline" size={18} color="#334155" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={openActionSheet} style={styles.kebabBtn}>
              <Ionicons name="ellipsis-vertical" size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Amounts */}
          <View style={styles.amountBlock}>
            {(() => {
              const useBase = hasConversion;
              const val = useBase ? Number(expense.baseAmount) : Number(expense.amount);
              const cur = useBase ? expense.baseCurrency : expense.currency;
              const sym = getCurrencySymbol(cur);
              return (
                <Text style={styles.amountPrimary}>
                  <Text style={styles.amountNumber}>{Number(val || 0).toFixed(2)}</Text>
                  <Text style={styles.amountCurrency}> {sym || (cur || '')}</Text>
                </Text>
              );
            })()}
            {hasConversion && (
              <View style={styles.rateRow}>
                <Text style={styles.amountSecondary}>≈ {fmtMoney(expense.amount, expense.currency)}</Text>
                {impliedRate && (
                  <View style={styles.ratePill}>
                    <Ionicons name="trending-up-outline" size={14} color="#0369a1" />
                    <Text style={styles.ratePillText}>{`${impliedRate.toFixed(4)} ${expense.baseCurrency}/${expense.currency}`}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Actions moved to kebab menu */}
        </View>

        {/* Details section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{expense.categoryName || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(expense.occurredOn, false)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{fmtMoney(expense.amount, expense.currency)}</Text>
          </View>
          {hasConversion && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Converted</Text>
                <Text style={styles.detailValue}>{fmtMoney(expense.baseAmount, expense.baseCurrency)}</Text>
              </View>
            </>
          )}
          {!!expense.description && (
            <>
              <View style={styles.divider} />
              <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={[styles.detailValue, { flex: 1 }]}>{expense.description}</Text>
              </View>
            </>
          )}
          {!!expense.notes && (
            <>
              <View style={styles.divider} />
              <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={[styles.detailValue, { flex: 1 }]}>{expense.notes}</Text>
              </View>
            </>
          )}
          {Array.isArray(expense.tags) && expense.tags.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Tags</Text>
                <View style={{ flex:1, alignItems:'flex-end', flexDirection:'row', flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {expense.tags.map((t, idx) => (
                    <View key={`${t}-${idx}`} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
          {!!expense.paymentMethod && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment</Text>
                <Text style={styles.detailValue}>{expense.paymentMethod}</Text>
              </View>
            </>
          )}
        </View>

        {/* Reimbursement Section */}
        {expense.isReimbursable && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Reimbursement</Text>
            </View>
            
            {/* Show reimbursement status if requested */}
            {expense.reimbursementStatus ? (
              <View style={styles.reimbursementStatusContainer}>
                <View style={[
                  styles.reimbursementStatusBadge,
                  expense.reimbursementStatus === 'PENDING' && styles.statusPending,
                  expense.reimbursementStatus === 'APPROVED' && styles.statusApproved,
                  expense.reimbursementStatus === 'REJECTED' && styles.statusRejected,
                  expense.reimbursementStatus === 'PAID' && styles.statusPaid,
                ]}>
                  <MaterialIcons 
                    name={
                      expense.reimbursementStatus === 'PENDING' ? 'schedule' :
                      expense.reimbursementStatus === 'APPROVED' ? 'check-circle' :
                      expense.reimbursementStatus === 'REJECTED' ? 'cancel' :
                      'payments'
                    }
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.reimbursementStatusText}>
                    {expense.reimbursementStatus}
                  </Text>
                </View>
                
                {expense.reimbursementNotes && (
                  <View style={styles.reimbursementNotesBox}>
                    <Text style={styles.reimbursementNotesLabel}>
                      {expense.reimbursementStatus === 'REJECTED' ? 'Rejection Reason:' : 'Notes:'}
                    </Text>
                    <Text style={styles.reimbursementNotesText}>{expense.reimbursementNotes}</Text>
                  </View>
                )}
              </View>
            ) : (
              /* Show request button if not yet requested */
              <TouchableOpacity
                style={styles.requestReimbursementButton}
                onPress={async () => {
                  try {
                    Alert.alert(
                      'Request Reimbursement',
                      'Submit this expense for reimbursement approval?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Submit',
                          onPress: async () => {
                            try {
                              const { ReimbursementService } = require('../api/reimbursementService');
                              await ReimbursementService.requestReimbursement(expense.id);
                              Alert.alert('Success', 'Reimbursement request submitted!');
                              fetchExpenseDetails(); // Reload to show new status
                            } catch (err: any) {
                              console.error('Error requesting reimbursement:', err);
                              Alert.alert('Error', err.response?.data?.message || 'Failed to submit request');
                            }
                          }
                        }
                      ]
                    );
                  } catch (err) {
                    console.error('Error:', err);
                  }
                }}
              >
                <MaterialIcons name="request-quote" size={20} color="#fff" />
                <Text style={styles.requestReimbursementButtonText}>Request Reimbursement</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* DEBUG: Show why approval buttons aren't showing */}
        {false && (
          <View style={{ backgroundColor: '#FEF3C7', padding: 12, marginHorizontal: 16, marginBottom: 8, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E', marginBottom: 4 }}>DEBUG - Approval Conditions:</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>canUserApprove: {String(canUserApprove)}</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>isCompanyMode: {String(isCompanyMode)}</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>approvalStatus: {expense.approvalStatus || 'undefined'}</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>userRole: {userRole || 'null'}</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>companyRole: {companyRole || 'null'}</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>currentUser: {currentUserEmail || 'null'}</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>expenseOwner: {expense.userEmail || 'null'}</Text>
            <Text style={{ fontSize: 10, color: '#92400E' }}>isOwnExpense: {String(isOwnExpense)}</Text>
            <Text style={{ fontSize: 10, color: '#92400E', marginTop: 4, fontWeight: '700' }}>
              Show Buttons: {String(canApproveThisExpense && isCompanyMode && (!expense.approvalStatus || expense.approvalStatus === 'PENDING'))}
            </Text>
            {isOwnExpense && (
              <Text style={{ fontSize: 10, color: '#DC2626', marginTop: 4, fontWeight: '700' }}>
                ⚠️ Cannot approve own expense
              </Text>
            )}
          </View>
        )}

        {/* Approval Buttons - Only for MANAGER/ADMIN (not own expense) */}
        {canApproveThisExpense && isCompanyMode && (!expense.approvalStatus || expense.approvalStatus === 'PENDING') && (
          <View style={styles.approvalSection}>
            <Text style={styles.sectionTitle}>Approval Required</Text>
            <View style={styles.approvalButtons}>
              <TouchableOpacity
                style={[styles.approvalButton, styles.approveButton]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setApprovalAction('approve');
                  setShowApprovalModal(true);
                }}
                disabled={approving}
              >
                <MaterialIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.approvalButtonText}>Approve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.approvalButton, styles.rejectButton]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setApprovalAction('reject');
                  setShowApprovalModal(true);
                }}
                disabled={approving}
              >
                <MaterialIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.approvalButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Group Expense Details Section */}
        {((expense.groupId || expense.group) || (expense.splitShares && expense.splitShares.length > 0)) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color="#4F46E5" />
              <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Group Expense Details</Text>
            </View>
            
            {/* Show group name if this is a group expense */}
            {(expense.groupId || expense.group) && (
              <View style={styles.groupInfoCard}>
                <View style={styles.groupInfoRow}>
                  <Ionicons name="people-circle-outline" size={24} color="#7C3AED" />
                  <View style={styles.groupInfoText}>
                    <Text style={styles.groupLabel}>Group</Text>
                    <Text style={styles.groupName}>{expense.group?.name || 'Group Expense'}</Text>
                  </View>
                </View>
              </View>
            )}
            
            {/* Show split information */}
            {expense.splitShares && expense.splitShares.length > 0 && (
              <>
                <View style={styles.splitInfo}>
                  <Text style={styles.splitInfoText}>
                    {(expense.groupId || expense.group) 
                      ? `Split among ${expense.splitShares.length} group members`
                      : `Split among ${expense.splitShares.length} ${expense.splitShares.length === 1 ? 'person' : 'people'}`
                    }
                  </Text>
                </View>
                {expense.splitShares.map((share, index) => (
                  <View key={`share-${share.userId}-${index}`} style={styles.splitShareRow}>
                    <View style={styles.splitShareUser}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                          {(share.userName || share.userEmail || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{share.userName || share.userEmail || `User #${share.userId}`}</Text>
                        {share.userEmail && share.userName && (
                          <Text style={styles.userEmail}>{share.userEmail}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.splitShareAmount}>
                      <Text style={styles.shareAmount}>{fmtMoney(share.shareAmount, expense.currency)}</Text>
                      <View style={[
                        styles.shareStatusBadge,
                        share.status === 'SETTLED' && styles.shareStatusSettled,
                        share.status === 'PENDING' && styles.shareStatusPending
                      ]}>
                        <Text style={[
                          styles.shareStatusText,
                          share.status === 'SETTLED' && { color: '#059669' },
                          share.status === 'PENDING' && { color: '#d97706' }
                        ]}>
                          {share.status === 'SETTLED' ? 'SETTLED' : 'PENDING'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                
                {/* Create Group Button - Only show for custom split expenses (no groupId) */}
                {!expense.groupId && !expense.group && expense.splitShares && expense.splitShares.length > 0 && (
                  <TouchableOpacity 
                    style={styles.createGroupButton}
                    onPress={handleCreateGroupClick}
                  >
                    <Ionicons name="people-circle" size={20} color="#7C3AED" />
                    <Text style={styles.createGroupButtonText}>Create Group from This Expense</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {renderReceiptSection()}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Expense ID: {expense.id} • {formatDate(expense.updatedAt || expense.createdAt || expense.occurredOn, false)}
          </Text>
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    );
  };

  useEffect(() => {
    fetchExpenseDetails();
    const unsubscribe = navigation.addListener('focus', () => fetchExpenseDetails());
    return unsubscribe;
  }, [id, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Mode badge */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection:'row', alignItems:'center', alignSelf:'flex-start', backgroundColor: isCompanyMode ? '#ECFDF5' : '#EFF6FF', borderColor: isCompanyMode ? '#A7F3D0' : '#BFDBFE', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
          <Ionicons name={isCompanyMode ? 'briefcase-outline' : 'person-outline'} size={14} color={isCompanyMode ? '#059669' : '#2563EB'} />
          <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', color: isCompanyMode ? '#065F46' : '#1E40AF' }}>{modeName}</Text>
        </View>
      </View>
      {renderContent()}
      {/* Action Sheet */}
      {showActionSheet && (
        <View style={styles.actionSheetBackdrop}>
          <View style={styles.actionSheet}>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { setShowActionSheet(false); handleEdit(); }}>
              <Ionicons name="create-outline" size={18} color="#0F172A" />
              <Text style={styles.actionSheetItemText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { setShowActionSheet(false); handleDuplicate(); }}>
              <Ionicons name="copy-outline" size={18} color="#0F172A" />
              <Text style={styles.actionSheetItemText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => { setShowActionSheet(false); handleShareDetails(); }}>
              <Ionicons name="share-outline" size={18} color="#0F172A" />
              <Text style={styles.actionSheetItemText}>Share</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={[styles.actionSheetItem]} onPress={() => { setShowActionSheet(false); handleDelete(); }}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={[styles.actionSheetItemText, styles.actionSheetItemDestructive]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionSheetItem, { justifyContent:'center' }]} onPress={() => setShowActionSheet(false)}>
              <Text style={[styles.actionSheetItemText, { fontWeight:'700' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {existingGroups.length > 0 && !selectedGroupOption && (
              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  Some participants are already in existing groups. Choose an option:
                </Text>
                
                <TouchableOpacity 
                  style={styles.optionButton}
                  onPress={() => setSelectedGroupOption('new')}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#7C3AED" />
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Create New Group</Text>
                    <Text style={styles.optionSubtitle}>Create a new group with all participants</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.optionButton}
                  onPress={() => setSelectedGroupOption('existing')}
                >
                  <Ionicons name="people-outline" size={24} color="#7C3AED" />
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Add to Existing Group</Text>
                    <Text style={styles.optionSubtitle}>Add remaining users to an existing group</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            
            {selectedGroupOption === 'new' && (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Group Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  autoFocus
                />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowCreateGroupModal(false);
                      setSelectedGroupOption(null);
                      setNewGroupName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.createButton]}
                    onPress={handleCreateGroup}
                    disabled={creatingGroup}
                  >
                    <Text style={styles.createButtonText}>
                      {creatingGroup ? 'Creating...' : 'Create Group'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {selectedGroupOption === 'existing' && (
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Select Group</Text>
                {existingGroups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.groupOption,
                      selectedExistingGroup?.id === group.id && styles.groupOptionSelected
                    ]}
                    onPress={() => setSelectedExistingGroup(group)}
                  >
                    <Ionicons 
                      name={selectedExistingGroup?.id === group.id ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={selectedExistingGroup?.id === group.id ? "#7C3AED" : "#94a3b8"} 
                    />
                    <View style={styles.groupOptionText}>
                      <Text style={styles.groupOptionName}>{group.name}</Text>
                      <Text style={styles.groupOptionMembers}>
                        {group.members?.length || 0} members
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowCreateGroupModal(false);
                      setSelectedGroupOption(null);
                      setSelectedExistingGroup(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.createButton]}
                    onPress={handleCreateGroup}
                    disabled={creatingGroup}
                  >
                    <Text style={styles.createButtonText}>
                      {creatingGroup ? 'Adding...' : 'Add to Group'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Approval Modal */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.approvalModal}>
            <Text style={styles.modalTitle}>
              {approvalAction === 'approve' ? 'Approve Expense' : 'Reject Expense'}
            </Text>
            
            <Text style={styles.modalSubtitle}>
              {approvalAction === 'approve' 
                ? 'Add optional notes for approval'
                : 'Please provide a reason for rejection'}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={approvalAction === 'approve' ? 'Notes (optional)' : 'Reason for rejection'}
              value={approvalNotes}
              onChangeText={setApprovalNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowApprovalModal(false);
                  setApprovalNotes('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  approvalAction === 'approve' ? styles.modalApproveButton : styles.modalRejectButton
                ]}
                onPress={handleApprovalSubmit}
                disabled={approving}
              >
                {approving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Helpers
const formatFileSize = (bytes: number): string => {
  if (!bytes && bytes !== 0) return '';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionActionText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  noReceiptContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  noReceiptText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  receiptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptImage: {
    width: '100%',
    height: 200,
  },
  imageLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  receiptInfo: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  receiptFileName: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '600',
  },
  receiptFileSize: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kebabBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  merchantText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  dateText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillInfo: {
    marginLeft: 8,
  },
  pillText: {
    color: '#1976D2',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  pillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pillCategory: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  pillStatus: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  pillTextSoft: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountBlock: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  amountPrimary: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  amountNumber: {
    color: '#0f172a',
  },
  amountCurrency: {
    color: '#64748b',
    fontWeight: '800',
  },
  amountSecondary: {
    marginTop: 8,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 8,
  },
  ratePillText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  ghostBtn: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  ghostBtnText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  actionSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionSheetItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  actionSheetItemDestructive: {
    color: '#DC2626',
  },
  detailRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
    width: 120,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: '#1a202c',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingAnimation: {
    width: 100,
    height: 100,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  errorAnimation: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
    lineHeight: 26,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  tagChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 8,
    marginBottom: 8,
  },
  tagChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  // Split details styles
  splitInfo: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    marginHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  splitInfoText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    lineHeight: 18,
  },
  groupInfoCard: {
    backgroundColor: '#F5F3FF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  groupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupInfoText: {
    flex: 1,
    justifyContent: 'center',
  },
  groupLabel: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5B21B6',
    lineHeight: 22,
  },
  splitShareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  splitShareUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
    minWidth: 0,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flexWrap: 'wrap',
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  splitShareAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shareAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  shareStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    minWidth: 65,
    alignItems: 'center',
    flexShrink: 0,
  },
  shareStatusSettled: {
    backgroundColor: '#d1fae5',
  },
  shareStatusPending: {
    backgroundColor: '#fef3c7',
  },
  shareStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Pay Button
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Create Group Button
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  createGroupButtonText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: -0.2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  createButton: {
    backgroundColor: '#7C3AED',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  groupOptionSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  groupOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  groupOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  groupOptionMembers: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  // Approval styles
  approvalSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  approvalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#16A34A',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  approvalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  approvalModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 80,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    backgroundColor: '#F1F5F9',
  },
  modalApproveButton: {
    backgroundColor: '#16A34A',
  },
  modalRejectButton: {
    backgroundColor: '#DC2626',
  },
  modalCancelButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Reimbursement styles
  reimbursementStatusContainer: {
    marginTop: 12,
  },
  reimbursementStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusPending: {
    backgroundColor: '#F59E0B',
  },
  statusApproved: {
    backgroundColor: '#10B981',
  },
  statusRejected: {
    backgroundColor: '#EF4444',
  },
  statusPaid: {
    backgroundColor: '#6366F1',
  },
  reimbursementStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reimbursementNotesBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
  },
  reimbursementNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  reimbursementNotesText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  requestReimbursementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  requestReimbursementButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ExpenseDetailScreen;
