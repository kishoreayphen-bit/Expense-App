import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import DateTimePicker from '@react-native-community/datetimepicker';

// Define the navigation params type
type RootStackParamList = {
  ExpenseDetail: { id: number; refresh?: boolean };
  EditExpense: { expense: Expense };
};

interface Category {
  id: number;
  name: string;
  icon?: string;
  color?: string;
}

interface Expense {
  id: number;
  amount: number;
  currency: string;
  baseAmount: number;
  baseCurrency: string;
  occurredOn: string;
  categoryId: number;
  categoryName: string;
  description: string;
  notes: string | null;
  merchant: string;
  reimbursable: boolean;
  receiptUrl?: string;
  status?: string;
  tags?: string[];
  paymentMethod?: string;
}

type EditExpenseScreenRouteProp = RouteProp<{ params: { expense: Expense } }, 'params'>;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];
const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Digital Wallet'];

export default function EditExpenseScreen() {
  const route = useRoute<EditExpenseScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { expense: initialExpense } = route.params;
  
  const [expense, setExpense] = useState<Expense>(initialExpense);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Replace with your actual API call
        // const response = await api.get('/categories');
        // setCategories(response.data);
        
        // Mock data for now
        setCategories([
          { id: 1, name: 'Food & Drinks', icon: 'restaurant' },
          { id: 2, name: 'Shopping', icon: 'shopping-bag' },
          { id: 3, name: 'Transportation', icon: 'car' },
          { id: 4, name: 'Housing', icon: 'home' },
          { id: 5, name: 'Entertainment', icon: 'film' },
        ]);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        Alert.alert('Error', 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      // Backend expects LocalDate for occurredOn (YYYY-MM-DD)
      const occurredOnYMD = new Date(expense.occurredOn)
        .toISOString()
        .slice(0, 10);

      // Build partial update payload. Only include fields that exist on ExpenseUpdateRequest
      const payload: any = {
        amount: expense.amount,
        currency: expense.currency,
        occurredOn: occurredOnYMD,
        categoryId: expense.categoryId,
        notes: expense.notes ?? undefined,
        merchant: expense.merchant,
        reimbursable: expense.reimbursable,
      };

      // Remove undefined to avoid overwriting with nulls server-side
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      const url = `/api/v1/expenses/${expense.id}`;
      console.log('[API] PATCH', url, payload);
      await api.patch(url, payload);

      Alert.alert('Success', 'Expense updated successfully');
      navigation.navigate('ExpenseDetail', { id: expense.id, refresh: true });
    } catch (error: any) {
      console.error('Failed to update expense:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      const msg = error?.response?.data?.message || `Failed to update expense (${error?.response?.status || 'network'})`;
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof Expense, value: any) => {
    setExpense(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleChange('occurredOn', selectedDate.toISOString());
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        {/* Amount Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={[styles.input, styles.currencyInput]}
              value={expense.amount.toString()}
              onChangeText={(value) => handleChange('amount', parseFloat(value) || 0)}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <View style={styles.currencySelector}>
              <Text style={styles.currencyText}>{expense.currency}</Text>
            </View>
          </View>
        </View>

        {/* Merchant Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Merchant</Text>
          <TextInput
            style={styles.input}
            value={expense.merchant}
            onChangeText={(value) => handleChange('merchant', value)}
            placeholder="e.g. Amazon, Starbucks"
          />
        </View>

        {/* Category Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => {
              // Implement category picker modal
            }}
          >
            <Text style={styles.pickerText}>
              {expense.categoryName || 'Select a category'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.pickerText}>
              {formatDate(expense.occurredOn)}
            </Text>
            <Ionicons name="calendar" size={20} color="#666" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(expense.occurredOn)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Description */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={expense.description}
            onChangeText={(value) => handleChange('description', value)}
            placeholder="Add a description"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={expense.notes || ''}
            onChangeText={(value) => handleChange('notes', value)}
            placeholder="Add any additional notes"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Reimbursable Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Reimbursable</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              expense.reimbursable ? styles.toggleActive : styles.toggleInactive
            ]}
            onPress={() => handleChange('reimbursable', !expense.reimbursable)}
          >
            <View 
              style={[
                styles.toggleCircle,
                expense.reimbursable ? styles.toggleCircleActive : {}
              ]} 
            />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    padding: 16,
    paddingBottom: 100,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },

  // Form Elements
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },

  // Amount Input
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    padding: 12,
    paddingLeft: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  currencySymbol: {
    position: 'absolute',
    left: 12,
    fontSize: 16,
    color: '#666',
    zIndex: 1,
  },
  currencyInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  currencySelector: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    height: 48,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  currencyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  // Category Picker
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },

  // Date Picker
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleInactive: {
    backgroundColor: '#f44336',
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Save Button
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    backgroundColor: '#a0c4ff',
  }
});
