import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN' | 'USER';

interface RoleContextType {
  role: Role | null;
  setRole: (role: Role) => Promise<void>;
  clearRole: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canPerformAction: (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE', resource: string) => boolean;
  isEmployee: boolean;
  isManager: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAtLeast: (minRole: Role) => boolean;
  loading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ROLE_LEVELS: Record<Role, number> = {
  EMPLOYEE: 0,
  USER: 0, // Same as EMPLOYEE
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [role, setRoleState] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRole();
    
    // Listen for role updates from AuthContext
    const { DeviceEventEmitter } = require('react-native');
    const subscription = DeviceEventEmitter.addListener('roleUpdated', () => {
      console.log('[RoleContext] 📢 Received roleUpdated event, reloading...');
      loadRole();
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  const loadRole = async () => {
    try {
      console.log('[RoleContext] Loading role from AsyncStorage...');
      const storedRole = await AsyncStorage.getItem('userRole');
      console.log('[RoleContext] Stored role:', storedRole);
      if (storedRole) {
        setRoleState(storedRole as Role);
        console.log('[RoleContext] ✅ Role set to:', storedRole);
      } else {
        console.warn('[RoleContext] ⚠️ No role found in AsyncStorage');
        console.log('[RoleContext] 🔄 Attempting to fetch role from API...');
        
        // Try to fetch from API if user is logged in
        try {
          const { api } = require('../api/client');
          const token = await AsyncStorage.getItem('authToken');
          if (token) {
            const userResponse = await api.get('/api/v1/auth/me');
            const userRole = userResponse.data?.role;
            if (userRole) {
              await AsyncStorage.setItem('userRole', userRole);
              setRoleState(userRole as Role);
              console.log('[RoleContext] ✅ Role fetched from API and saved:', userRole);
            }
          }
        } catch (apiError) {
          console.error('[RoleContext] ❌ Failed to fetch role from API:', apiError);
        }
      }
    } catch (error) {
      console.error('[RoleContext] ❌ Error loading role:', error);
    } finally {
      setLoading(false);
    }
  };

  const setRole = async (newRole: Role) => {
    try {
      setRoleState(newRole);
      await AsyncStorage.setItem('userRole', newRole);
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const clearRole = async () => {
    try {
      setRoleState(null);
      await AsyncStorage.removeItem('userRole');
    } catch (error) {
      console.error('Error clearing role:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!role) return false;

    // SUPER_ADMIN has all permissions
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    // ADMIN has all permissions except SUPER_* ones
    if (role === 'ADMIN') {
      return !permission.startsWith('SUPER_');
    }

    // MANAGER permissions
    if (role === 'MANAGER') {
      const managerPermissions = [
        'EXPENSE_',
        'TEAM_',
        'REIMBURSEMENT_',
        'VIEW_REPORTS',
        'APPROVE_EXPENSES',
        'VIEW_TEAM_DATA',
        'MANAGE_OWN_EXPENSES',
        'UPLOAD_BILLS',
        'VIEW_OWN_DATA',
        'REQUEST_REIMBURSEMENT',
      ];
      return managerPermissions.some(p => permission.startsWith(p) || permission === p);
    }

    // EMPLOYEE/USER permissions
    if (role === 'EMPLOYEE' || role === 'USER') {
      const employeePermissions = [
        'OWN_EXPENSE_',
        'VIEW_OWN_DATA',
        'SUBMIT_EXPENSE',
        'UPLOAD_BILL',
        'REQUEST_REIMBURSEMENT',
        'MANAGE_OWN_EXPENSES',
        'UPLOAD_BILLS',
      ];
      return employeePermissions.some(p => permission.startsWith(p) || permission === p);
    }

    return false;
  };

  const canPerformAction = (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE', resource: string): boolean => {
    if (!role) return false;

    // SUPER_ADMIN can do everything
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    // ADMIN can do everything except delete users
    if (role === 'ADMIN') {
      if (action === 'DELETE' && resource === 'user') {
        return false; // Only SUPER_ADMIN can delete users
      }
      return true;
    }

    // MANAGER permissions
    if (role === 'MANAGER') {
      if (resource === 'expense') {
        return ['CREATE', 'READ', 'UPDATE'].includes(action);
      }
      if (resource === 'reimbursement') {
        return ['CREATE', 'READ', 'UPDATE'].includes(action);
      }
      if (resource === 'team') {
        return action === 'READ';
      }
      if (resource === 'report') {
        return action === 'READ';
      }
      return false;
    }

    // EMPLOYEE/USER permissions
    if (role === 'EMPLOYEE' || role === 'USER') {
      if (resource === 'expense') {
        return ['CREATE', 'READ', 'UPDATE'].includes(action);
      }
      if (resource === 'bill') {
        return ['CREATE', 'READ', 'UPDATE'].includes(action);
      }
      if (resource === 'reimbursement') {
        return ['CREATE', 'READ'].includes(action);
      }
      return false;
    }

    return false;
  };

  const isAtLeast = (minRole: Role): boolean => {
    if (!role) {
      console.log('[RoleContext] isAtLeast: role is null/undefined');
      return false;
    }
    const currentLevel = ROLE_LEVELS[role];
    const minLevel = ROLE_LEVELS[minRole];
    const result = currentLevel >= minLevel;
    console.log('[RoleContext] isAtLeast check:', {
      currentRole: role,
      currentLevel,
      minRole,
      minLevel,
      result
    });
    return result;
  };

  const value: RoleContextType = {
    role,
    setRole,
    clearRole,
    hasPermission,
    canPerformAction,
    isEmployee: role === 'EMPLOYEE' || role === 'USER',
    isManager: role === 'MANAGER',
    isAdmin: role === 'ADMIN',
    isSuperAdmin: role === 'SUPER_ADMIN',
    isAtLeast,
    loading,
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
};

// Helper hook for permission-based rendering
export const usePermission = (permission: string): boolean => {
  const { hasPermission } = useRole();
  return hasPermission(permission);
};

// Helper hook for action-based rendering
export const useCanPerform = (action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE', resource: string): boolean => {
  const { canPerformAction } = useRole();
  return canPerformAction(action, resource);
};
