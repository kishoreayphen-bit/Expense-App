import { api } from './client';
import { AxiosError } from 'axios';

interface ApiError extends Error {
  status?: number;
  response?: any;
  code?: string;
  isNetworkError?: boolean;
  isAuthError?: boolean;
  isServerError?: boolean;
}

const handleApiError = (error: any): never => {
  console.error('[API Error]', {
    message: error.message,
    status: error.response?.status,
    code: error.code,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      params: error.config?.params,
    },
    response: error.response?.data,
  });

  const apiError: ApiError = new Error();
  
  // Handle response errors (status codes 4xx, 5xx)
  if (error.response) {
    const { status, data } = error.response;
    
    // Set error properties
    apiError.status = status;
    apiError.response = data;
    apiError.isAuthError = status === 401 || status === 403;
    apiError.isServerError = status >= 500;
    
    // Set appropriate error message
    if (data?.message) {
      apiError.message = data.message;
    } else if (status === 401) {
      apiError.message = 'Your session has expired. Please log in again.';
    } else if (status === 403) {
      apiError.message = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      apiError.message = 'The requested resource was not found.';
    } else if (status >= 500) {
      apiError.message = 'A server error occurred. Please try again later.';
    } else {
      apiError.message = `Request failed with status ${status}`;
    }
  } 
  // Handle network errors (no response received)
  else if (error.request) {
    apiError.isNetworkError = true;
    apiError.message = 'Unable to connect to the server. Please check your internet connection.';
  } 
  // Handle request setup errors
  else {
    apiError.message = error.message || 'An unexpected error occurred';
  }
  
  // Preserve the original error code if it exists
  if (error.code) {
    apiError.code = error.code;
  }
  
  throw apiError;
};

