import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';
import { NotificationService, Notification as ApiNotification } from '../api/notificationService';
import { useNotifications } from '../context/NotificationsContext';

type NotificationType = 'payment' | 'reminder' | 'alert' | 'info';

type NotificationsScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Notifications'>;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: Record<string, unknown>;
}

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { refreshUnread, markAsRead: markAsReadCtx, markAllAsRead: markAllAsReadCtx } = useNotifications();

  // Helper function to group notifications by date
  const groupNotificationsByDate = (notifs: Notification[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const groups: { [key: string]: Notification[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'This Month': [],
      'Older': []
    };
    
    notifs.forEach(notif => {
      const notifDate = new Date(notif.time);
      
      if (notifDate >= today) {
        groups['Today'].push(notif);
      } else if (notifDate >= yesterday) {
        groups['Yesterday'].push(notif);
      } else if (notifDate >= lastWeek) {
        groups['This Week'].push(notif);
      } else if (notifDate >= lastMonth) {
        groups['This Month'].push(notif);
      } else {
        groups['Older'].push(notif);
      }
    });
    
    return Object.entries(groups)
      .filter(([_, notifs]) => notifs.length > 0);
  };

  // Sample notifications data with actual dates
  const sampleNotifications: Notification[] = [
    {
      id: '1',
      type: 'payment',
      title: 'Payment Received',
      message: 'You received ₹1,500 from John Doe for dinner',
      time: new Date().toISOString(), // Today
      read: false,
    },
    {
      id: '2',
      type: 'reminder',
      title: 'Bill Reminder',
      message: 'Your electricity bill of ₹2,300 is due tomorrow',
      time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // Today, 3 hours ago
      read: false,
    },
    {
      id: '3',
      type: 'alert',
      title: 'Unusual Activity',
      message: 'A new device logged into your account',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
      read: true,
    },
    {
      id: '4',
      type: 'info',
      title: 'Weekly Summary',
      message: 'You spent ₹8,450 this week',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
      read: true,
    },
    {
      id: '5',
      type: 'payment',
      title: 'Subscription Renewal',
      message: 'Your premium subscription has been renewed',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
      read: true,
    },
  ];

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real notifications from API
      const apiNotifications = await NotificationService.list();
      
      // Transform API notifications to UI format
      const transformedNotifications: Notification[] = apiNotifications.map(n => ({
        id: String(n.id),
        type: mapNotificationType(n.type),
        title: n.title,
        message: n.body,
        time: n.createdAt,
        read: !!n.readAt,
        data: n.data ? JSON.parse(n.data) : undefined,
      }));
      
      setNotifications(transformedNotifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Map backend notification types to UI types
  const mapNotificationType = (type: string): NotificationType => {
    if (type.includes('PAYMENT') || type.includes('SPLIT')) return 'payment';
    if (type.includes('REMINDER')) return 'reminder';
    if (type.includes('ALERT')) return 'alert';
    return 'info';
  };

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await markAsReadCtx([Number(id)]);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [markAsReadCtx]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadCtx();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [markAllAsReadCtx]);

  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'payment':
        return 'payment';
      case 'reminder':
        return 'alarm';
      case 'alert':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  // Get icon color based on notification type
  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case 'payment':
        return '#4CAF50'; // Green
      case 'reminder':
        return '#FF9800'; // Orange
      case 'alert':
        return '#F44336'; // Red
      case 'info':
      default:
        return '#2196F3'; // Blue
    }
  };

  // Format time to relative format (e.g., '2 min ago')
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  // Render notification item
  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, item.read && styles.readNotification]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.notificationIcon}>
        <MaterialIcons 
          name={getNotificationIcon(item.type)} 
          size={24} 
          color={getIconColor(item.type)} 
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.time as string)}</Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
      </View>
      {!item.read && <View style={styles.unreadBadge} />}
    </TouchableOpacity>
  );

  // Render section header
  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  // Group notifications by date
  const groupedNotifications = groupNotificationsByDate(notifications);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>We'll notify you when something new arrives</Text>
    </View>
  );

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadNotifications}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllRead}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={groupedNotifications.map(([title, data]) => ({
          title,
          data,
          key: title,
        }))}
        renderItem={({ item }) => (
          <View style={styles.sectionContainer}>
            {renderSectionHeader({ section: { title: item.title } })}
            {item.data.map((notification: Notification) => (
              <View key={notification.id}>
                {renderNotificationItem({ item: notification })}
              </View>
            ))}
          </View>
        )}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0000ff']}
            tintColor="#0000ff"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // Add safe top padding so header isn't stuck to the top (esp. Android)
    paddingTop: Platform.OS === 'android' ? ((StatusBar.currentHeight || 0) + 8) : 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  markAllRead: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: '#fff',
  },
  readNotification: {
    opacity: 0.7,
  },
  notificationIcon: {
    marginRight: 16,
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    alignSelf: 'center',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
