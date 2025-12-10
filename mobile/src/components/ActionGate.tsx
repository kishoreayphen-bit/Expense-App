import React, { ReactNode } from 'react';
import { useRole } from '../context/RoleContext';

interface ActionGateProps {
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  resource: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders children based on user's ability to perform an action
 * 
 * @example
 * <ActionGate action="DELETE" resource="user">
 *   <Button title="Delete User" onPress={handleDelete} />
 * </ActionGate>
 */
export const ActionGate: React.FC<ActionGateProps> = ({ 
  action, 
  resource, 
  children, 
  fallback = null 
}) => {
  const { canPerformAction } = useRole();

  if (!canPerformAction(action, resource)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ActionGate;
