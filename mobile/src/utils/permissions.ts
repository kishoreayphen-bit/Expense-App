/**
 * Role-Based Permission Utilities
 * 
 * Centralized permission checking for UI rendering and feature access.
 */

export type SystemRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'USER';
export type CompanyRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'OWNER';

export interface PermissionContext {
  userRole?: SystemRole;
  companyRole?: CompanyRole;
}

/**
 * Check if user can create budgets
 * Only ADMIN (company role) and SUPER_ADMIN (system role) can create budgets
 */
export const canCreateBudget = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  // SUPER_ADMIN can create budgets for any company
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Only ADMIN (company role) can create budgets
  // MANAGER and EMPLOYEE CANNOT
  return companyRole === 'ADMIN';
};

/**
 * Check if user can edit/delete budgets
 * Same as create - only ADMIN and SUPER_ADMIN
 */
export const canManageBudgets = (context: PermissionContext): boolean => {
  return canCreateBudget(context);
};

/**
 * Check if user can view budgets
 * All roles can view budgets (but with different scopes)
 */
export const canViewBudgets = (context: PermissionContext): boolean => {
  return true; // All users can view budgets
};

/**
 * Check if user can create teams/groups
 * MANAGER, ADMIN, and SUPER_ADMIN can create teams
 * EMPLOYEE CANNOT
 */
export const canCreateTeam = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  // SUPER_ADMIN can create teams in any company
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // ADMIN and MANAGER can create teams
  // EMPLOYEE CANNOT
  return companyRole === 'ADMIN' || companyRole === 'MANAGER';
};

/**
 * Check if user can manage teams (edit/delete)
 * Same as create teams
 */
export const canManageTeams = (context: PermissionContext): boolean => {
  return canCreateTeam(context);
};

/**
 * Check if user can view all expenses in company
 * Only ADMIN (company role) and SUPER_ADMIN (system role)
 */
export const canViewAllExpenses = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  // SUPER_ADMIN can view all expenses in any company
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Only ADMIN (company role) can view all expenses
  return companyRole === 'ADMIN';
};

/**
 * Check if user can view employee expenses (Manager privilege)
 * MANAGER can view own + employee expenses
 * ADMIN can view all
 */
export const canViewEmployeeExpenses = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // MANAGER can view employee expenses
  // ADMIN can view all (including employee)
  return companyRole === 'MANAGER' || companyRole === 'ADMIN';
};

/**
 * Check if user can approve expenses
 * MANAGER can approve team expenses
 * ADMIN can approve all company expenses
 * SUPER_ADMIN can approve any expense
 */
export const canApproveExpenses = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  return companyRole === 'ADMIN' || companyRole === 'MANAGER';
};

/**
 * Check if user can manage company members
 * Only ADMIN and SUPER_ADMIN
 */
export const canManageCompanyMembers = (context: PermissionContext): boolean => {
  const { userRole, companyRole } = context;
  
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  return companyRole === 'ADMIN';
};

/**
 * Check if user can create expenses
 * All users can create expenses
 */
export const canCreateExpense = (context: PermissionContext): boolean => {
  return true; // All users can create expenses
};

/**
 * Check if user can edit/delete any expense in company
 * Only ADMIN and SUPER_ADMIN
 */
export const canManageAllExpenses = (context: PermissionContext): boolean => {
  return canViewAllExpenses(context);
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role?: SystemRole | CompanyRole): string => {
  if (!role) return 'User';
  
  const roleNames: Record<string, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN': 'Admin',
    'MANAGER': 'Manager',
    'EMPLOYEE': 'Employee',
    'USER': 'User',
    'OWNER': 'Owner',
  };
  
  return roleNames[role] || role;
};

/**
 * Get role badge color
 */
export const getRoleBadgeColor = (role?: SystemRole | CompanyRole): string => {
  if (!role) return '#6B7280';
  
  const colors: Record<string, string> = {
    'SUPER_ADMIN': '#DC2626', // Red
    'ADMIN': '#2563EB',       // Blue
    'MANAGER': '#7C3AED',     // Purple
    'EMPLOYEE': '#059669',    // Green
    'USER': '#6B7280',        // Gray
    'OWNER': '#EA580C',       // Orange
  };
  
  return colors[role] || '#6B7280';
};

/**
 * Get permission context from user data
 */
export const getPermissionContext = (
  userRole?: SystemRole,
  companyRole?: CompanyRole
): PermissionContext => {
  return {
    userRole,
    companyRole,
  };
};

/**
 * Permission descriptions for UI hints
 */
export const PERMISSION_HINTS = {
  CREATE_BUDGET: 'Only Admins can create budgets',
  CREATE_TEAM: 'Only Managers and Admins can create teams',
  VIEW_ALL_EXPENSES: 'Only Admins can view all company expenses',
  APPROVE_EXPENSES: 'Only Managers and Admins can approve expenses',
  MANAGE_MEMBERS: 'Only Admins can manage company members',
};
