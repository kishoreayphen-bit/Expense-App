import { api, API_BASE_URL } from './client';

export interface CompanyPayload {
  companyName: string;
  companyCode: string;
  registrationNumber?: string;
  taxId?: string;
  industryType: string;
  companyEmail: string;
  contactNumber: string;
  website?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  currency: string;
  fiscalYearStart?: string;
  timeZone: string;
  companyLogoUrl?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface Company extends CompanyPayload {
  id: number;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const companiesService = {
  // Use main backend API (18080) - unified API
  async create(payload: CompanyPayload) {
    const { data } = await api.post<Company>('/api/v1/companies', payload);
    return data;
  },
  async list() {
    try {
      // Use the unified API endpoint that returns user's companies
      const { data } = await api.get<Company[]>('/api/v1/companies');
      if (Array.isArray(data)) {
        console.log('[companiesService.list] loaded companies:', data.length);
        return data;
      }
      console.log('[companiesService.list] no companies found');
      return [];
    } catch (err: any) {
      console.error('[companiesService.list] error:', err.message);
      return [];
    }
  },
  async get(id: number) {
    const { data } = await api.get<Company>(`/api/v1/companies/${id}`);
    return data;
  },
  async update(id: number, payload: Partial<CompanyPayload>) {
    const { data } = await api.put<Company>(`/api/v1/companies/${id}`, payload);
    return data;
  },
  async remove(id: number) {
    await api.delete(`/api/v1/companies/${id}`);
  },
};
