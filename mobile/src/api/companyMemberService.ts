import { api } from './client';

export interface CompanyMember {
  id: number;
  companyId: number;
  companyName: string;
  userId: number;
  userEmail: string;
  userName: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt?: string;
  invitedAt?: string;
}

export interface UserCompany {
  id: number;
  companyName: string;
  userRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  status: 'ACTIVE';
  joinedAt?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
}

export const CompanyMemberService = {
  /**
   * List all members of a company
   */
  async listMembers(companyId: number): Promise<CompanyMember[]> {
    console.log(`[CompanyMemberService] Listing members for company ${companyId}`);
    const response = await api.get(`/api/v1/companies/${companyId}/members`);
    return response.data;
  },

  /**
   * Invite a user to join the company
   */
  async inviteMember(companyId: number, request: InviteMemberRequest): Promise<CompanyMember> {
    console.log(`[CompanyMemberService] Inviting ${request.email} to company ${companyId} as ${request.role}`);
    const response = await api.post(`/api/v1/companies/${companyId}/members/invite`, request);
    return response.data;
  },

  /**
   * Accept an invitation to join a company
   */
  async acceptInvitation(companyId: number): Promise<CompanyMember> {
    console.log(`[CompanyMemberService] Accepting invitation for company ${companyId}`);
    const response = await api.post(`/api/v1/companies/${companyId}/members/accept`);
    return response.data;
  },

  /**
   * Remove a member from the company
   */
  async removeMember(companyId: number, memberId: number): Promise<void> {
    console.log(`[CompanyMemberService] Removing member ${memberId} from company ${companyId}`);
    await api.delete(`/api/v1/companies/${companyId}/members/${memberId}`);
  },

  /**
   * Get pending invitations for current user
   */
  async getPendingInvitations(): Promise<CompanyMember[]> {
    console.log(`[CompanyMemberService] Getting pending invitations`);
    const response = await api.get('/api/v1/companies/invitations/pending');
    return response.data;
  },

  /**
   * Decline an invitation with optional reason
   */
  async declineInvitation(companyId: number, reason?: string): Promise<void> {
    console.log(`[CompanyMemberService] Declining invitation for company ${companyId}`);
    await api.post(`/api/v1/companies/${companyId}/members/decline`, { reason });
  },

  /**
   * Get user's companies with role information
   */
  async getMyCompanies(): Promise<UserCompany[]> {
    console.log(`[CompanyMemberService] Getting my companies`);
    const response = await api.get('/api/v1/companies/my');
    return response.data;
  },
};
