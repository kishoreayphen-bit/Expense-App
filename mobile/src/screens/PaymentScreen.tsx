import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { markPaid } from '../state/localSettlements';
import * as SecureStore from 'expo-secure-store';

type RouteParams = {
  splitShareId: number;
  amount: number;
  currency: string;
  recipientName: string;
  expenseTitle: string;
  groupId?: number;
  splitId?: number | string;
  userId?: number;
};

export default function PaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params as RouteParams;

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  // For demo purposes - in production, you'd use @stripe/stripe-react-native
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [rememberCard, setRememberCard] = useState(false);

  useEffect(() => {
    createPaymentIntent();
    loadSavedCard();
  }, []);

  const loadSavedCard = async () => {
    try {
      const savedCardNumber = await SecureStore.getItemAsync('saved_card_number');
      const savedExpiry = await SecureStore.getItemAsync('saved_card_expiry');
      if (savedCardNumber) setCardNumber(savedCardNumber);
      if (savedExpiry) setExpiryDate(savedExpiry);
      if (savedCardNumber || savedExpiry) setRememberCard(true);
    } catch (error) {
      console.log('No saved card found');
    }
  };

  const createPaymentIntent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/v1/payments/create-intent', {
        splitShareId: params.splitShareId,
        amount: params.amount,
        currency: params.currency || 'INR',
      });

      setClientSecret(response.data.clientSecret);
      setPaymentId(response.data.paymentId);
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      // Don't show alert, just set error state - allow user to continue
      setError('Note: Using demo mode. Stripe keys not configured on backend.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    // Validate card inputs
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 15) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return;
    }
    if (!expiryDate || expiryDate.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter expiry date (MM/YY)');
      return;
    }
    if (!cvc || cvc.length < 3) {
      Alert.alert('Invalid CVC', 'Please enter a valid CVC');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production: const { paymentIntent } = await confirmPayment(clientSecret, {...});
      
      // Save card if remember is checked
      if (rememberCard) {
        await SecureStore.setItemAsync('saved_card_number', cardNumber);
        await SecureStore.setItemAsync('saved_card_expiry', expiryDate);
      } else {
        await SecureStore.deleteItemAsync('saved_card_number');
        await SecureStore.deleteItemAsync('saved_card_expiry');
      }
      
      setPaymentSuccess(true);
      
      // No alert - success screen will remain until user clicks Done
    } catch (err: any) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
      Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      JPY: '¥',
    };
    return symbols[currency] || currency;
  };

  // Format card number with spaces
  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substr(0, 19); // Max 16 digits + 3 spaces
  };

  // Format expiry date
  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substr(0, 2) + '/' + cleaned.substr(2, 2);
    }
    return cleaned;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Initializing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDone = async () => {
    // Mark payment as paid in local storage
    if (params.groupId && params.splitId && params.userId) {
      try {
        await markPaid(params.groupId, params.splitId, params.userId);
        console.log('[Payment] Marked as paid:', { groupId: params.groupId, splitId: params.splitId, userId: params.userId });
      } catch (error) {
        console.error('[Payment] Error marking as paid:', error);
      }
    }
    
    // Navigate back to split detail screen
    navigation.goBack();
  };

  if (paymentSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <MaterialIcons name="check-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successAmount}>
            {getCurrencySymbol(params.currency)}{params.amount.toFixed(2)}
          </Text>
          <Text style={styles.successMessage}>
            Your payment to {params.recipientName} has been processed successfully.
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="receipt-long" size={24} color="#4F46E5" />
            <Text style={styles.summaryTitle}>Payment Summary</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={styles.summaryValue}>{params.expenseTitle}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pay to</Text>
            <Text style={styles.summaryValue}>{params.recipientName}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              {getCurrencySymbol(params.currency)}{params.amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment Method Card */}
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          {/* Stripe Logo */}
          <View style={styles.stripeContainer}>
            <MaterialIcons name="credit-card" size={20} color="#635BFF" />
            <Text style={styles.stripeText}>Powered by Stripe</Text>
            <View style={styles.secureBadge}>
              <MaterialIcons name="lock" size={12} color="#10B981" />
              <Text style={styles.secureText}>Secure</Text>
            </View>
          </View>

          {/* Demo Payment Info */}
          <View style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <MaterialIcons name="info" size={20} color="#3B82F6" />
              <Text style={styles.demoTitle}>Test Mode</Text>
            </View>
            <Text style={styles.demoText}>
              Use test card: 4242 4242 4242 4242
            </Text>
            <Text style={styles.demoText}>
              Expiry: Any future date • CVC: Any 3 digits
            </Text>
          </View>

          {/* Card Input Fields */}
          <View style={styles.cardInputContainer}>
            <View style={styles.cardInputWrapper}>
              <MaterialIcons name="credit-card" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.cardInputField}
                placeholder="Card Number"
                placeholderTextColor="#9CA3AF"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
                autoComplete="cc-number"
              />
            </View>
            <View style={styles.cardDetailsRow}>
              <View style={[styles.cardInputWrapper, { flex: 1, marginRight: 8 }]}>
                <TextInput
                  style={styles.cardInputField}
                  placeholder="MM/YY"
                  placeholderTextColor="#9CA3AF"
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  keyboardType="numeric"
                  maxLength={5}
                  autoComplete="cc-exp"
                />
              </View>
              <View style={[styles.cardInputWrapper, { flex: 1 }]}>
                <TextInput
                  style={styles.cardInputField}
                  placeholder="CVC"
                  placeholderTextColor="#9CA3AF"
                  value={cvc}
                  onChangeText={(text) => setCvc(text.replace(/\D/g, '').substr(0, 4))}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  autoComplete="cc-csc"
                />
              </View>
            </View>
          </View>
          
          {/* Remember Card Checkbox */}
          <TouchableOpacity 
            style={styles.rememberCardRow}
            onPress={() => setRememberCard(!rememberCard)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={rememberCard ? 'check-box' : 'check-box-outline-blank'} 
              size={24} 
              color={rememberCard ? '#4F46E5' : '#9CA3AF'} 
            />
            <Text style={styles.rememberCardText}>Remember this card for future payments</Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <MaterialIcons name="verified-user" size={16} color="#6B7280" />
          <Text style={styles.securityText}>
            Your payment information is encrypted and secure
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="lock" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>
                Pay {getCurrencySymbol(params.currency)}{params.amount.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  stripeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stripeText: {
    fontSize: 14,
    color: '#635BFF',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secureText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginLeft: 4,
  },
  demoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 6,
  },
  demoText: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },
  cardInputContainer: {
    marginTop: 8,
  },
  cardInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  cardInputField: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    padding: 0,
  },
  cardInputText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginLeft: 12,
  },
  cardDetailsRow: {
    flexDirection: 'row',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  securityText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  payButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  successAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rememberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  rememberCardText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
});
