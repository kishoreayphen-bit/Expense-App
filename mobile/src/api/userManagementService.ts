import { api } from './client';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  companyCount?: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  superAdmins: number;
  admins: number;
  regularUsers: number;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: any;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface UpdateRoleRequest {
  role: string;
}

export const UserManagementService = {
  /**
   * Get all users with details (SUPER_ADMIN and ADMIN only)
   */
  async getAllUsers(page: number = 0, size: number = 20, sort: string = 'email,asc'): Promise<PageResponse<User>> {
    const response = await api.get('/api/v1/users/admin/all');
    // Convert to PageResponse format for compatibility
    const users = response.data;
    return {
      content: users,
      pageable: { pageNumber: page, pageSize: size, sort: null },
      totalElements: users.length,
      totalPages: 1,
      last: true,
      first: true,
      numberOfElements: users.length,
    };
  },

  /**
   * Get user by ID (SUPER_ADMIN and ADMIN only)
   */
  async getUserById(userId: number): Promise<User> {
    const response = await api.get(`/api/v1/users/admin/${userId}`);
    return response.data;
  },

  /**
   * Update user role (SUPER_ADMIN only)
   */
  async updateUserRole(userId: number, role: string): Promise<{ message: string; userId: string; role: string }> {
    const response = await api.patch(`/api/v1/admin/users/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Update user details
   */
  async updateUser(userId: number, updates: UpdateUserRequest): Promise<{ message: string; userId: string; changes: string }> {
    const response = await api.patch(`/api/v1/admin/users/${userId}`, updates);
    return response.data;
  },

  /**
   * Toggle user status (suspend/activate)
   */
  async toggleUserStatus(userId: number): Promise<User> {
    const response = await api.post(`/api/v1/users/admin/${userId}/toggle-status`);
    return response.data;
  },

  /**
   * Reset user password (SUPER_ADMIN and ADMIN only)
   */
  async resetPassword(userId: number, newPassword: string): Promise<{ message: string }> {
    const response = await api.post(`/api/v1/users/admin/${userId}/reset-password`, { newPassword });
    return response.data;
  },

  /**
   * Get system statistics (SUPER_ADMIN and ADMIN only)
   */
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get('/api/v1/users/admin/stats');
    return response.data;
  },

  /**
   * Delete user (SUPER_ADMIN only)
   */
  async deleteUser(userId: number): Promise<{ message: string; userId: string; email: string }> {
    const response = await api.delete(`/api/v1/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Get users by role
   */
  async getUsersByRole(roleName: string, page: number = 0, size: number = 20): Promise<PageResponse<User>> {
    const response = await api.get(`/api/v1/admin/users/by-role/${roleName}`, {
      params: { page, size },
    });
    return response.data;
  },
};

export default UserManagementService;
