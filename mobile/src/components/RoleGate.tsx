import React, { ReactNode } from 'react';
import { useRole, Role } from '../context/RoleContext';

interface RoleGateProps {
  minRole?: Role;
  allowedRoles?: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user role
 * 
 * @example
 * // Minimum role (includes higher roles)
 * <RoleGate minRole="MANAGER">
 *   <ManagerPanel />
 * </RoleGate>
 * 
 * @example
 * // Specific roles only
 * <RoleGate allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
 *   <AdminPanel />
 * </RoleGate>
 */
export const RoleGate: React.FC<RoleGateProps> = ({ 
  minRole, 
  allowedRoles, 
  children, 
  fallback = null 
}) => {
  const { role, isAtLeast } = useRole();

  // Check if user has minimum role level
  if (minRole && !isAtLeast(minRole)) {
    return <>{fallback}</>;
  }

  // Check if user has one of the allowed roles
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default RoleGate;
