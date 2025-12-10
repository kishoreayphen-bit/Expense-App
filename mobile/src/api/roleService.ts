import { api } from './client';

export interface RoleEntity {
  id: number;
  name: string;
  displayName: string;
  description: string;
  level: number;
  systemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  id: number;
  permissionName: string;
  resourceType: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface AssignRoleRequest {
  userId: number;
  roleName: string;
}

export interface CheckPermissionRequest {
  permission: string;
}

export interface CheckActionRequest {
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  resourceType: string;
}

export const RoleService = {
  /**
   * Get all roles
   */
  async getAllRoles(): Promise<RoleEntity[]> {
    const response = await api.get('/api/v1/roles');
    return response.data;
  },

  /**
   * Get role by name
   */
  async getRoleByName(name: string): Promise<RoleEntity> {
    const response = await api.get(`/api/v1/roles/${name}`);
    return response.data;
  },

  /**
   * Get permissions for a role
   */
  async getRolePermissions(name: string): Promise<RolePermission[]> {
    const response = await api.get(`/api/v1/roles/${name}/permissions`);
    return response.data;
  },

  /**
   * Assign role to user (SUPER_ADMIN only)
   */
  async assignRole(request: AssignRoleRequest): Promise<{ message: string; userId: string; role: string }> {
    const response = await api.post('/api/v1/roles/assign', request);
    return response.data;
  },

  /**
   * Check if current user has permission
   */
  async checkPermission(permission: string): Promise<{ hasPermission: boolean; permission: string; role: string }> {
    const response = await api.post('/api/v1/roles/check-permission', { permission });
    return response.data;
  },

  /**
   * Check if user can perform action on resource
   */
  async checkAction(action: string, resourceType: string): Promise<{ canPerform: boolean; action: string; resourceType: string; role: string }> {
    const response = await api.post('/api/v1/roles/check-action', { action, resourceType });
    return response.data;
  },
};

export default RoleService;
