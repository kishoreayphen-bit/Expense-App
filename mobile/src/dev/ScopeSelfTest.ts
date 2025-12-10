import { ExpenseService } from '../api/expenseService';
import { api } from '../api/client';

export async function runScopeSelfTest(activeCompanyId?: number | null) {
  const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const to = new Date().toISOString().slice(0,10);
  const results: string[] = [];

  // Personal expenses: expect no companyId
  try {
    const personal = await ExpenseService.getExpenses({ from, to }, 0, 100, { fromCompany: false });
    const bad = (personal as any[]).filter(e => e?.companyId != null && Number(e.companyId) > 0);
    results.push(`Personal expenses: ${personal.length} items, violating=${bad.length}`);
  } catch (e:any) {
    results.push(`Personal expenses: ERROR ${e?.message||e}`);
  }

  // Company expenses: expect only activeCompanyId
  if (activeCompanyId && Number(activeCompanyId) > 0) {
    try {
      const cmp = await ExpenseService.getExpenses({ from, to }, 0, 100, { fromCompany: true, companyId: Number(activeCompanyId) });
      const wrong = (cmp as any[]).filter(e => (e?.companyId ?? -1) !== Number(activeCompanyId));
      results.push(`Company expenses(${activeCompanyId}): ${cmp.length} items, violating=${wrong.length}`);
    } catch (e:any) {
      results.push(`Company expenses: ERROR ${e?.message||e}`);
    }
  } else {
    results.push('Company expenses: skipped (no activeCompanyId)');
  }

  // Personal budgets
  try {
    const r = await api.get('/api/v1/budgets', { params: { period: from.slice(0,7), companyId: 0 }, _skipCompany: true } as any);
    const items = Array.isArray(r.data) ? r.data : (r.data?.content || []);
    const bad = items.filter((b:any)=> b?.companyId != null && Number(b.companyId) > 0);
    results.push(`Personal budgets: ${items.length} items, violating=${bad.length}`);
  } catch (e:any) {
    results.push(`Personal budgets: ERROR ${e?.message||e}`);
  }

  // Company budgets
  if (activeCompanyId && Number(activeCompanyId) > 0) {
    try {
      const r = await api.get('/api/v1/budgets', { params: { period: from.slice(0,7), companyId: Number(activeCompanyId) } } as any);
      const items = Array.isArray(r.data) ? r.data : (r.data?.content || []);
      const wrong = items.filter((b:any)=> (b?.companyId ?? -1) !== Number(activeCompanyId));
      results.push(`Company budgets(${activeCompanyId}): ${items.length} items, violating=${wrong.length}`);
    } catch (e:any) {
      results.push(`Company budgets: ERROR ${e?.message||e}`);
    }
  } else {
    results.push('Company budgets: skipped (no activeCompanyId)');
  }

  return results.join('\n');
}
