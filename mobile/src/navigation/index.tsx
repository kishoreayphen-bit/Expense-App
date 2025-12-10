import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
const RegistrationChoiceScreen = React.lazy(() => import('../screens/RegistrationChoiceScreen'));
const CompanyRegistrationScreen = React.lazy(() => import('../screens/CompanyRegistrationScreen'));
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import ReceiptsListScreen from '../screens/ReceiptsListScreen';
import ReceiptPagesScreen from '../screens/ReceiptPagesScreen';
import ReceiptViewerScreen from '../screens/ReceiptViewerScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import EditExpenseScreen from '../screens/EditExpenseScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import SplitCreateScreen from '../screens/SplitCreateScreen';
import SplitCreateWizardScreen from '../screens/SplitCreateWizardScreen';
import SplitMembersScreen from '../screens/SplitMembersScreen';
import SplitDetailScreen from '../screens/SplitDetailScreen';
import CompanyMembersScreen from '../screens/CompanyMembersScreen';
import InviteMemberScreen from '../screens/InviteMemberScreen';
import PendingInvitationsScreen from '../screens/PendingInvitationsScreen';
import ManageMembersScreen from '../screens/ManageMembersScreen';
import PaymentScreen from '../screens/PaymentScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import MainTabs from './MainTabs';
import ModeSelectionScreen from '../screens/ModeSelectionScreen';
import CompanySelectionScreen from '../screens/CompanySelectionScreen';
import { CompanyProvider } from '../context/CompanyContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

// Local Suspense wrapper for lazy screens
const withSuspense = (Component: React.ComponentType) => {
  return (props: any) => (
    <React.Suspense fallback={null}>
      <Component {...props} />
    </React.Suspense>
  );
};

const RootNavigator = () => {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [initialized, setInitialized] = React.useState(false);
  
  React.useEffect(() => {
    if (!isAuthLoading) {
      setInitialized(true);
    }
  }, [isAuthLoading]);

  if (isAuthLoading || !initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" testID="auth-loading" />
      </View>
    );
  }

  if (!token) {
    return (
      <Stack.Navigator>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Create Account' }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <CompanyProvider>
      <NotificationsProvider>
      <Stack.Navigator>
        <Stack.Screen 
          name="ModeSelection" 
          component={ModeSelectionScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CompanySelection" 
          component={CompanySelectionScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs} 
          options={{ headerShown: false }}
        />
        
        <Stack.Screen 
          name="CompanyRegistration" 
          component={withSuspense(CompanyRegistrationScreen)} 
          options={{ title: 'Register Company' }}
        />
        <Stack.Screen 
          name="GroupChat" 
          component={GroupChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="GroupInfo" 
          component={GroupInfoScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SplitCreate" 
          component={SplitCreateScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SplitCreateWizard" 
          component={SplitCreateWizardScreen} 
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen 
          name="SplitMembers" 
          component={SplitMembersScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SplitDetail" 
          component={SplitDetailScreen} 
          options={{ title: 'Split Details' }}
        />
        <Stack.Screen 
          name="CompanyMembers" 
          component={CompanyMembersScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="InviteMember" 
          component={InviteMemberScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PendingInvitations" 
          component={PendingInvitationsScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ManageMembers" 
          component={ManageMembersScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ExpenseDetail" 
          component={ExpenseDetailScreen} 
          options={{ title: 'Expense Details' }}
        />
        <Stack.Screen 
          name="ReceiptsList" 
          component={ReceiptsListScreen} 
          options={{ title: 'Receipts' }}
        />
        <Stack.Screen 
          name="ReceiptPages" 
          component={ReceiptPagesScreen} 
          options={{ title: 'Receipt' }}
        />
        <Stack.Screen 
          name="ReceiptViewer" 
          component={ReceiptViewerScreen} 
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen 
          name="AddExpense" 
          component={AddExpenseScreen} 
          options={{ title: 'Add Expense' }}
        />
        <Stack.Screen 
          name="AddTransaction" 
          component={AddTransactionScreen} 
          options={{ title: 'Add Transaction' }}
        />
        <Stack.Screen 
          name="EditExpense" 
          component={EditExpenseScreen} 
          options={{ title: 'Edit Expense' }}
        />
        <Stack.Screen 
          name="Payment" 
          component={PaymentScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen} 
          options={{ title: 'Admin Dashboard' }}
        />
        <Stack.Screen 
          name="UserManagement" 
          component={UserManagementScreen} 
          options={{ title: 'User Management' }}
        />
        <Stack.Screen 
          name="CreateTeam" 
          component={CreateTeamScreen} 
          options={{ title: 'Create Team' }}
        />
      </Stack.Navigator>
      </NotificationsProvider>
    </CompanyProvider>
  );
};

export default RootNavigator;
