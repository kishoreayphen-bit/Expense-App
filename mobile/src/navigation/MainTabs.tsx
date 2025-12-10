import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useCompany } from '../context/CompanyContext';
import { useRole } from '../context/RoleContext';

// Import screens directly (avoid React.lazy in React Native)
import DashboardScreen from '../screens/DashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import FXScreen from '../screens/FXScreen';
import SplitScreen from '../screens/SplitScreen';
import GroupsScreen from '../screens/GroupsScreen';
import BillsScreen from '../screens/BillsScreen';
import ClaimsScreen from '../screens/ClaimsScreen';
import AuditLogsScreen from '../screens/AuditLogsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminNavigator from './AdminNavigator';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Direct references (stable by module scope)
const DashboardScreenW = DashboardScreen;
const ExpensesScreenW = ExpensesScreen;
const BudgetsScreenW = BudgetsScreen;
const FXScreenW = FXScreen;
const SplitScreenW = SplitScreen;
const GroupsScreenW = GroupsScreen;
const BillsScreenW = BillsScreen;
const ClaimsScreenW = ClaimsScreen;
const AuditLogsScreenW = AuditLogsScreen;
const NotificationsScreenW = NotificationsScreen;
const ProfileScreenW = ProfileScreen;
const AdminNavigatorW = AdminNavigator;

// Define TabsInner at module scope so identity is stable across renders
const TabsInner = () => {
  const { activeCompanyId } = useCompany();
  const { isAdmin, isSuperAdmin, isAtLeast, role } = useRole();
  const isCompanyMode = !!activeCompanyId;
  const insets = useSafeAreaInsets();
  
  // Debug logging for Claims tab visibility
  console.log('[MainTabs] Claims Tab Debug:', {
    role,
    isCompanyMode,
    activeCompanyId,
    isAtLeastManager: isAtLeast('MANAGER'),
    shouldShowClaims: isCompanyMode && isAtLeast('MANAGER')
  });
  
  return (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
    <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#4CAF50',
      tabBarInactiveTintColor: 'gray',
      tabBarLabelStyle: { fontSize: 12, marginBottom: 2 },
      tabBarItemStyle: { paddingTop: 4, minWidth: 70 },
      tabBarHideOnKeyboard: true,
      tabBarStyle: { 
        paddingBottom: Math.max(8, insets.bottom),
        height: 56 + Math.max(0, insets.bottom),
        backgroundColor: '#fff',
        borderTopColor: '#e5e7eb',
        borderTopWidth: StyleSheet.hairlineWidth 
      },
    }}
    tabBar={(props) => (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <BottomTabBar {...props} />
      </ScrollView>
    )}
  >
    {/* Dashboard tab - label and header changes based on mode */}
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardScreenW}
      options={{
        headerShown: false, // Hide header in both modes
        tabBarLabel: isCompanyMode ? 'Company' : 'Dashboard',
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons 
            name={isCompanyMode ? 'corporate-fare' : 'dashboard'} 
            size={size} 
            color={color} 
          />
        ),
      }}
    />
    <Tab.Screen 
      name="Expenses" 
      component={ExpensesScreenW}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="receipt" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen 
      name="Budgets" 
      component={BudgetsScreenW}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="account-balance-wallet" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen 
      name="FX" 
      component={FXScreenW}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="currency-exchange" size={size} color={color} />
        ),
      }}
    />
    {/* Splits tab - Only visible in personal mode */}
    {!isCompanyMode && (
      <Tab.Screen 
        name="Splits" 
        component={SplitScreenW}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="call-split" size={size} color={color} />
          ),
        }}
      />
    )}
    <Tab.Screen 
      name="Groups" 
      component={GroupsScreenW}
      options={{
        tabBarLabel: isCompanyMode ? 'Teams' : 'Groups',
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="groups" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen 
      name="Bills" 
      component={BillsScreenW}
      options={{
        headerShown: false,
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="receipt-long" size={size} color={color} />
        ),
      }}
    />
    {/* Claims tab - Only visible in company mode for manager/admin */}
    {isCompanyMode && isAtLeast('MANAGER') && (
      <Tab.Screen 
        name="Claims" 
        component={ClaimsScreenW}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assignment" size={size} color={color} />
          ),
        }}
      />
    )}
    {/* Admin tab - Only visible for admin/super_admin */}
    {(isAdmin || isSuperAdmin) && (
      <Tab.Screen 
        name="Admin" 
        component={AdminNavigatorW}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="admin-panel-settings" size={size} color={color} />
          ),
        }}
      />
    )}
    <Tab.Screen 
      name="Notifications"
      component={NotificationsScreenW}
      options={{
        // Hide from tab bar but keep the route registered for navigation
        tabBarButton: () => null,
        headerShown: false,
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreenW}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name="person" size={size} color={color} />
        ),
      }}
    />
    </Tab.Navigator>
  </SafeAreaView>
  );
};

export default TabsInner;
