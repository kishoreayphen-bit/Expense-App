import { api } from './client';

export interface Bill {
  id: number;
  billNumber?: string;
  expenseId?: number;
  userId: number;
  companyId?: number;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  categoryId?: number;
  merchant?: string;
  amount?: number;
  currency?: string;
  billDate?: string;
  uploadedAt: string;
  notes?: string;
}

export interface BillUploadData {
  file: any;
  billNumber?: string;
  expenseId?: number;
  categoryId?: number;
  merchant?: string;
  amount?: number;
  currency?: string;
  billDate?: string;
  notes?: string;
  companyId?: number;
}

export interface BillSearchFilters {
  billNumber?: string;
  merchant?: string;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
  companyId?: number;
}

const BillService = {
  async uploadBill(data: BillUploadData): Promise<Bill> {
    const formData = new FormData();
    
    // Add file
    formData.append('file', {
      uri: data.file.uri,
      type: data.file.type || 'application/pdf',
      name: data.file.name || 'bill.pdf',
    } as any);
    
    // Add optional fields
    if (data.billNumber) formData.append('billNumber', data.billNumber);
    if (data.expenseId) formData.append('expenseId', data.expenseId.toString());
    if (data.categoryId) formData.append('categoryId', data.categoryId.toString());
    if (data.merchant) formData.append('merchant', data.merchant);
    if (data.amount) formData.append('amount', data.amount.toString());
    if (data.currency) formData.append('currency', data.currency);
    if (data.billDate) formData.append('billDate', data.billDate);
    if (data.notes) formData.append('notes', data.notes);
    if (data.companyId) formData.append('companyId', data.companyId.toString());
    
    const response = await api.post('/api/v1/bills', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  async listBills(companyId?: number): Promise<Bill[]> {
    const params = new URLSearchParams();
    if (companyId !== undefined) {
      params.append('companyId', companyId.toString());
    }
    
    const response = await api.get(`/api/v1/bills?${params}`);
    return response.data;
  },

  async searchBills(filters: BillSearchFilters): Promise<Bill[]> {
    const params = new URLSearchParams();
    
    if (filters.billNumber) params.append('billNumber', filters.billNumber);
    if (filters.merchant) params.append('merchant', filters.merchant);
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.companyId !== undefined) params.append('companyId', filters.companyId.toString());
    
    const response = await api.get(`/api/v1/bills/search?${params}`);
    return response.data;
  },

  async getBill(id: number): Promise<Bill> {
    const response = await api.get(`/api/v1/bills/${id}`);
    return response.data;
  },

  async downloadBill(id: number): Promise<Blob> {
    const response = await api.get(`/api/v1/bills/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async deleteBill(id: number): Promise<void> {
    await api.delete(`/api/v1/bills/${id}`);
  },
};

export default BillService;
