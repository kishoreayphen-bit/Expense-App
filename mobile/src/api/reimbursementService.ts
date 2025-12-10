import { api } from './client';

export interface ReimbursementRequest {
  expenseId: number;
}

export interface ReimbursementApproval {
  expenseId: number;
  notes?: string;
}

export interface ReimbursementRejection {
  expenseId: number;
  reason?: string;
}

export const ReimbursementService = {
  /**
   * Request reimbursement for an expense (Employee)
   */
  async requestReimbursement(expenseId: number): Promise<any> {
    const response = await api.post(`/api/v1/reimbursements/request/${expenseId}`);
    return response.data;
  },

  /**
   * Approve a reimbursement request (Admin/Manager)
   */
  async approveReimbursement(expenseId: number, notes?: string): Promise<any> {
    const response = await api.post(`/api/v1/reimbursements/approve/${expenseId}`, {
      notes,
    });
    return response.data;
  },

  /**
   * Reject a reimbursement request (Admin/Manager)
   */
  async rejectReimbursement(expenseId: number, reason?: string): Promise<any> {
    const response = await api.post(`/api/v1/reimbursements/reject/${expenseId}`, {
      reason,
    });
    return response.data;
  },

  /**
   * Mark reimbursement as paid (Admin/Manager)
   */
  async markAsPaid(expenseId: number): Promise<any> {
    const response = await api.post(`/api/v1/reimbursements/mark-paid/${expenseId}`);
    return response.data;
  },

  /**
   * Get pending reimbursement requests for a company (Admin/Manager)
   */
  async getPendingReimbursements(companyId: number): Promise<any[]> {
    const response = await api.get('/api/v1/reimbursements/pending', {
      params: { companyId },
    });
    return response.data;
  },

  /**
   * Get reimbursement history (approved/rejected/paid) for a company (Admin/Manager)
   */
  async getReimbursementHistory(companyId: number): Promise<any[]> {
    const response = await api.get('/api/v1/reimbursements/history', {
      params: { companyId },
    });
    return response.data;
  },
};
