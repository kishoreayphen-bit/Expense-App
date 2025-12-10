import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo, 
  forwardRef 
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  Share,
  Linking,
  SafeAreaView,
  TouchableWithoutFeedback,
  Modal,
  Pressable,
  StatusBar,
  ViewStyle,
  Animated,
  GestureResponderEvent
} from 'react-native';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AnimatedLottieView from 'lottie-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

type RootStackParamList = {
  EditExpense: { expense: Expense };
  ReceiptsList: { expenseId: number };
  ReceiptViewer: { uri: string; title: string; subtitle: string };
};

import { 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons, 
  FontAwesome5,
  AntDesign,
  Feather
} from '@expo/vector-icons';
import { format } from 'date-fns';
import { parseISO } from 'date-fns/fp';
import { api } from '../api/client';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';

interface ScreenDimensions {
  width: number;
  height: number;
}

interface ImagePosition {
  x: number;
  y: number;
}

const SCREEN_DIMENSIONS = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height
};

const CARD_ELEVATION = 3;
const CARD_BORDER_RADIUS = 16;
const HEADER_MAX_HEIGHT = 240;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

type ExpenseDetailScreenRouteProp = RouteProp<{ params: { id: number } }, 'params'>;

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
};

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeableOpen: (direction: 'left' | 'right', swipeable: Swipeable) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SwipeableRow = forwardRef<Swipeable, SwipeableRowProps>(({ children, onSwipeableOpen, onEdit, onDelete }, ref) => {
  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeableRightActions}>
        <Animated.View style={[styles.swipeableAction, { transform: [{ scale }] }]}>
          <TouchableOpacity onPress={onEdit} style={[styles.swipeableButton, styles.editButton]}>
            <Ionicons name="pencil" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[styles.swipeableAction, { transform: [{ scale }] }]}>
          <TouchableOpacity onPress={onDelete} style={[styles.swipeableButton, styles.deleteButton]}>
            <Ionicons name="trash" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableRightOpen={(direction) => onSwipeableOpen(direction, ref as any)}
    >
      {children}
    </Swipeable>
  );
});

SwipeableRow.displayName = 'SwipeableRow';

// Add styles for swipeable actions
const swipeableStyles = StyleSheet.create({
  swipeableRightActions: {
    flexDirection: 'row',
    width: 160,
  },
  swipeableAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeableButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
});

// Merge with existing styles
const styles = StyleSheet.create({
  ...swipeableStyles,
  ({ children, onSwipeableOpen, onEdit, onDelete }, ref) => {
    const renderRightActions = (
      progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>
    ) => {
      const scale = dragX.interpolate({
        inputRange: [-100, 0],
        outputRange: [1, 0.8],
        extrapolate: 'clamp',
      });

      return (
        <View style={styles.swipeActionsContainer}>
          <TouchableOpacity
            style={[styles.swipeAction, styles.swipeEditAction]}
            onPress={() => {
              (ref as React.RefObject<Swipeable>)?.current?.close();
              onEdit();
            }}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name="pencil" size={24} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeAction, styles.swipeDeleteAction]}
            onPress={() => {
              (ref as React.RefObject<Swipeable>)?.current?.close();
              onDelete();
            }}
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name="trash" size={24} color="#fff" />
            </Animated.View>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <Swipeable
        ref={ref}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => onSwipeableOpen(direction, (ref as React.RefObject<Swipeable>).current!)}
        rightThreshold={40}
      >
        {children}
      </Swipeable>
    );
  }
);

SwipeableRow.displayName = 'SwipeableRow';

