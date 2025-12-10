import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SuperAdminDashboard from '../screens/SuperAdminDashboard';
import AllCompaniesScreen from '../screens/AllCompaniesScreen';
import AllUsersScreen from '../screens/AllUsersScreen';
import GlobalClaimsScreen from '../screens/GlobalClaimsScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AuditLogsAdminScreen from '../screens/AuditLogsAdminScreen';
import SystemSettingsScreen from '../screens/SystemSettingsScreen';
import AdvancedReportsScreen from '../screens/AdvancedReportsScreen';
import BulkOperationsScreen from '../screens/BulkOperationsScreen';
import { useRole } from '../context/RoleContext';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  SuperAdminDashboard: undefined;
  AllCompanies: undefined;
  AllUsers: undefined;
  GlobalClaims: { status?: string } | undefined;
  AuditLogs: undefined;
  SystemSettings: undefined;
  AdvancedReports: undefined;
  BulkOperations: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminNavigator() {
  const { isSuperAdmin } = useRole();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isSuperAdmin ? (
        <>
          {/* Super Admin Screens */}
          <Stack.Screen 
            name="SuperAdminDashboard" 
            component={SuperAdminDashboard}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AllCompanies" 
            component={AllCompaniesScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AllUsers" 
            component={AllUsersScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="GlobalClaims" 
            component={GlobalClaimsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AuditLogs" 
            component={AuditLogsAdminScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="SystemSettings" 
            component={SystemSettingsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AdvancedReports" 
            component={AdvancedReportsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="BulkOperations" 
            component={BulkOperationsScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          {/* Regular Admin Screen */}
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboardScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
