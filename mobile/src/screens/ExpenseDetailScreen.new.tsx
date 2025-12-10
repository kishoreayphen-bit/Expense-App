import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  RefreshControl,
  Share,
  Linking,
  SafeAreaView,
  Modal,
  Pressable,
  StatusBar,
  Animated,
  ViewStyle,
  ImageSourcePropType
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons, 
  FontAwesome5,
  AntDesign,
  Feather
} from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import * as MediaLibrary from 'expo-media-library';

// Types
interface ScreenDimensions {
  width: number;
  height: number;
}

interface ImagePosition {
  x: number;
  y: number;
}

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
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeableOpen: (direction: 'left' | 'right', swipeable: Swipeable) => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Constants
const SCREEN_DIMENSIONS: ScreenDimensions = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height
};

const CARD_ELEVATION = 3;
const CARD_BORDER_RADIUS = 16;
const HEADER_MAX_HEIGHT = 240;
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// Swipeable Row Component
const SwipeableRow = React.forwardRef<Swipeable, SwipeableRowProps>(({ 
  children, 
  onSwipeableOpen, 
  onEdit, 
  onDelete 
}, ref) => {
  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeableRightActions}>
        <Animated.View style={[styles.swipeableAction, { transform: [{ scale }] }]}>
          <TouchableOpacity 
            onPress={onEdit} 
            style={[styles.swipeableButton, styles.editButton]}
          >
            <Ionicons name="pencil" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={[styles.swipeableAction, { transform: [{ scale }] }]}>
          <TouchableOpacity 
            onPress={onDelete} 
            style={[styles.swipeableButton, styles.deleteButton]}
          >
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

// Main Component
const ExpenseDetailScreen = () => {
  const route = useRoute<RouteProp<{ params: { id: number } }, 'params'>>();
  const navigation = useNavigation();
  const { id } = route.params;

  // State
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ScreenDimensions>({ width: 0, height: 0 });
  
  // Refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const imagePosition = useRef<ImagePosition>({ x: 0, y: 0 });
  const scrollViewRef = useRef<ScrollView>(null);
  const swipeableRef = useRef<Swipeable>(null);

  // Animated header style
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  // Fetch expense details
  const fetchExpenseDetails = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // TODO: Replace with actual API call
      // const response = await api.get(`/expenses/${id}`);
      // setExpense(response.data);
      
      // Mock data for now
      setTimeout(() => {
        setExpense({
          id,
          merchant: 'Test Merchant',
          amount: 100,
          currency: 'USD',
          baseAmount: 100,
          baseCurrency: 'USD',
          categoryName: 'Food',
          categoryIcon: 'restaurant',
          categoryColor: '#FF6B6B',
          status: 'PENDING',
          isReimbursable: true,
          receiptUrl: 'https://example.com/receipt.jpg',
          receiptFileName: 'receipt.jpg',
          receiptFileSize: 1024 * 1024, // 1MB
          receiptFileType: 'image/jpeg',
          description: 'Test expense',
          notes: 'This is a test expense',
          occurredOn: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: ['test', 'food']
        });
        setLoading(false);
        setIsRefreshing(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching expense details:', err);
      setError('Failed to load expense details');
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  // Check media permissions
  const checkMediaPermission = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasMediaPermission(status === 'granted');
    } catch (err) {
      console.error('Error checking media permission:', err);
      setHasMediaPermission(false);
    }
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    fetchExpenseDetails(true);
  }, [fetchExpenseDetails]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    try {
      // TODO: Implement delete functionality
      Alert.alert('Delete', 'Are you sure you want to delete this expense?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // await api.delete(`/expenses/${id}`);
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      console.error('Error deleting expense:', err);
      Alert.alert('Error', 'Failed to delete expense');
    }
  }, [id, navigation]);

  // Handle share receipt
  const handleShareReceipt = useCallback(async () => {
    if (!expense?.receiptUrl) return;
    
    try {
      await Share.share({
        url: expense.receiptUrl,
        title: `Receipt from ${expense.merchant}`,
      });
    } catch (err) {
      console.error('Error sharing receipt:', err);
      Alert.alert('Error', 'Failed to share receipt');
    }
  }, [expense]);

  // Handle save receipt
  const handleSaveReceipt = useCallback(async () => {
    if (!expense?.receiptUrl) return;
    
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Please allow access to save receipts');
        return;
      }
      
      // TODO: Implement save receipt functionality
      // const downloadResult = await FileSystem.downloadAsync(
      //   expense.receiptUrl,
      //   FileSystem.documentDirectory + expense.receiptFileName
      // );
      // 
      // const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      // await MediaLibrary.createAlbumAsync('Expenses', asset, false);
      
      Alert.alert('Success', 'Receipt saved to photo library');
    } catch (err) {
      console.error('Error saving receipt:', err);
      Alert.alert('Error', 'Failed to save receipt');
    }
  }, [expense]);

  // Handle swipeable actions
  const handleSwipeableOpen = useCallback((direction: 'left' | 'right', swipeable: Swipeable) => {
    if (direction === 'right') {
      swipeable.close();
    }
  }, []);

  // Handle edit
  const handleEdit = useCallback(() => {
    if (!expense) return;
    // navigation.navigate('EditExpense', { expense });
    Alert.alert('Edit', 'Edit functionality will be implemented here');
  }, [expense]);

  // Format date
  const formatDate = useCallback((dateString: string | undefined | null, includeTime = true) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (includeTime) {
        return format(date, 'MMM d, yyyy h:mm a');
      }
      return format(date, 'MMM d, yyyy');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchExpenseDetails();
    checkMediaPermission();
  }, [fetchExpenseDetails, checkMediaPermission]);

  // Loading state
  if (loading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchExpenseDetails()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No expense data
  if (!expense) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No expense data found</Text>
      </View>
    );
  }

  // Render detail row
  const renderDetailRow = (icon: string, label: string, value: string | number, isLast = false) => (
    <View style={[styles.detailRow, isLast && styles.detailRowLast]}>
      <View style={styles.detailIconContainer}>
        <MaterialIcons name={icon as any} size={24} color="#666" />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {value || 'N/A'}
        </Text>
      </View>
      {!isLast && <View style={styles.detailSeparator} />}
    </View>
  );

  // Render receipt section
  const renderReceiptSection = () => {
    if (!expense.receiptUrl) {
      return (
        <View style={styles.noReceiptContainer}>
          <MaterialIcons name="receipt" size={48} color="#999" />
          <Text style={styles.noReceiptText}>No receipt attached</Text>
        </View>
      );
    }

    return (
      <View style={styles.receiptContainer}>
        <TouchableOpacity 
          style={styles.receiptImageContainer}
          onPress={() => setIsImageZoomed(true)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: expense.receiptUrl }}
            style={styles.receiptImage}
            resizeMode="contain"
            onLoad={() => {
              Image.getSize(expense.receiptUrl!, (width, height) => {
                setImageDimensions({ width, height });
              });
            }}
          />
          <View style={styles.receiptOverlay}>
            <MaterialIcons name="zoom-in" size={32} color="white" />
          </View>
        </TouchableOpacity>

        <View style={styles.receiptActions}>
          <TouchableOpacity 
            style={styles.receiptActionButton}
            onPress={handleShareReceipt}
            disabled={!expense.receiptUrl}
          >
            <Ionicons name="share-social" size={20} color="#007AFF" />
            <Text style={styles.receiptActionText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.receiptActionButton}
            onPress={handleSaveReceipt}
            disabled={!expense.receiptUrl || hasMediaPermission === false}
          >
            <Ionicons name="download" size={20} color="#007AFF" />
            <Text style={styles.receiptActionText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.receiptInfo}>
          <Text style={styles.receiptInfoText} numberOfLines={1}>
            {expense.receiptFileName || 'receipt'}
          </Text>
          {expense.receiptFileSize && (
            <Text style={styles.receiptInfoSubtext}>
              {formatFileSize(expense.receiptFileSize)}
              {expense.receiptFileType ? ` • ${expense.receiptFileType.split('/')[1]?.toUpperCase()}` : ''}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Render header
  const renderHeader = () => (
    <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
      <LinearGradient
        colors={['#4A90E2', '#357ABD']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Expense Details</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={handleEdit}
              >
                <Ionicons name="create-outline" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountText}>
              {expense.currency} {expense.amount.toFixed(2)}
            </Text>
            <View style={styles.merchantContainer}>
              <Text style={styles.merchantText} numberOfLines={1}>
                {expense.merchant}
              </Text>
            </View>
          </View>

          <View style={styles.tagsContainer}>
            <View style={[styles.tag, { backgroundColor: expense.categoryColor || '#4A90E2' }]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {expense.categoryName}
              </Text>
            </View>
            <View style={[styles.tag, styles.statusTag, { 
              backgroundColor: getStatusColor(expense.status) 
            }]}>
              <Text style={[styles.tagText, styles.statusTagText]} numberOfLines={1}>
                {expense.status}
              </Text>
            </View>
            {expense.isReimbursable && (
              <View style={[styles.tag, styles.reimbursableTag]}>
                <MaterialIcons name="attach-money" size={14} color="white" />
                <Text style={[styles.tagText, styles.reimbursableTagText]}>
                  Reimbursable
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {renderHeader()}
      
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
            progressViewOffset={HEADER_MAX_HEIGHT}
          />
        }
      >
        <View style={styles.content}>
          {/* Receipt Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt</Text>
            {renderReceiptSection()}
          </View>

          {/* Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsContainer}>
              {renderDetailRow('event', 'Date', formatDate(expense.occurredOn))}
              {renderDetailRow('description', 'Description', expense.description || 'No description')}
              {renderDetailRow('category', 'Category', expense.categoryName)}
              {renderDetailRow('payment', 'Payment Method', 'Credit Card')}
              {renderDetailRow('notes', 'Notes', expense.notes || 'No notes', true)}
            </View>
          </View>

          {/* Tags Section */}
          {expense.tags && expense.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsList}>
                {expense.tags.map((tag, index) => (
                  <View key={index} style={styles.tagItem}>
                    <Text style={styles.tagItemText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* FAB for adding receipts */}
      <Animated.View 
        style={[
          styles.fabContainer,
          {
            opacity: scrollY.interpolate({
              inputRange: [0, 50],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 100],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleEdit}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* Image Zoom Modal */}
      <Modal
        visible={isImageZoomed}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageZoomed(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={() => setIsImageZoomed(false)}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          
          <View style={styles.zoomContainer}>
            <Image
              source={{ uri: expense.receiptUrl }}
              style={[
                styles.zoomImage,
                {
                  width: SCREEN_DIMENSIONS.width * 0.9,
                  height: (SCREEN_DIMENSIONS.width * 0.9 * imageDimensions.height) / Math.max(imageDimensions.width, 1)
                }
              ]}
              resizeMode="contain"
            />
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsImageZoomed(false)}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            
            <View style={styles.zoomActions}>
              <TouchableOpacity 
                style={styles.zoomActionButton}
                onPress={handleShareReceipt}
              >
                <Ionicons name="share-social" size={24} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.zoomActionButton}
                onPress={handleSaveReceipt}
                disabled={hasMediaPermission === false}
              >
                <Ionicons name="download" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return '#FFC107';
    case 'APPROVED':
      return '#4CAF50';
    case 'REJECTED':
      return '#F44336';
    case 'PROCESSED':
      return '#2196F3';
    default:
      return '#9E9E9E';
  }
};

// Helper function to get status icon
const getStatusIcon = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'hourglass-empty';
    case 'APPROVED':
      return 'check-circle';
    case 'REJECTED':
      return 'cancel';
    case 'PROCESSED':
      return 'check-circle-outline';
    default:
      return 'help-outline';
  }
};

// Styles
const styles = StyleSheet.create({
  // Base styles
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  
  // Header styles
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    zIndex: 10,
    elevation: 4,
  },
  headerGradient: {
    flex: 1,
  },
  headerContent: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Amount styles
  amountContainer: {
    marginBottom: 16,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  merchantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  
  // Tags styles
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  statusTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusTagText: {
    textTransform: 'capitalize',
  },
  reimbursableTag: {
    backgroundColor: 'rgba(76, 217, 100, 0.2)',
  },
  reimbursableTagText: {
    marginLeft: 4,
  },
  
  // Scroll view styles
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollViewContent: {
    paddingTop: HEADER_MAX_HEIGHT + 16,
    paddingBottom: 32,
  },
  
  // Content styles
  content: {
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  
  // Receipt styles
  noReceiptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  noReceiptText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  receiptContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptImageContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
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
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  receiptActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  receiptActionText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  receiptInfo: {
    padding: 12,
  },
  receiptInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  receiptInfoSubtext: {
    fontSize: 12,
    color: '#999',
  },
  
  // Details styles
  detailsContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailRow: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  detailRowLast: {
    paddingBottom: 0,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  detailSeparator: {
    position: 'absolute',
    left: 44,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  
  // Tags list styles
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagItemText: {
    fontSize: 12,
    color: '#666',
  },
  
  // FAB styles
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  zoomContainer: {
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  zoomImage: {
    maxWidth: '100%',
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    padding: 8,
  },
  zoomActions: {
    flexDirection: 'row',
    marginTop: 24,
  },
  zoomActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  
  // Swipeable styles
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

export default ExpenseDetailScreen;