export default function ExpenseDetailScreen() {
  const route = useRoute<ExpenseDetailScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  console.log('Route params:', route.params);
  const { id } = route.params;
  console.log('Expense ID from params:', id);
  const swipeableRef = useRef<Swipeable>(null);
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ScreenDimensions>({ width: 0, height: 0 });
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const imagePosition = useRef<ImagePosition>({ x: 0, y: 0 });
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animated header style
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const fetchExpenseDetails = async (isRefreshing = false) => {
    try {
      console.log('Fetching expense details for ID:', id);
      if (!isRefreshing) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const response = await api.get(`/api/v1/expenses/${id}`);
      console.log('API Response:', response.data);
      
      // Enhance the expense data with additional UI-related fields
      const enhancedExpense = {
        ...response.data,
        categoryColor: getCategoryColor(response.data.categoryName),
        categoryIcon: getCategoryIcon(response.data.categoryName),
        paymentMethod: getPaymentMethod(response.data.paymentMethod),
        tags: generateTags(response.data)
      };
      
      setExpense(enhancedExpense);
      setError(null);
      
      // Prefetch and cache the receipt image if it exists
      if (enhancedExpense.receiptUrl) {
        prefetchImage(enhancedExpense.receiptUrl);
      }
      
      // Trigger haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      console.error('Failed to fetch expense details:', err);
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
  
  const checkMediaPermission = async () => {
    if (Platform.OS === 'android') {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasMediaPermission(status === 'granted');
    } else {
      setHasMediaPermission(true);
    }
  };

  useEffect(() => {
    fetchExpenseDetails();
    checkMediaPermission();
    
    // Add a listener to refetch when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchExpenseDetails();
    });
    
    return () => {
      unsubscribe();
    };
  }, [id, navigation]);

  const handleDelete = async () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => swipeableRef.current?.close()
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/v1/expenses/${id}`);
              Alert.alert('Success', 'Expense deleted successfully', [
                { 
                  text: 'OK', 
                  onPress: () => navigation.goBack() 
                }
              ]);
            } catch (err: any) {
              console.error('Failed to delete expense:', err);
              Alert.alert(
                'Error', 
                err.response?.data?.message || 'Failed to delete expense',
                [
                  { 
                    text: 'OK',
                    onPress: () => swipeableRef.current?.close()
                  }
                ]
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
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt. Please try again.');
    }
  };
  
  const handleSaveReceipt = async () => {
    if (!expense?.receiptUrl || !hasMediaPermission) return;
    
    try {
      setSavingReceipt(true);
      const fileUri = FileSystem.cacheDirectory + `receipt_${expense.id}.jpg`;
      
      // Download the file
      const { uri } = await FileSystem.downloadAsync(
        expense.receiptUrl,
        fileUri
      );
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Expense Receipts', asset, false);
      
      Alert.alert('Success', 'Receipt saved to your photos');
    } catch (error) {
      console.error('Error saving receipt:', error);
      Alert.alert('Error', 'Failed to save receipt. Please try again.');
    } finally {
      setSavingReceipt(false);
    }
  };
  
  const handleSwipeableOpen = (direction: 'left' | 'right', swipeable: Swipeable) => {
    if (swipeableRef.current && swipeableRef.current !== swipeable) {
      swipeableRef.current.close();
    }
  };

  const handleEdit = () => {
    if (expense) {
      navigation.navigate('EditExpense', { expense });
    }
  };

  const formatDate = (dateString: string | undefined | null, includeTime: boolean = true) => {
    if (!dateString) return 'N/A';
    
    try {
      // If the date string is just a date (YYYY-MM-DD), append time for proper parsing
      const dateToFormat = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
      const formatString = includeTime ? 'MMM dd, yyyy hh:mm a' : 'MMM dd, yyyy';
      return format(new Date(dateToFormat), formatString);
    } catch (e) {
      console.error('Error formatting date:', e, 'Date string:', dateString);
      return 'Invalid date';
    }
  };

  console.log('Rendering with state:', { loading, isRefreshing, error, hasExpense: !!expense });
  
  if (loading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require('../../assets/animations/expense-loading.json')}
          autoPlay
          loop
          style={styles.loadingAnimation}
        />
        <Text style={styles.loadingText}>Loading expense details...</Text>
      </View>
    );
  }

  if (error && !isRefreshing) {
    return (
      <View style={styles.errorContainer}>
        <LottieView
          source={require('../../assets/animations/error-animation.json')}
          autoPlay
          loop={false}
          style={styles.errorAnimation}
        />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => fetchExpenseDetails()}
        >
          <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={styles.emptyContainer}>
        <LottieView
          source={require('../../assets/animations/empty-expense.json')}
          autoPlay
          loop
          style={styles.emptyAnimation}
        />
        <Text style={styles.emptyTitle}>Expense Not Found</Text>
        <Text style={styles.emptyDescription}>
          We couldn't find the expense you're looking for. It may have been moved or deleted.
        </Text>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Back to Expenses</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedFileSize = expense.receiptFileSize 
    ? `${(expense.receiptFileSize / 1024).toFixed(1)} KB` 
    : 'N/A';

  console.log('Expense data:', JSON.stringify(expense, null, 2));
  console.log('Formatted file size:', formattedFileSize);

  const renderHeader = () => {
    const statusColor = getStatusColor(expense.status);
    
    return (
      <Animated.View 
        style={[
          styles.header, 
          { 
            height: HEADER_MAX_HEIGHT,
            transform: [{ translateY: headerTranslateY }] 
          }
        ]}
      >
        <LinearGradient
          colors={['#2196F3', '#1976D2']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {/* Header Top Bar */}
          <View style={styles.headerTopBar}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.screenTitle}>Expense Details</Text>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleEdit}
              >
                <Ionicons name="pencil" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { marginLeft: 8 }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={20} color="#FF5252" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Amount and Merchant */}
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>
              {expense.currency} {expense.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </Text>
            {expense.baseCurrency !== expense.currency && (
              <Text style={styles.baseAmount}>
                ≈ {expense.baseCurrency} {expense.baseAmount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            )}
            <Text style={styles.merchant} numberOfLines={1} ellipsizeMode="tail">
              {expense.merchant}
            </Text>
          </View>
          
          {/* Category and Status */}
          <View style={styles.headerMetaContainer}>
            <View style={styles.categoryBadge}>
              <MaterialCommunityIcons 
                name={expense.categoryIcon} 
                size={16} 
                color={expense.categoryColor} 
                style={styles.categoryIcon} 
              />
              <Text style={[styles.categoryText, { color: expense.categoryColor }]}>
                {expense.categoryName}
              </Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusColor.background }]}>
              <Ionicons 
                name={getStatusIcon(expense.status)} 
                size={16} 
                color={statusColor.text} 
                style={styles.statusIcon} 
              />
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {expense.status.charAt(0).toUpperCase() + expense.status.slice(1).toLowerCase()}
              </Text>
            </View>
            
            {expense.isReimbursable && (
              <View style={styles.reimbursableBadge}>
                <MaterialIcons name="attach-money" size={14} color="#2E7D32" />
                <Text style={styles.reimbursableText}>Reimbursable</Text>
              </View>
            )}
          </View>
          
          {/* Tags */}
          {expense.tags && expense.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {expense.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderDetailRow = (icon: string, label: string, value: string | number, isLast = false) => {
    if (!value) return null;
    
    return (
      <View style={[styles.detailRow, isLast && styles.lastDetailRow]}>
        <View style={styles.detailIconContainer}>
          <MaterialIcons name={icon as any} size={22} color="#757575" />
        </View>
        <View style={styles.detailTextContainer}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text 
            style={styles.detailValue} 
            numberOfLines={2} 
            ellipsizeMode="tail"
            selectable={true}
          >
            {value}
          </Text>
        </View>
        <MaterialIcons 
          name="chevron-right" 
          size={24} 
          color="#E0E0E0" 
          style={styles.detailChevron}
        />
      </View>
    );
  };

  const renderReceiptSection = () => {
    if (!expense.receiptUrl) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt</Text>
          <View style={styles.noReceiptContainer}>
            <MaterialCommunityIcons 
              name="receipt-text-remove" 
              size={48} 
              color="#BDBDBD" 
              style={styles.noReceiptIcon}
            />
            <Text style={styles.noReceiptTitle}>No Receipt Attached</Text>
            <Text style={styles.noReceiptText}>
              Add a receipt to keep track of your expenses more effectively.
            </Text>
            <TouchableOpacity 
              style={styles.addReceiptButton}
              onPress={handleEdit}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addReceiptButtonText}>Add Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const fileExtension = expense.receiptFileName?.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf';
    
    const handleImagePress = () => {
      if (isImage) {
        setIsImageZoomed(true);
        // Trigger haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (isPDF) {
        navigation.navigate('ReceiptViewer', {
          uri: expense.receiptUrl!,
          title: 'Receipt',
          subtitle: `From ${expense.merchant}`
        });
      } else {
        Linking.openURL(expense.receiptUrl!);
      }
    };
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Receipt</Text>
          <TouchableOpacity 
            style={styles.sectionAction}
            onPress={handleEdit}
          >
            <Text style={styles.sectionActionText}>Edit</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.receiptCard}>
          <TouchableOpacity 
            style={styles.receiptPreviewContainer}
            activeOpacity={0.8}
            onPress={handleImagePress}
            disabled={isImageLoading}
          >
            {isImage ? (
              <>
                {isImageLoading && (
                  <View style={styles.imageLoadingContainer}>
                    <ActivityIndicator size="small" color="#2196F3" />
                  </View>
                )}
                <Image 
                  source={{ uri: expense.receiptUrl }} 
                  style={[
                    styles.receiptImage,
                    isImageLoading && { opacity: 0 }
                  ]}
                  resizeMode="contain"
                  onLoadStart={() => setIsImageLoading(true)}
                  onLoadEnd={() => setIsImageLoading(false)}
                  onError={() => setIsImageLoading(false)}
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="search" size={32} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.zoomHint}>Tap to zoom</Text>
                </View>
              </>
            ) : (
              <View style={styles.filePreview}>
                <MaterialCommunityIcons 
                  name={isPDF ? 'file-pdf-box' : 'file-document-outline'} 
                  size={56} 
                  color={isPDF ? '#F44336' : '#2196F3'} 
                />
                <Text style={styles.fileName} numberOfLines={1}>
                  {expense.receiptFileName || 'View File'}
                </Text>
                <Text style={styles.fileSize}>
                  {formattedFileSize} • {fileExtension.toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.receiptInfo}>
            <View style={styles.receiptInfoRow}>
              <Text style={styles.receiptInfoLabel}>File Name:</Text>
              <Text style={styles.receiptInfoValue} numberOfLines={1}>
                {expense.receiptFileName || 'receipt'}
              </Text>
            </View>
            <View style={styles.receiptInfoRow}>
              <Text style={styles.receiptInfoLabel}>File Type:</Text>
              <Text style={styles.receiptInfoValue}>
                {fileExtension.toUpperCase() || 'N/A'}
              </Text>
            </View>
            <View style={styles.receiptInfoRow}>
              <Text style={styles.receiptInfoLabel}>File Size:</Text>
              <Text style={styles.receiptInfoValue}>
                {formattedFileSize}
              </Text>
            </View>
          </View>
          
          <View style={styles.receiptActions}>
            <TouchableOpacity 
              style={styles.receiptAction}
              onPress={async (e) => {
                e.stopPropagation();
                try {
                  const permission = await MediaLibrary.requestPermissionsAsync();
                  if (permission.granted) {
                    setSavingReceipt(true);
                    const fileUri = expense.receiptUrl!;
                    const asset = await MediaLibrary.createAssetAsync(fileUri);
                    await MediaLibrary.createAlbumAsync('Expenses', asset, false);
                    
                    // Trigger success feedback
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    
                    Alert.alert(
                      'Success', 
                      'Receipt saved to your photo library',
                      [
                        { 
                          text: 'OK',
                          onPress: () => setSavingReceipt(false)
                        }
                      ]
                    );
                  } else {
                    Alert.alert(
                      'Permission Required', 
                      'Please allow access to save receipts to your photo library',
                      [
                        { 
                          text: 'Cancel',
                          style: 'cancel',
                          onPress: () => {}
                        },
                        {
                          text: 'Open Settings',
                          onPress: () => Linking.openSettings()
                        }
                      ]
                    );
                  }
                } catch (error) {
                  console.error('Error saving receipt:', error);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert(
                    'Error', 
                    'Failed to save receipt. Please try again.',
                    [{ text: 'OK' }]
                  );
                } finally {
                  setSavingReceipt(false);
                }
              }}
              disabled={savingReceipt}
            >
              {savingReceipt ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#2196F3" />
              )}
              <Text style={styles.receiptActionText}>
                {savingReceipt ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.receiptActionDivider} />
            
            <TouchableOpacity 
              style={styles.receiptAction}
              onPress={async (e) => {
                e.stopPropagation();
                try {
                  await Share.share({
                    url: expense.receiptUrl!,
                    title: `Receipt from ${expense.merchant}`,
                  });
                } catch (error) {
                  console.error('Error sharing receipt:', error);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
              }}
            >
              <Ionicons name="share-social-outline" size={20} color="#2196F3" />
              <Text style={styles.receiptActionText}>Share</Text>
            </TouchableOpacity>
            
            <View style={styles.receiptActionDivider} />
            
            <TouchableOpacity 
              style={styles.receiptAction}
              onPress={handleEdit}
            >
              <Ionicons name="pencil" size={18} color="#2196F3" />
              <Text style={styles.receiptActionText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Image Zoom Modal */}
        <Modal
          visible={isImageZoomed}
          transparent={true}
          onRequestClose={() => setIsImageZoomed(false)}
          animationType="fade"
        >
          <View style={styles.zoomModalContainer}>
            <TouchableWithoutFeedback onPress={() => setIsImageZoomed(false)}>
              <View style={styles.zoomModalBackdrop} />
            </TouchableWithoutFeedback>
            
            <View style={styles.zoomModalContent}>
              <View style={styles.zoomModalHeader}>
                <TouchableOpacity 
                  style={styles.zoomModalCloseButton}
                  onPress={() => setIsImageZoomed(false)}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.zoomImageContainer}>
                <Image
                  source={{ uri: expense.receiptUrl }}
                  style={styles.zoomImage}
                  resizeMode="contain"
                />
              </View>
              
              <View style={styles.zoomModalFooter}>
                <TouchableOpacity 
                  style={styles.zoomActionButton}
                  onPress={handleShareReceipt}
                >
                  <Ionicons name="share-social" size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.zoomActionButton}
                  onPress={handleSaveReceipt}
                >
                  <Ionicons name="download" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Animated header style
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: Math.min(
            Math.max(-scrollY.value, -HEADER_SCROLL_DISTANCE),
            0
          ),
        },
      ],
    };
  });
  
  // Handle scroll events
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  // Animated styles for the image zoom
  const animatedImageStyle = {
    transform: [
      { scale: imageScale },
      { translateX: new Animated.Value(0) },
        
        {/* Header */}
        {renderHeader()}
        
        {/* Main Content */}
        <Animated.ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchExpenseDetails(true)}
              colors={['#2196F3']}
              tintColor="#2196F3"
              progressViewOffset={HEADER_MAX_HEIGHT}
            />
          }
          contentInset={{ top: HEADER_MAX_HEIGHT }}
          contentOffset={{ x: 0, y: -HEADER_MAX_HEIGHT }}
        >
          <View style={styles.contentContainer}>
            {/* Expense Details Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Expense Details</Text>
                <TouchableOpacity 
                  style={styles.sectionAction}
                  onPress={handleEdit}
                >
                  <Text style={styles.sectionActionText}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.detailsCard}>
                {renderDetailRow('calendar-today', 'Date', formatDate(expense.occurredOn, true))}
                {renderDetailRow('category', 'Category', expense.categoryName || 'Uncategorized')}
                {expense.description && renderDetailRow('description', 'Description', expense.description)}
                {expense.notes && renderDetailRow('notes', 'Notes', expense.notes, true)}
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <MaterialIcons name="info" size={22} color="#757575" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View style={styles.statusRow}>
                      <View 
                        style={[
                          styles.statusBadgeSmall, 
                          { backgroundColor: getStatusColor(expense.status).background }
                        ]}
                      >
                        <Ionicons 
                          name={getStatusIcon(expense.status)} 
                          size={14} 
                          color={getStatusColor(expense.status).text} 
                          style={styles.statusIconSmall} 
                        />
                        <Text style={[styles.statusTextSmall, { color: getStatusColor(expense.status).text }]}>
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1).toLowerCase()}
                        </Text>
                      </View>
                      {expense.isReimbursable && (
                        <View style={styles.reimbursableBadgeSmall}>
                          <MaterialIcons name="attach-money" size={12} color="#2E7D32" />
                          <Text style={styles.reimbursableTextSmall}>Reimbursable</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                
                <View style={[styles.detailRow, styles.lastDetailRow]}>
                  <View style={styles.detailIconContainer}>
                    <MaterialIcons name="access-time" size={22} color="#757575" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>
                      {format(parseISO(expense.createdAt), 'MMM dd, yyyy • hh:mm a')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Receipt Section */}
            {renderReceiptSection()}
            
            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Expense ID: {expense.id} • {format(parseISO(expense.updatedAt), 'MMM dd, yyyy')}
              </Text>
            </View>
            
            {/* Bottom padding for FAB */}
            <View style={{ height: 80 }} />
          </View>
        </Animated.ScrollView>
        
        {/* FAB Button */}
        <Animated.View style={[styles.fabContainer, {
          opacity: scrollY.value.interpolate({
            inputRange: [0, 100],
            outputRange: [1, 0],
            extrapolate: 'clamp',
          }),
          transform: [{
            translateY: scrollY.value.interpolate({
              inputRange: [0, 100],
              outputRange: [0, 100],
              extrapolate: 'clamp',
            }),
          }],
        }]}>
          <TouchableOpacity 
            style={styles.fab}
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="pencil" size={24} color="white" />
              <Text style={styles.fabText}>Edit Expense</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// Helper function to get category color
const getCategoryColor = (categoryName: string): string => {
  const colors = [
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#F44336', // Red
    '#00BCD4', // Cyan
    '#FFC107', // Amber
    '#607D8B', // Blue Grey
  ];
  
  // Simple hash function to get a consistent color for each category
  let hash = 0;
  for (let i = 0; i < (categoryName || '').length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Helper function to get category icon
const getCategoryIcon = (categoryName: string): string => {
  const icons: Record<string, string> = {
    'food': 'food',
    'restaurant': 'silverware-fork-knife',
    'coffee': 'coffee',
    'shopping': 'shopping',
    'transport': 'train-car',
    'taxi': 'taxi',
    'flight': 'airplane',
    'hotel': 'hotel',
    'entertainment': 'ticket',
    'utilities': 'lightbulb-outline',
    'internet': 'wifi',
    'phone': 'phone',
    'health': 'medical-bag',
    'education': 'school',
    'gift': 'gift',
    'other': 'dots-horizontal-circle',
  };
  
  const lowerCategory = (categoryName || '').toLowerCase();
  return icons[lowerCategory] || 'tag';
};

// Helper function to get payment method
const getPaymentMethod = (method: string = 'other'): string => {
  const methods: Record<string, string> = {
    'cash': 'Cash',
    'credit_card': 'Credit Card',
    'debit_card': 'Debit Card',
    'bank_transfer': 'Bank Transfer',
    'paypal': 'PayPal',
    'other': 'Other',
  };
  
  return methods[method.toLowerCase()] || 'Other';
};

// Helper function to generate tags based on expense data
const generateTags = (expense: any): string[] => {
  const tags: string[] = [];
  
  if (expense.isReimbursable) {
    tags.push('Reimbursable');
  }
  
  if (expense.receiptUrl) {
    tags.push('Receipt Attached');
  }
  
  if (expense.amount > 1000) {
    tags.push('High Value');
  }
  
  // Add more tag logic as needed
  
  return tags;
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return { background: 'rgba(255, 193, 7, 0.1)', text: '#FFA000' }; // Amber
    case 'APPROVED':
      return { background: 'rgba(76, 175, 80, 0.1)', text: '#2E7D32' }; // Green
    case 'REJECTED':
      return { background: 'rgba(244, 67, 54, 0.1)', text: '#C62828' }; // Red
    case 'SUBMITTED':
      return { background: 'rgba(156, 39, 176, 0.1)', text: '#6A1B9A' }; // Purple
    case 'PAID':
      return { background: 'rgba(0, 188, 212, 0.1)', text: '#00695C' }; // Teal
    default:
      return { background: 'rgba(158, 158, 158, 0.1)', text: '#424242' }; // Grey
  }
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Prefetch and cache image
const prefetchImage = async (uri: string) => {
  try {
    await Image.prefetch(uri);
  } catch (error) {
    console.error('Error prefetching image:', error);
  }
};

// Get status icon based on status
const getStatusIcon = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'time-outline';
    case 'APPROVED':
      return 'checkmark-circle-outline';
    case 'REJECTED':
      return 'close-circle-outline';
    case 'SUBMITTED':
      return 'paper-plane-outline';
    case 'PAID':
      return 'card-outline';
    default:
      return 'help-circle-outline';
  }
};

const styles = StyleSheet.create({
  // Safe Area
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  loadingAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  errorAnimation: {
    width: 180,
    height: 180,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  emptyAnimation: {
    width: 240,
    height: 240,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // Buttons
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  
  // Header
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1000,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  baseAmount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  merchant: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: '100%',
  },
  headerMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  statusIconSmall: {
    marginRight: 4,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reimbursableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  reimbursableText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E7D32',
    marginLeft: 4,
  },
  reimbursableBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  reimbursableTextSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    margin: 2,
  },
  tagText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: HEADER_MAX_HEIGHT + 16,
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  sectionAction: {
    padding: 4,
  },
  sectionActionText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Detail Rows
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  detailChevron: {
    opacity: 0.5,
  },
  
  // Receipt Section
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptPreviewContainer: {
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  zoomHint: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  filePreview: {
    alignItems: 'center',
    padding: 24,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
    marginTop: 12,
    textAlign: 'center',
  },
  fileSize: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 4,
  },
  receiptInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  receiptInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  receiptInfoLabel: {
    width: 100,
    fontSize: 14,
    color: '#9E9E9E',
  },
  receiptInfoValue: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  receiptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  receiptAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  receiptActionDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F5F5F5',
  },
  receiptActionText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // No Receipt State
  noReceiptContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noReceiptIcon: {
    marginBottom: 16,
  },
  noReceiptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
    textAlign: 'center',
  },
  noReceiptText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  addReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  addReceiptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Image Zoom Modal
  zoomModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  zoomModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  zoomModalContent: {
    flex: 1,
  },
  zoomModalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  zoomModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  zoomModalFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  zoomActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  
  // Footer
  footer: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 4,
  },
  
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 10,
  },
  fab: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Main container
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header styles
  headerContainer: {
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Content styles
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  
  // Amount and merchant styles
  amountContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  baseAmount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    opacity: 0.9,
  },
  merchant: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  
  // Category badge
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  categoryIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  
  // Status badge
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Reimbursable badge
  reimbursableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  reimbursableText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Date
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Section styles
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Detail row styles
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLeft: {
    marginRight: 12,
  },
  detailRight: {
    flex: 1,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  detailChevron: {
    marginLeft: 8,
  },
  detailSeparator: {
    position: 'absolute',
    left: 0,
    right: 20,
    bottom: 0,
    height: 1,
    backgroundColor: '#f5f5f5',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  
  // Notes styles
  notesContainer: {
    marginTop: 12,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  notesText: {
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
  },
  editIconButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  
  // Add notes button
  addNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    marginTop: 8,
  },
  addNotesButtonText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Receipt styles
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptContainer: {
    height: 220,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  receiptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  receiptContainerActive: {
    opacity: 1,
  },
  receiptOverlayContent: {
    alignItems: 'center',
  },
  receiptOverlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  receiptFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  receiptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptInfoText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
    flex: 1,
  },
  receiptFileSize: {
    fontSize: 13,
    color: '#9E9E9E',
    marginLeft: 8,
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  receiptActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Receipt actions
  receiptActionsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  receiptAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  receiptActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  receiptActionDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  
  // No receipt state
  noReceiptContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
    padding: 24,
  },
  noReceiptIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noReceiptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4,
    textAlign: 'center',
  },
  noReceiptSubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  addReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  addReceiptButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 15,
  },
  
  // Buttons
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  addButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  
  // Loading and error states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingAnimation: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  errorAnimation: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  secondaryButtonText: {
    color: '#212121',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Delete button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFEBEE',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  
  // Spacer
  spacer: {
    height: 24,
  },
  
  // Modal styles for image zoom
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  zoomedImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  amountContainer: {
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  baseAmount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  merchant: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reimbursableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  reimbursableText: {
    marginLeft: 4,
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#212121',
  },
  receiptContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  receiptPreview: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  filePreview: {
    alignItems: 'center',
    padding: 16,
  },
  fileName: {
    marginTop: 8,
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
    maxWidth: '100%',
  },
  fileSize: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  receiptActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  receiptAction: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  receiptActionText: {
    marginLeft: 8,
    color: '#2196F3',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Swipeable Actions
  swipeActionsContainer: {
    width: 160,
    flexDirection: 'row',
  },
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeEditAction: {
    backgroundColor: '#2196F3',
  },
  swipeDeleteAction: {
    backgroundColor: '#F44336',
  },
  
  // Loading States
  loadingHeader: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingAmount: {
    height: 40,
    width: 120,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
    borderRadius: 4,
  },
  loadingMerchant: {
    height: 24,
    width: 160,
    backgroundColor: '#f0f0f0',
    marginBottom: 4,
    borderRadius: 4,
  },
  loadingDate: {
    height: 16,
    width: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  loadingSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 16,
  },
  loadingSectionTitle: {
    height: 20,
    width: 100,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
    borderRadius: 4,
  },
  loadingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  loadingText: {
    height: 16,
    width: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  loadingReceipt: {
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  
  // Error States
  errorIcon: {
    marginBottom: 16,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    color: '#9E9E9E',
    fontSize: 16,
    marginBottom: 24,
  },
  // Retry button styles moved to a single definition
  
  // Main Styles
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  baseAmount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  merchant: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    maxWidth: '90%',
  },
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginTop: -16,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
    padding: 20,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 24,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  addNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
    alignSelf: 'center',
  },
  addNotesButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  receiptContainer: {
    height: 220,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  receiptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  receiptOverlayContent: {
    alignItems: 'center',
  },
  receiptOverlayText: {
    color: 'white',
    marginTop: 8,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  receiptContainerActive: {
    opacity: 1,
  },
  receiptInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  receiptInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  receiptInfoText: {
    fontSize: 13,
    color: '#757575',
    marginLeft: 6,
    maxWidth: 120,
  },
  receiptActions: {
    flexDirection: 'row',
  },
  receiptActionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  noReceiptContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    padding: 24,
  },
  noReceiptIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  noReceiptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4,
    textAlign: 'center',
  },
  noReceiptSubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  addReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  addReceiptButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 15,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    backgroundColor: '#E3F2FD',
  },
  editButtonText: {
    color: '#0D47A1',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  // Empty notes state
  emptyNotesContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotesText: {
    color: '#9E9E9E',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  actionButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 16,
  },
  fabEdit: {
    backgroundColor: '#2196F3',
  },
  fabDelete: {
    backgroundColor: '#F44336',
  },
  footerSpacer: {
    height: 100,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
});

// Add hover effect for web
const stylesForWeb = Platform.select({
  web: {
    receiptContainer: {
      ...styles.receiptContainer,
      transition: 'transform 0.2s ease',
      ':hover': {
        transform: 'translateY(-2px)',
      },
    },
    receiptOverlay: {
      ...styles.receiptOverlay,
      ':hover': {
        opacity: 1,
      },
    },
    receiptActionButton: {
      ...styles.receiptActionButton,
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
      },
    },
    editButton: {
      ...styles.editButton,
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#BBDEFB',
        borderColor: '#90CAF9',
      },
    },
  },
  default: {},
});

// Merge web styles with platform-specific overrides
const mergedStyles = StyleSheet.create({
  ...styles,
  receiptContainer: {
    ...styles.receiptContainer,
    ...(Platform.OS === 'web' ? {
      transition: 'transform 0.2s ease',
      ':hover': {
        transform: 'translateY(-2px)',
      },
    } : {}),
  },
  receiptOverlay: {
    ...styles.receiptOverlay,
    ...(Platform.OS === 'web' ? {
      ':hover': {
        opacity: 1,
      },
    } : {}),
  },
  receiptActionButton: {
    ...styles.receiptActionButton,
    ...(Platform.OS === 'web' ? {
      transition: 'background-color 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
      },
    } : {}),
  },
  editButton: {
    ...styles.editButton,
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#BBDEFB',
        borderColor: '#90CAF9',
      },
    } : {}),
  },
});
