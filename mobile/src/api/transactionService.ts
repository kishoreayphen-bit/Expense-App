import { api as client } from './client';

// Add debug logs to verify client is properly imported
console.log('TransactionService - Client initialized:', !!client);

export interface Transaction {
  id?: number;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  transactionDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

type TxScopeOptions = { fromCompany?: boolean; companyId?: number };

export const getTransactions = async (opts?: TxScopeOptions): Promise<Transaction[]> => {
  const response = await client.get('/api/v1/transactions', {
    params: opts?.fromCompany && opts.companyId ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
    _skipCompany: !opts?.fromCompany as any,
  } as any);
  return response.data;
};

export const getTransactionById = async (id: number, opts?: TxScopeOptions): Promise<Transaction> => {
  const response = await client.get(`/api/v1/transactions/${id}` , {
    params: opts?.fromCompany && opts.companyId ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
    _skipCompany: !opts?.fromCompany as any,
  } as any);
  return response.data;
};

export const getTransactionsByDateRange = async (
  startDate: string,
  endDate: string,
  opts?: TxScopeOptions,
): Promise<Transaction[]> => {
  const response = await client.get('/api/v1/transactions/filter', {
    params: {
      startDate, endDate,
      ...(opts?.fromCompany && opts.companyId ? { companyId: opts.companyId, company_id: opts.companyId } : {}),
    },
    _skipCompany: !opts?.fromCompany as any,
  } as any);
  return response.data;
};

export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
  opts?: TxScopeOptions,
): Promise<Transaction> => {
  try {
    console.log('Creating transaction:', transaction);
    const response = await client.post('/api/v1/transactions', transaction, {
      params: opts?.fromCompany && opts.companyId ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
      _skipCompany: !opts?.fromCompany as any,
    } as any);
    console.log('Transaction created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in createTransaction:', error);
    throw error;
  }
};

export const updateTransaction = async (
  id: number,
  transaction: Partial<Transaction>,
  opts?: TxScopeOptions,
): Promise<Transaction> => {
  const response = await client.put(`/api/v1/transactions/${id}`, transaction, {
    params: opts?.fromCompany && opts.companyId ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
    _skipCompany: !opts?.fromCompany as any,
  } as any);
  return response.data;
};

export const deleteTransaction = async (id: number, opts?: TxScopeOptions): Promise<void> => {
  await client.delete(`/api/v1/transactions/${id}`, {
    params: opts?.fromCompany && opts.companyId ? { companyId: opts.companyId, company_id: opts.companyId } : undefined,
    _skipCompany: !opts?.fromCompany as any,
  } as any);
};
