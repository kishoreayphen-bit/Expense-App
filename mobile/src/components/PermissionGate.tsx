import React, { ReactNode } from 'react';
import { useRole } from '../context/RoleContext';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user permission
 * 
 * @example
 * <PermissionGate permission="APPROVE_EXPENSES">
 *   <Button title="Approve" onPress={handleApprove} />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { hasPermission } = useRole();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