// --- Helpers ---
function formatAsYyyyMmDd(input: string): string {
  if (!input) return input as any;
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  // If ISO datetime, take date part
  if (/^\d{4}-\d{2}-\d{2}T/.test(input)) {
    return input.substring(0, 10);
  }
  // Fallback: try Date parsing and format
  const d = new Date(input);
  if (isNaN(d.getTime())) return input; // unknown format; let server validate
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface Expense {
  id: number;
  merchant: string;
  amount: number;
  currency: string;
  baseAmount: number;
  baseCurrency: string;
  occurredOn: string;
  groupId?: number;
  group?: {
    id: number;
    name?: string;
  };
  category: {
    id: number;
    name: string;
    icon?: string;
  };
  description?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  receiptUrl?: string;
}

export interface ExpenseSummary {
  total: number;
  transactions: number;
  categories: number;
}

export interface DateRange {
  from: string;
  to: string;
}

// In-flight dedupe and throttle caches per unique request key
const _inflight: Map<string, Promise<Expense[]>> = new Map();
const _lastAt: Map<string, number> = new Map();
const _lastData: Map<string, Expense[]> = new Map();
const THROTTLE_MS = 3000; // 3 seconds

type ExpenseScopeOptions = { fromCompany?: boolean; companyId?: number };

export const ExpenseService = {
  // Clear all caches - call this when switching between personal/company modes
  clearCache() {
    console.log('[ExpenseService] Clearing all caches');
    _inflight.clear();
    _lastAt.clear();
    _lastData.clear();
  },

  async getExpenses(dateRange: Partial<DateRange>, page: number = 0, size: number = 1000, opts?: ExpenseScopeOptions): Promise<Expense[]> {
    try {
      console.log('[ExpenseService] Fetching expenses with params:', {
        from: dateRange.from,
        to: dateRange.to,
        page,
        size,
        sort: 'occurredOn,desc',
      });

      const params: any = { page, size, sort: 'occurredOn,desc' };
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;
      // Attach company scoping when in company mode
      if (opts?.fromCompany && opts.companyId && opts.companyId > 0) {
        params.companyId = opts.companyId;
        params.company_id = opts.companyId;
      } else {
        // Personal mode: don't send companyId param (backend will use NULL)
        // Don't send companyId=0 as it gets normalized to NULL anyway
      }

      // Build a stable request key for dedupe/throttle
      const key = JSON.stringify({ url: '/api/v1/expenses', params, fromCompany: !!opts?.fromCompany });

      // If a same request is in-flight, await it
      const existing = _inflight.get(key);
      if (existing) {
        return await existing;
      }

      // If a recent response exists within throttle window, return cached data
      const lastTs = _lastAt.get(key) || 0;
      const now = Date.now();
      if (now - lastTs < THROTTLE_MS && _lastData.has(key)) {
        return _lastData.get(key)!;
      }

      // Create an in-flight promise that fetches AND parses to Expense[]
      const p: Promise<Expense[]> = (async () => {
        const response = await api.get('/api/v1/expenses', { params, _skipCompany: !opts?.fromCompany } as any);
        // Log response metadata without the full data to avoid cluttering logs
        console.log('[ExpenseService] Received response:', {
          status: response.status,
          hasData: !!response.data,
          isArray: Array.isArray(response.data),
          hasContent: !!(response.data?.content),
          contentLength: response.data?.content?.length || 0
        });

        // Handle different response formats
        let expenses: Expense[] = [];
        if (!response.data) {
          console.warn('[ExpenseService] No data in response');
          return [];
        }
        if (Array.isArray(response.data)) {
          expenses = response.data;
        } else if (response.data.content && Array.isArray(response.data.content)) {
          expenses = response.data.content;
        } else if (response.data.id) {
          expenses = [response.data];
        } else if (response.data.content === undefined && response.data.totalElements === 0) {
          expenses = [];
        } else {
          console.warn('[ExpenseService] Unexpected response format:', response.data);
          return [];
        }

        // Normalize fields to avoid dropping valid records due to naming differences
        const normalizedRaw = (expenses as any[]).map((e: any) => {
          const category = e.category || ((e.categoryId || e.categoryName) ? { id: e.categoryId, name: e.categoryName } : undefined);
          const gid = e.groupId ?? e.group_id ?? e.group?.id;
          const group = e.group || (gid ? { id: Number(gid), name: e.groupName } : undefined);
          const cid = e.companyId ?? e.company_id ?? e.company?.id;
          const occurredSrc = e.occurredOn ?? e.occurred_on ?? e.date ?? e.billDate ?? e.transactionDate ?? e.createdAt;
          const occurredOn = typeof occurredSrc === 'string' ? formatAsYyyyMmDd(occurredSrc) : e.occurredOn;
          const reimbursable = e.reimbursable ?? e.isReimbursable ?? (e.reimbursement ? true : false) ?? false;
          return {
            ...e,
            category,
            groupId: gid ? Number(gid) : undefined,
            group,
            companyId: cid != null ? Number(cid) : undefined,
            occurredOn,
            reimbursable,
          } as Expense & { reimbursable?: boolean };
        });

        // Validate minimally: require id and amount; occurredOn is best-effort normalized above
        const validExpenses = normalizedRaw.filter((item: any) => item.id !== undefined && item.amount !== undefined);
        if (validExpenses.length !== expenses.length) {
          console.warn(`[ExpenseService] Filtered out ${expenses.length - validExpenses.length} invalid expenses (missing id/amount)`);
        }
        console.log(`[ExpenseService] Returning ${validExpenses.length} valid expenses`);
        return validExpenses as Expense[];
      })();

      _inflight.set(key, p);
      const result = await p;
      // Clear in-flight marker as soon as result is obtained
      _inflight.delete(key);
      // Store throttle cache
      _lastAt.set(key, Date.now());
      _lastData.set(key, result);
      return result;
    } catch (error) {
      console.error('[ExpenseService] Error fetching expenses:', error);
      return handleApiError(error);
    }
  },

  async getExpenseSummary(dateRange: DateRange, opts?: ExpenseScopeOptions): Promise<ExpenseSummary> {
    try {
      console.log('[ExpenseService] Fetching expense summary for date range:', dateRange);
      
      // First try to use a dedicated summary endpoint if available
      try {
        const summaryParams: any = { from: dateRange.from, to: dateRange.to };
        if (opts?.fromCompany && opts.companyId) {
          summaryParams.companyId = opts.companyId;
          summaryParams.company_id = opts.companyId;
        }
        const response = await api.get('/api/v1/expenses/summary', {
          params: summaryParams,
          // Optional endpoint: suppress error log in axios interceptor
          _suppressErrorLog: true as any,
          _skipCompany: !opts?.fromCompany,
        } as any);
        if (
          response.status === 200 &&
          response.data &&
          typeof response.data.total !== 'undefined'
        ) {
          console.log('[ExpenseService] Received summary from dedicated endpoint:', response.data);
          const totalNum = Number(response.data.total) || 0;
          return {
            total: parseFloat(totalNum.toFixed(2)) || 0,
            transactions: Number(response.data.transactions) || 0,
            categories: Number(response.data.categories) || 0,
          };
        }
      } catch (summaryError: any) {
        const status = summaryError?.response?.status;
        console.log('[ExpenseService] Dedicated summary endpoint not available, falling back.', status);
        // Fall back below
      }
      
      // Fallback: Calculate summary from expenses list
      console.log('[ExpenseService] Calculating summary from expenses list');
      const expenses = await this.getExpenses(dateRange, 0, 1000, opts);
      
      // Log summary calculation details
      console.log(`[ExpenseService] Calculating summary for ${expenses.length} expenses`);
      
      // Calculate total and categories
      // Use baseAmount when available for multi-currency aggregation, otherwise fall back to amount
      const total = expenses.reduce((sum: number, item: Expense) => {
        const base = typeof (item as any).baseAmount === 'number' ? (item as any).baseAmount : undefined;
        const value = base ?? (typeof item.amount === 'number' ? item.amount : 0);
        return sum + value;
      }, 0);
      
      const categories = new Set(
        expenses
          .map((item: Expense) => item.category?.name)
          .filter((name): name is string => Boolean(name))
      );
      
      const summary = {
        total: parseFloat(total.toFixed(2)),
        transactions: expenses.length,
        categories: categories.size,
      };
      
      console.log('[ExpenseService] Calculated summary:', summary);
      return summary;
      
    } catch (error) {
      console.error('[ExpenseService] Error getting expense summary:', error);
      
      // Return a default summary in case of error to prevent UI breakage
      const defaultSummary = {
        total: 0,
        transactions: 0,
        categories: 0,
      };
      
      // If it's an authentication error, rethrow it to be handled by the auth flow
      if (error.isAuthError) {
        throw error;
      }
      
      // For other errors, log them but return the default summary
      return defaultSummary;
    }
  },

  async createExpense(expenseData: Omit<Expense, 'id' | 'status'>, opts?: ExpenseScopeOptions): Promise<Expense> {
    try {
      // Client-side validation and sensible defaults for backend requirements
      const amountNum = Number(expenseData.amount);
      if (!isFinite(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be a positive number');
      }
      const currency = (expenseData.currency || '').trim();
      if (!currency) {
        throw new Error('Currency is required');
      }
      // Default occurredOn to today if not provided
      const occurredOnSrc = expenseData.occurredOn && String(expenseData.occurredOn).trim()
        ? expenseData.occurredOn
        : new Date().toISOString().substring(0, 10);

      // Backend expects ExpenseCreateRequest shape:
      // { amount, currency, occurredOn, categoryId?, groupId?, notes?, merchant?, reimbursable?, companyId? }
      const payload: any = {
        amount: amountNum,
        currency,
        occurredOn: formatAsYyyyMmDd(occurredOnSrc),
        // Prefer explicit categoryId from caller, else fall back to nested category.id
        categoryId: (expenseData as any).categoryId ?? expenseData.category?.id,
        // Optional fields mapping
        description: (expenseData as any).description ?? undefined,
        notes: (expenseData as any).notes ?? undefined,
        merchant: expenseData.merchant ?? undefined,
        reimbursable: (expenseData as any).reimbursable ?? false,
        groupId: (expenseData as any).groupId ?? undefined,
        // Split expense fields
        participants: (expenseData as any).participants ?? undefined,
        splitType: (expenseData as any).splitType ?? undefined,
        // CRITICAL: Include companyId in body for proper scoping
        // null = personal mode, number = company mode
        companyId: (opts?.fromCompany && opts.companyId) ? Number(opts.companyId) : null,
      };

      // Keep null values for companyId to explicitly indicate personal mode
      const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([k, v]) => v !== undefined || k === 'companyId'));
      
      console.log('[ExpenseService] ===== CREATE EXPENSE DEBUG =====');
      console.log('[ExpenseService] opts:', JSON.stringify(opts));
      console.log('[ExpenseService] opts.fromCompany:', opts?.fromCompany);
      console.log('[ExpenseService] opts.companyId:', opts?.companyId, 'Type:', typeof opts?.companyId);
      console.log('[ExpenseService] Computed companyId for payload:', payload.companyId);
      console.log('[ExpenseService] Clean payload:', JSON.stringify(cleanPayload));
      console.log('[ExpenseService] =====================================');
      const response = await api.post('/api/v1/expenses', cleanPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        params: (opts?.fromCompany && opts.companyId) ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
        _skipCompany: !opts?.fromCompany as any,
      });
      console.log('[ExpenseService] Create response status:', response.status);
      if (response.status < 200 || response.status >= 300) {
        const serverMsg = (response.data && (response.data.message || response.data.error)) || 'Failed to create expense';
        throw new Error(serverMsg);
      }
      const d = response.data || {};
      // Normalize to Expense shape expected by mobile UI
      const gid = d.groupId ?? d.group_id ?? (expenseData as any).groupId;
      const normalized: Expense = {
        id: d.id,
        merchant: d.merchant ?? payload.merchant ?? '',
        amount: typeof d.amount === 'number' ? d.amount : Number(payload.amount),
        currency: d.currency ?? payload.currency,
        baseAmount: d.baseAmount ?? d.amount ?? Number(payload.amount),
        baseCurrency: d.baseCurrency ?? d.currency ?? payload.currency,
        occurredOn: d.occurredOn ?? payload.occurredOn,
        groupId: gid ? Number(gid) : undefined,
        group: d.group ? { id: d.group.id, name: d.group.name } : (gid ? { id: Number(gid), name: (d as any).groupName } : undefined),
        category: {
          id: d.category?.id ?? d.categoryId ?? undefined,
          name: d.category?.name ?? d.categoryName ?? undefined,
          icon: d.category?.icon ?? undefined,
        },
        description: d.description ?? d.notes ?? payload.notes ?? undefined,
        status: d.status,
        receiptUrl: d.receiptUrl,
      } as Expense;
      return normalized;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async updateExpense(id: number, expenseData: Partial<Expense>, opts?: ExpenseScopeOptions): Promise<Expense> {
    try {
      const response = await api.put(`/api/v1/expenses/${id}`, expenseData, {
        params: (opts?.fromCompany && opts.companyId) ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
        _skipCompany: !opts?.fromCompany as any,
      } as any);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async deleteExpense(id: number, opts?: ExpenseScopeOptions): Promise<void> {
    try {
      await api.delete(`/api/v1/expenses/${id}`, {
        params: (opts?.fromCompany && opts.companyId) ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
        _skipCompany: !opts?.fromCompany as any,
      } as any);
    } catch (error) {
      return handleApiError(error);
    }
  },

  async uploadReceipt(expenseId: number, uri: string, type: string, name: string) {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type,
      name,
    } as any);

    // Use transformRequest: [] to prevent axios from modifying FormData
    const response = await api.post(
      `/api/v1/expenses/${expenseId}/receipt`,
      formData,
      {
        transformRequest: [],
      }
    );
    return response.data;
  },

  async getExpenseCategories() {
    const response = await api.get('/api/v1/categories');
    return response.data;
  },

  async getCurrencies() {
    const response = await api.get('/api/v1/currencies');
    return response.data;
  },

  async searchExpenses(filters: {
    categoryId?: number;
    currency?: string;
    merchant?: string;
    description?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
    companyId?: number;
  }) {
    try {
      const params = new URLSearchParams();
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.merchant) params.append('merchant', filters.merchant);
      if (filters.description) params.append('description', filters.description);
      if (filters.minAmount !== undefined) params.append('minAmount', filters.minAmount.toString());
      if (filters.maxAmount !== undefined) params.append('maxAmount', filters.maxAmount.toString());
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const headers: any = {};
      if (filters.companyId !== undefined && filters.companyId > 0) {
        headers['X-Company-Id'] = filters.companyId.toString();
      }
      
      const response = await api.get(`/api/v1/expenses/search?${params}`, { headers });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};
