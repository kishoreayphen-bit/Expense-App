import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useNavigation } from '@react-navigation/native';
import { createTransaction, Transaction } from '../api/transactionService';
import { useCompany } from '../context/CompanyContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { api } from '../api/client';

type AddTransactionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Groceries',
  'Health',
  'Travel',
  'Education',
  'Other Expense'
];

// This screen handles INCOME and TRANSFER (EXPENSE is handled in its own screen)

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  {code:'CNY',symbol:'¥',name:'Chinese Yuan'}
];

const AddTransactionScreen = () => {
  const navigation = useNavigation<AddTransactionScreenNavigationProp>();
  const { activeCompanyId } = useCompany();
  const isCompanyMode = !!activeCompanyId && Number(activeCompanyId) > 0;
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  // Income categories for INCOME type
  const INCOME_CATEGORIES = [
    'Salary',
    'Bonus',
    'Freelance',
    'Investments',
    'Gift',
    'Refund',
    'Rental Income',
    'Other Income'
  ];
  // Accounts for TRANSFER type
  const ACCOUNTS = [
    'Cash',
    'Bank Account',
    'Credit Card',
    'Digital Wallet',
    'Savings',
    'Investment'
  ];

  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  // Only INCOME or TRANSFER in this screen
  const [type, setType] = useState<'INCOME' | 'TRANSFER'>('INCOME');
  const [fromAccount, setFromAccount] = useState(ACCOUNTS[0]);
  const [toAccount, setToAccount] = useState(ACCOUNTS[1]);

  const renderCurrencyPicker = () => (
    <View style={[styles.pickerContainer, styles.currencyPicker]}>
      <Picker
        selectedValue={currency.code}
        onValueChange={(itemValue) => {
          const selected = CURRENCIES.find(c => c.code === itemValue) || CURRENCIES[0];
          setCurrency(selected);
        }}
        style={styles.picker}
        dropdownIconColor="#666"
      >
        {CURRENCIES.map((curr) => (
          <Picker.Item 
            key={curr.code} 
            label={`${curr.code} - ${curr.name}`} 
            value={curr.code} 
          />
        ))}
      </Picker>
    </View>
  );

  // Scan receipt image and autofill fields via backend parsing
  const scanAndAutofill = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media permissions to scan receipts');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      const form = new FormData();
      form.append('file', {
        uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await api.post('/api/v1/receipts/parse', form);

      const data = response?.data || {};
      const nextDesc = data.merchant || data.vendor || description || 'Scanned receipt';
      const nextAmt = (typeof data.amount === 'number' ? data.amount : Number(data.amount || 0)) || Number(amount || 0) || 0;
      const nextCurr = data.currency || currency.code;
      const nextDateIso = data.date || date.toISOString();

      setDescription(String(nextDesc));
      if (!isNaN(nextAmt) && nextAmt > 0) setAmount(String(nextAmt));
      setCurrency(CURRENCIES.find(c => c.code === nextCurr) || currency);
      const parsed = new Date(nextDateIso);
      if (!isNaN(parsed.getTime())) setDate(parsed);

      Alert.alert('Scanned', 'We pre-filled some fields from the receipt. Please review and submit.');
    } catch (error: any) {
      console.error('Failed to parse receipt:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      const msg = error?.response?.data?.message || `Scan failed (${error?.response?.status || 'network'})`;
      Alert.alert('Scan failed', msg);
    }
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    try {
      setIsLoading(true);
      
      const baseData = {
        description: description.trim(),
        amount: Math.abs(Number(amount)),
        currency: currency.code,
        type,
        transactionDate: date.toISOString(),
        notes: notes.trim()
      };

      let transactionData: any = baseData;
      if (type === 'INCOME') {
        // Ensure a category is present for INCOME
        transactionData = { ...baseData, category };
      } else {
        // TRANSFER
        if (fromAccount === toAccount) {
          Alert.alert('Error', 'Source and destination accounts must be different');
          return;
        }
        // Backend requires non-null category; provide a derived label
        const transferCategory = `Transfer: ${fromAccount} -> ${toAccount}`;
        transactionData = { ...baseData, category: transferCategory, fromAccount, toAccount };
      }

      console.log('Saving transaction data:', transactionData);
      const response = await createTransaction(transactionData, {
        fromCompany: isCompanyMode,
        companyId: isCompanyMode ? Number(activeCompanyId) : undefined,
      });
      console.log('Transaction saved successfully:', response);
      
      // Navigate back to previous screen
      navigation.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
      let errorMessage = 'Failed to save transaction. Please try again.';
      
      // Provide more specific error messages
      if (error.response) {
        // Server responded with a status code outside the 2xx range
        errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
      } else if (error.request) {
        // Request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      } else if (error.message) {
        // Something happened in setting up the request
        errorMessage = `Request error: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCategoryPicker = () => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        Income Category
      </Text>
      <View style={[styles.pickerContainer, styles.input]}>
        <Picker
          selectedValue={category}
          onValueChange={setCategory}
          style={styles.picker}
          dropdownIconColor="#666"
        >
          {INCOME_CATEGORIES.map((cat) => (
            <Picker.Item key={cat} label={cat} value={cat} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const renderTransferForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.label}>From Account</Text>
        <View style={[styles.pickerContainer, styles.input]}>
          <Picker
            selectedValue={fromAccount}
            onValueChange={setFromAccount}
            style={styles.picker}
            dropdownIconColor="#666"
          >
            {ACCOUNTS.map((account) => (
              <Picker.Item key={`from-${account}`} label={account} value={account} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>To Account</Text>
        <View style={[styles.pickerContainer, styles.input]}>
          <Picker
            selectedValue={toAccount}
            onValueChange={setToAccount}
            style={styles.picker}
            dropdownIconColor="#666"
          >
            {ACCOUNTS.filter(acc => acc !== fromAccount).map((account) => (
              <Picker.Item key={`to-${account}`} label={account} value={account} />
            ))}
          </Picker>
        </View>
      </View>
    </>
  );

  const renderTypeButton = (btnType: 'INCOME' | 'TRANSFER', label: string) => (
    <TouchableOpacity
      style={[styles.typeButton, type === btnType && styles.typeButtonActive]}
      onPress={() => {
        setType(btnType);
      }}
    >
      <Text style={[styles.typeButtonText, type === btnType && styles.typeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.typeContainer}>
        {renderTypeButton('INCOME', 'Income')}
        {renderTypeButton('TRANSFER', 'Transfer')}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{currency.symbol}</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>
          {renderCurrencyPicker()}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          placeholderTextColor="#999"
        />
        <View style={styles.scanRow}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={scanAndAutofill}
          >
            <MaterialIcons name="document-scanner" size={18} color="#fff" />
            <Text style={styles.scanButtonText}>Scan & autofill</Text>
          </TouchableOpacity>
        </View>
      </View>

      {type === 'INCOME' ? renderCategoryPicker() : renderTransferForm()}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity 
          style={[styles.input, styles.dateInput]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { minHeight: 80 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any additional notes"
          placeholderTextColor="#999"
          multiline
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Transaction</Text>
        )}
      </TouchableOpacity>
      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={()=>setShowScanner(false)}>
        <View style={{ flex:1, backgroundColor:'#000' }}>
          {permission?.granted ? (
            <CameraView style={{ flex: 1 }} facing="back" onCameraReady={()=>setCameraReady(true)}>
              <View style={styles.cameraOverlay}>
                <TouchableOpacity style={styles.closeCamBtn} onPress={()=>setShowScanner(false)}>
                  <MaterialIcons name="close" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={async ()=>{
                    setShowScanner(false);
                    if (!description) setDescription('Scanned receipt');
                    if (!amount) setAmount('0.00');
                  }}
                >
                  <MaterialIcons name="camera" size={26} color="#fff" />
                  <Text style={{ color:'#fff', fontWeight:'700', marginLeft:8 }}>Capture</Text>
                </TouchableOpacity>
                {!cameraReady && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color:'#fff', textAlign:'center', marginBottom:8 }}>If the camera does not appear, use system camera.</Text>
                    <TouchableOpacity
                      style={[styles.captureBtn, { alignSelf:'center' }]}
                      onPress={async ()=>{
                        try {
                          const perm = await ImagePicker.requestCameraPermissionsAsync();
                          if (!perm.granted) {
                            Alert.alert('Permission needed','Please enable camera permission.');
                            return;
                          }
                          const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.6 });
                          setShowScanner(false);
                          if (!result.canceled) {
                            if (!description) setDescription('Scanned receipt');
                            if (!amount) setAmount('0.00');
                          }
                        } catch (e) {
                          Alert.alert('Camera error','Failed to launch system camera.');
                        }
                      }}
                    >
                      <Text style={{ color:'#fff', fontWeight:'700' }}>Use system camera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </CameraView>
          ) : (
            <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#000' }}>
              <Text style={{ color:'#fff', marginBottom:16 }}>Camera permission is required.</Text>
              <TouchableOpacity
                style={styles.captureBtn}
                onPress={async ()=>{
                  const res = await requestPermission();
                  if (res.granted) return; // will re-render and show camera
                  if (res.canAskAgain === false) Linking.openSettings?.();
                }}
              >
                <Text style={{ color:'#fff', fontWeight:'700' }}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    elevation: 4,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    margin: 2,
  },
  typeButtonActive: {
    backgroundColor: '#4a90e2',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButtonText: {
    color: '#7d8b9b',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    paddingVertical: 12,
    color: '#2d3748',
    fontWeight: '600',
    paddingLeft: 8,
  },
  currencySymbol: {
    fontSize: 22,
    color: '#4a90e2',
    marginRight: 4,
    fontWeight: '700',
    opacity: 0.9,
  },
  picker: {
    width: '100%',
    marginLeft: -8,
  },
  dateInput: {
    padding: 16,
    justifyContent: 'center',
    height: 56,
  },
  dateText: {
    color: '#2d3748',
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    marginBottom: 8,
    color: '#4a5568',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginTop: 4,
    backgroundColor: '#fff',
    color: '#2d3748',
    fontWeight: '500',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  currencyPicker: {
    width: 140,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  saveButton: {
    backgroundColor: '#4a90e2',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 32,
    elevation: 4,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1 }],
  },
  saveButtonDisabled: {
    backgroundColor: '#a0c4ff',
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scanRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  closeCamBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 999,
  },
});

export default AddTransactionScreen;
