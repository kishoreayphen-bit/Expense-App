import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { api, getAuthToken } from '../api/client';
import { ExpenseService } from '../api/expenseService';
import { ReimbursementService } from '../api/reimbursementService';
import BillService from '../api/billService';
import { useCompany } from '../context/CompanyContext';

type Category = {
  id: number;
  name: string;
  icon: string;
};

type User = {
  id: number;
  name: string;
  email: string;
};

type Currency = {
  code: string;
  name: string;
  symbol: string;
};

type SplitType = 'equal' | 'amount' | 'percentage';

const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'CUSTOM', name: 'Custom Currency', symbol: '' },
];

export default function AddExpenseScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { activeCompanyId } = useCompany();
  const route = useRoute<any>();
  const isCompanyRoute = route?.params?.fromCompany === true;
  // Company mode is active if we have a valid activeCompanyId in context (regardless of route)
  const isCompanyMode = !!activeCompanyId && Number(activeCompanyId) > 0;
  
  // State hooks
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [isGroupExpense, setIsGroupExpense] = useState(false);
  const [groupExpenseType, setGroupExpenseType] = useState<'existing' | 'custom'>('existing'); // existing group or custom users
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Array<{id: number; name: string}>>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [customCurrency, setCustomCurrency] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'INR',
    merchant: '',
    categoryId: '',
    description: '',
    occurredOn: new Date().toISOString().split('T')[0],
    isGroupExpense: false,
    groupId: null as number | null,
    splitDetails: {},
  });

  // Load groups for group expense selection
  const loadGroups = useCallback(async () => {
    try {
      const grpResp = await api.get('/api/v1/groups');
      const groupsArr = Array.isArray(grpResp?.data) ? grpResp.data : [];
      const groupsList = groupsArr.map((g: any) => ({
        id: Number(g?.id || 0),
        name: String(g?.name || 'Unnamed Group')
      })).filter((g: any) => g.id > 0);
      setGroups(groupsList);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setGroups([]);
    }
  }, []);

  // Load users for group expenses — build list from group members to avoid /users 404
  const loadUsers = useCallback(async (groupId?: number) => {
    try {
      const grpResp = await api.get('/api/v1/groups');
      const groupsArr = Array.isArray(grpResp?.data) ? grpResp.data : [];
      const memberMap = new Map<number, { id:number; name:string; email:string }>();
      
      // If groupId specified, only load members from that group
      const targetGroups = groupId 
        ? groupsArr.filter((g: any) => Number(g?.id) === groupId)
        : groupsArr;
      
      for (const g of targetGroups) {
        const members = Array.isArray(g?.members) ? g.members : [];
        for (const m of members) {
          const id = Number(m?.id || 0);
          if (!memberMap.has(id)) {
            memberMap.set(id, { id, name: m?.name || 'Member', email: m?.email || '' });
          }
        }
      }
      setUsers(Array.from(memberMap.values()));
    } catch (error) {
      console.error('Failed to load group members as users:', error);
      setUsers([]);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/expense/categories');
      if (response.data) {
        const formattedCategories = response.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon || 'tag',
        }));
        setCategories(formattedCategories);
        
        // Set default category if available
        if (formattedCategories.length > 0) {
          setFormData(prev => ({
            ...prev,
            categoryId: String(formattedCategories[0].id)
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadInitialData = async () => {
      try {
        await Promise.all([loadCategories(), loadGroups(), loadUsers()]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

  // Scan receipt image and autofill fields via backend parsing
  const scanAndAutofillReceipt = async () => {
    try {
      if (parsing) return;
      setParsing(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media permissions to scan receipts');
        setParsing(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setParsing(false);
        return;
      }

      const uri = result.assets[0].uri;
      setReceipt(uri);

      const form = new FormData();
      form.append('file', {
        uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as any);

      // Use transformRequest: [] to prevent axios from modifying FormData
      const response = await api.post('/api/v1/receipts/parse', form, {
        transformRequest: [],
      });

      const data = response?.data || {};
      const { merchant, amount, date, currency, categoryName } = data;

      // Map parsed fields into formData (only set if present)
      setFormData(prev => ({
        ...prev,
        merchant: merchant ?? prev.merchant,
        amount: typeof amount === 'number' ? String(amount) : (amount ?? prev.amount),
        occurredOn: date ?? prev.occurredOn,
        currency: currency ?? prev.currency,
      }));

      // Try to match category by name (case-insensitive)
      if (categoryName && categories && categories.length > 0) {
        const match = categories.find(c => c.name.toLowerCase() === String(categoryName).toLowerCase());
        if (match) {
          setFormData(prev => ({ ...prev, categoryId: String(match.id) }));
        }
      }

      Alert.alert('Scanned', 'We pre-filled some fields from the receipt. Please review and submit.');
    } catch (error: any) {
      console.error('Failed to parse receipt:', error);
      const msg = error?.response?.data?.message || 'Could not extract details from the receipt.';
      Alert.alert('Scan failed', msg);
    } finally {
      setParsing(false);
    }
  };
    
    if (isFocused) {
      loadInitialData();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isFocused, loadCategories, loadUsers]);

  // Reset form when screen is focused
  useEffect(() => {
    if (isFocused) {
      setFormData(prev => ({
        ...prev,
        amount: '',
        merchant: '',
        description: '',
        occurredOn: new Date().toISOString().split('T')[0],
        isGroupExpense: false,
        splitDetails: {},
      }));
      setReceipt(null);
      setSelectedUsers([]);
      setShowCustomCategory(false);
      setCustomCategory('');
    }
  }, [isFocused]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        occurredOn: selectedDate.toISOString().split('T')[0]
      }));
    }
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddCustomCategory = async () => {
    if (!customCategory.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const response = await api.post('/api/v1/expense/categories', {
        name: customCategory.trim(),
        icon: 'tag',
      });

      if (response.data) {
        setCategories(prev => [...prev, response.data]);
        setFormData(prev => ({
          ...prev,
          categoryId: String(response.data.id),
        }));
        setShowCustomCategory(false);
        setCustomCategory('');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      Alert.alert('Error', 'Failed to add custom category');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions to upload receipts');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceipt(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Scan receipt image and autofill fields via backend parsing
  const scanAndAutofillReceipt = async () => {
    try {
      if (parsing) return;
      setParsing(true);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media permissions to scan receipts');
        setParsing(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setParsing(false);
        return;
      }

      const uri = result.assets[0].uri;
      setReceipt(uri);

      const form = new FormData();
      form.append('file', {
        uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as any);

      // Use transformRequest: [] to prevent axios from modifying FormData
      const response = await api.post('/api/v1/receipts/parse', form, {
        transformRequest: [],
      });

      const data = response?.data || {};
      const { merchant, amount, date, currency, categoryName } = data;

      // Map parsed fields into formData (only set if present)
      setFormData(prev => ({
        ...prev,
        merchant: merchant ?? prev.merchant,
        amount: typeof amount === 'number' ? String(amount) : (amount ?? prev.amount),
        occurredOn: date ?? prev.occurredOn,
        currency: currency ?? prev.currency,
      }));

      // Try to match category by name (case-insensitive)
      if (categoryName && categories && categories.length > 0) {
        const match = categories.find(c => c.name.toLowerCase() === String(categoryName).toLowerCase());
        if (match) {
          setFormData(prev => ({ ...prev, categoryId: String(match.id) }));
        }
      }

      Alert.alert('Scanned', 'We pre-filled some fields from the receipt. Please review and submit.');
    } catch (error: any) {
      console.error('Failed to parse receipt:', error);
      const msg = error?.response?.data?.message || 'Could not extract details from the receipt.';
      Alert.alert('Scan failed', msg);
    } finally {
      setParsing(false);
    }
  };


  const handleSubmit = async () => {
    try {
      if (submitting) return;
      
      setSubmitting(true);

      // Validate required fields
      if (!formData.amount || !formData.merchant || !formData.categoryId) {
        Alert.alert('Error', 'Please fill in all required fields');
        setSubmitting(false);
        return;
      }

      // Check for duplicate bill number if provided (regardless of receipt)
      if (billNumber && billNumber.trim()) {
        try {
          const bills = await BillService.searchBills({
            billNumber: billNumber.trim(),
            companyId: isCompanyMode ? (activeCompanyId || 0) : undefined,
          });
          
          if (bills && bills.length > 0) {
            Alert.alert(
              'Bill Number Already Exists', 
              `Bill number "${billNumber.trim()}" already exists. Please use a different bill number.`,
              [{ text: 'OK' }]
            );
            setSubmitting(false);
            return;
          }
        } catch (error) {
          console.error('Error checking bill number:', error);
          // Continue with submission even if check fails
        }
      }

      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId, 10),
        reimbursable: isReimbursable,
        isGroupExpense,
        ...(isGroupExpense && {
          // For existing group: include groupId
          // For custom split: no groupId, just participants
          ...(groupExpenseType === 'existing' && selectedGroupId ? { groupId: selectedGroupId } : {}),
          splitType,
          participants: selectedUsers,
        }),
        receipt: receipt || undefined,
      };

      // If currency is not INR, fetch live FX and convert to INR before saving
      let finalData = { ...expenseData } as any;
      try {
        const curr = String(formData.currency || 'INR').toUpperCase();
        if (curr !== 'INR' && isFinite(finalData.amount) && finalData.amount > 0) {
          const fxResp = await fetch(`https://api.exchangerate.host/latest?base=${encodeURIComponent(curr)}&symbols=INR`);
          const fxJson = await fxResp.json();
          const rate = Number(fxJson?.rates?.INR);
          if (rate && isFinite(rate) && rate > 0) {
            const inrAmt = finalData.amount * rate;
            const prevNotes = String(finalData.description || finalData.notes || '');
            // Persist as INR; annotate original amount for transparency
            finalData.amount = Number(inrAmt.toFixed(2));
            finalData.currency = 'INR';
            finalData.notes = `${prevNotes}${prevNotes ? ' ' : ''}(orig: ${finalData.amount.toFixed ? expenseData.amount.toFixed(2) : expenseData.amount} ${curr} @ ${rate.toFixed(4)})`;
          }
        }
      } catch {
        // If FX fails, proceed without conversion
      }

      // Use ExpenseService to properly scope to company or user
      const scopeOpts = { fromCompany: isCompanyMode, companyId: activeCompanyId || undefined };
      const createdExpense = await ExpenseService.createExpense(finalData, scopeOpts);
      
      // Upload receipt and create bill if attached
      if (createdExpense && receipt) {
        try {
          console.log('[AddExpense] Uploading receipt for expense:', createdExpense.id);
          console.log('[AddExpense] Receipt URI:', receipt);
          
          // Create bill record with receipt
          const uploadData = {
            file: {
              uri: receipt,
              name: 'receipt.jpg',
              type: 'image/jpeg',
            },
            expenseId: createdExpense.id,
            billNumber: billNumber.trim() || undefined,
            merchant: formData.merchant || undefined,
            amount: parseFloat(formData.amount) || undefined,
            currency: formData.currency || undefined,
            billDate: formData.occurredOn || undefined,
            companyId: isCompanyMode ? (activeCompanyId || 0) : 0,
          };
          
          await BillService.uploadBill(uploadData);
          console.log('[AddExpense] Bill created successfully with receipt');
        } catch (receiptError: any) {
          console.error('[AddExpense] Failed to upload receipt:', receiptError);
          console.error('[AddExpense] Error details:', {
            message: receiptError.message,
            code: receiptError.code,
            status: receiptError.status,
          });
          
          // Check if it's a duplicate bill number error
          const errorMessage = receiptError.response?.data?.message || receiptError.message || '';
          if (errorMessage.toLowerCase().includes('bill number') && errorMessage.toLowerCase().includes('already exists')) {
            Alert.alert('Duplicate Bill Number', errorMessage);
          } else {
            // Don't fail the whole operation if receipt upload fails for other reasons
            Alert.alert('Warning', 'Expense created but receipt upload failed. You can add it later from expense details.');
          }
        }
      }
      
      // Request reimbursement if checkbox is checked and in company mode
      if (createdExpense && isReimbursable && isCompanyMode && activeCompanyId) {
        try {
          await ReimbursementService.requestReimbursement(createdExpense.id);
          Alert.alert('Success', 'Expense added and reimbursement requested successfully', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        } catch (reimbursementError: any) {
          console.error('Failed to request reimbursement:', reimbursementError);
          Alert.alert('Success', 'Expense added successfully, but reimbursement request failed. You can request it later.', [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        }
      } else if (createdExpense) {
        Alert.alert('Success', 'Expense added successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error submitting expense:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading categories and users...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <Text style={styles.title}>Add New Expense</Text>
          
          {/* Amount */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Amount *</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={[styles.input, styles.amountInput]}
                value={formData.amount}
                onChangeText={(text) => handleInputChange('amount', text.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={!submitting}
              />
              <View style={styles.currencyPickerContainer}>
                <Picker
                  selectedValue={formData.currency === 'CUSTOM' || !CURRENCIES.find(c => c.code === formData.currency) ? 'CUSTOM' : formData.currency}
                  onValueChange={(value) => {
                    if (value === 'CUSTOM') {
                      setShowCustomCurrency(true);
                      setCustomCurrency(formData.currency !== 'CUSTOM' && !CURRENCIES.find(c => c.code === formData.currency) ? formData.currency : '');
                    } else {
                      setShowCustomCurrency(false);
                      handleInputChange('currency', value);
                    }
                  }}
                  style={styles.currencyPicker}
                  dropdownIconColor="#666"
                  enabled={!submitting}
                >
                  {CURRENCIES.map((currency) => (
                    <Picker.Item
                      key={currency.code}
                      label={currency.code === 'CUSTOM' ? 'Custom...' : currency.code}
                      value={currency.code}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            {showCustomCurrency && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.helperText}>Enter custom currency code (e.g., BTC, ETH, XAU)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Currency code"
                  value={customCurrency}
                  onChangeText={(text) => {
                    const upper = text.toUpperCase();
                    setCustomCurrency(upper);
                    handleInputChange('currency', upper);
                  }}
                  autoCapitalize="characters"
                  maxLength={10}
                  editable={!submitting}
                />
              </View>
            )}
          </View>

          {/* Merchant */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Merchant *</Text>
            <TextInput
              style={styles.input}
              value={formData.merchant}
              onChangeText={(text) => handleInputChange('merchant', text)}
              placeholder="e.g., Amazon, Starbucks"
              editable={!submitting}
            />
          </View>


          {/* Date Picker */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
              disabled={submitting}
            >
              <Text>{format(new Date(formData.occurredOn), 'MMM dd, yyyy')}</Text>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(formData.occurredOn)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Category */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity 
                onPress={() => setShowCustomCategory(!showCustomCategory)}
                disabled={submitting}
              >
                <Text style={styles.linkText}>
                  {showCustomCategory ? 'Select from list' : 'Add custom'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {showCustomCategory ? (
              <View style={styles.customCategoryContainer}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Enter category name"
                  editable={!submitting}
                />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddCustomCategory}
                  disabled={submitting}
                >
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.categoryId}
                  onValueChange={(value) => handleInputChange('categoryId', value)}
                  style={styles.picker}
                  dropdownIconColor="#666"
                  enabled={!submitting}
                >
                  {categories.map((category) => (
                    <Picker.Item
                      key={category.id}
                      label={category.name}
                      value={String(category.id)}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Group Expense Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.label}>Group Expense</Text>
            <TouchableOpacity
              style={[styles.toggle, isGroupExpense && styles.toggleActive]}
              onPress={() => {
                const newValue = !isGroupExpense;
                setIsGroupExpense(newValue);
                if (!newValue) {
                  // Reset group-related state when toggling off
                  setSelectedGroupId(null);
                  setSelectedUsers([]);
                  setGroupExpenseType('existing');
                }
              }}
              disabled={submitting}
            >
              <View style={[styles.toggleCircle, isGroupExpense && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>

          {/* Group Type Selection - Existing Group or Custom Users */}
          {isGroupExpense && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Group Type</Text>
              <View style={styles.groupTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.groupTypeButton,
                    groupExpenseType === 'existing' && styles.groupTypeButtonActive
                  ]}
                  onPress={() => {
                    setGroupExpenseType('existing');
                    setSelectedUsers([]);
                  }}
                  disabled={submitting}
                >
                  <MaterialIcons 
                    name="groups" 
                    size={20} 
                    color={groupExpenseType === 'existing' ? '#4F46E5' : '#64748b'} 
                  />
                  <Text style={[
                    styles.groupTypeButtonText,
                    groupExpenseType === 'existing' && styles.groupTypeButtonTextActive
                  ]}>
                    Existing Group
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.groupTypeButton,
                    groupExpenseType === 'custom' && styles.groupTypeButtonActive
                  ]}
                  onPress={() => {
                    setGroupExpenseType('custom');
                    setSelectedGroupId(null);
                    // Load all users for custom split
                    loadUsers();
                  }}
                  disabled={submitting}
                >
                  <MaterialIcons 
                    name="person-add" 
                    size={20} 
                    color={groupExpenseType === 'custom' ? '#4F46E5' : '#64748b'} 
                  />
                  <Text style={[
                    styles.groupTypeButtonText,
                    groupExpenseType === 'custom' && styles.groupTypeButtonTextActive
                  ]}>
                    Custom Split
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                {groupExpenseType === 'existing' 
                  ? 'Split with members of an existing group'
                  : 'Split with any users (no group required)'}
              </Text>
            </View>
          )}

          {/* Group Selection - Only for Existing Group Type */}
          {isGroupExpense && groupExpenseType === 'existing' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Group *</Text>
              <TouchableOpacity
                style={styles.userSelectButton}
                onPress={() => setShowGroupPicker(true)}
                disabled={submitting || groups.length === 0}
              >
                <Text style={[
                  styles.userSelectText,
                  !selectedGroupId && styles.placeholderText
                ]}>
                  {selectedGroupId 
                    ? groups.find(g => g.id === selectedGroupId)?.name || 'Select a group'
                    : 'Select a group'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>

              {/* Group Picker Modal */}
              <Modal
                visible={showGroupPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowGroupPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Group</Text>
                      <TouchableOpacity onPress={() => setShowGroupPicker(false)}>
                        <MaterialIcons name="close" size={24} color="#333" />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={groups}
                      keyExtractor={(item) => String(item.id)}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.userItem}
                          onPress={() => {
                            setSelectedGroupId(item.id);
                            setShowGroupPicker(false);
                            // Load users from selected group
                            loadUsers(item.id);
                            // Reset selected users when changing group
                            setSelectedUsers([]);
                          }}
                        >
                          <View style={[
                            styles.checkbox,
                            selectedGroupId === item.id && styles.checkboxSelected
                          ]}>
                            {selectedGroupId === item.id && (
                              <MaterialIcons name="check" size={16} color="#fff" />
                            )}
                          </View>
                          <Text style={styles.userName}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </View>
              </Modal>
            </View>
          )}

          {/* Group Members Selection - Show for both existing group (after selection) and custom split */}
          {isGroupExpense && ((groupExpenseType === 'existing' && selectedGroupId) || groupExpenseType === 'custom') && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Split with</Text>
              {!users || users.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.loadingText}>Loading users...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.userSelectButton}
                  onPress={() => setShowUserPicker(true)}
                  disabled={submitting || users.length === 0}
                >
                  <Text style={[
                    styles.userSelectText,
                    users.length === 0 && styles.disabledText
                  ]}>
                    {selectedUsers.length > 0 
                      ? `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected`
                      : users.length > 0 
                        ? 'Select users to split with' 
                        : 'No users available'}
                  </Text>
                  {users.length > 0 && (
                    <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                  )}
                </TouchableOpacity>
              )}

              <Modal
                visible={showUserPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowUserPicker(false)}
              >
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Users</Text>
                    <ScrollView style={styles.userList}>
                      {users.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={styles.userItem}
                          onPress={() => toggleUserSelection(user.id)}
                        >
                          <View style={[
                            styles.checkbox,
                            selectedUsers.includes(user.id) && styles.checkboxSelected
                          ]}>
                            {selectedUsers.includes(user.id) && (
                              <MaterialIcons name="check" size={16} color="#fff" />
                            )}
                          </View>
                          <Text style={styles.userName}>{user.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() => setShowUserPicker(false)}
                    >
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {isGroupExpense && selectedUsers.length > 0 && (
                <View style={styles.splitOptions}>
                  <Text style={styles.label}>Split Type</Text>
                  <View style={styles.splitTypeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.splitTypeButton,
                        splitType === 'equal' && styles.splitTypeButtonActive
                      ]}
                      onPress={() => setSplitType('equal')}
                      disabled={submitting}
                    >
                      <Text style={[
                        styles.splitTypeButtonText,
                        splitType === 'equal' && styles.splitTypeButtonTextActive
                      ]}>
                        Equal
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.splitTypeButton,
                        splitType === 'percentage' && styles.splitTypeButtonActive
                      ]}
                      onPress={() => setSplitType('percentage')}
                      disabled={submitting}
                    >
                      <Text style={[
                        styles.splitTypeButtonText,
                        splitType === 'percentage' && styles.splitTypeButtonTextActive
                      ]}>
                        Percentage
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.splitTypeButton,
                        splitType === 'amount' && styles.splitTypeButtonActive
                      ]}
                      onPress={() => setSplitType('amount')}
                      disabled={submitting}
                    >
                      <Text style={[
                        styles.splitTypeButtonText,
                        splitType === 'amount' && styles.splitTypeButtonTextActive
                      ]}>
                        Custom
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Add a note about this expense"
              multiline
              numberOfLines={3}
              editable={!submitting}
            />
          </View>

          {/* Reimbursement Checkbox - Only show in company mode */}
          {isCompanyMode && activeCompanyId && (
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
                onPress={() => setIsReimbursable(!isReimbursable)}
                disabled={submitting}
              >
                <MaterialIcons
                  name={isReimbursable ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={isReimbursable ? '#6366F1' : '#9CA3AF'}
                />
                <Text style={[styles.label, { marginLeft: 12, marginTop: 0, marginBottom: 0 }]}>
                  Request Reimbursement
                </Text>
              </TouchableOpacity>
              {isReimbursable && (
                <Text style={[styles.helperText, { marginTop: 4 }]}>
                  This expense will be submitted for reimbursement approval
                </Text>
              )}
            </View>
          )}

          {/* Bill Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bill Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter bill number"
              value={billNumber}
              onChangeText={setBillNumber}
              editable={!submitting}
            />
          </View>

          {/* Receipt */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Receipt (Optional)</Text>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={pickImage}
              disabled={submitting}
            >
              <MaterialIcons 
                name="receipt" 
                size={24} 
                color={receipt ? '#4CAF50' : '#666'} 
              />
              <Text style={[
                styles.uploadButtonText,
                receipt && styles.uploadButtonTextSuccess
              ]}>
                {receipt ? 'Receipt attached' : 'Attach receipt'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadButton, styles.scanButton]}
              onPress={scanAndAutofillReceipt}
              disabled={submitting || parsing}
            >
              {parsing ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <MaterialIcons name="document-scanner" size={24} color="#666" />
              )}
              <Text style={styles.uploadButtonText}>
                {parsing ? 'Scanning…' : 'Scan & Autofill'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Receipts with bill numbers will appear in Bills screen
            </Text>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  currencyPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  currencyPicker: {
    height: 46,
    width: 100,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 46,
    backgroundColor: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  customCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  userSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userSelectText: {
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  userList: {
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  userName: {
    fontSize: 16,
    color: '#333',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  splitOptions: {
    marginTop: 16,
  },
  splitTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  splitTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  splitTypeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  splitTypeButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  splitTypeButtonTextActive: {
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  scanButton: {
    marginTop: 8,
  },
  uploadButtonText: {
    marginLeft: 12,
    color: '#666',
  },
  uploadButtonTextSuccess: {
    color: '#4CAF50',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledText: {
    color: '#999',
    fontStyle: 'italic',
  },
  placeholderText: {
    color: '#999',
  },
  checkboxContainer: {
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  groupTypeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  groupTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 8,
  },
  groupTypeButtonActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  groupTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  groupTypeButtonTextActive: {
    color: '#4F46E5',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
