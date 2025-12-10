import { ExpenseService } from '../api/expenseService';
import { api } from '../api/client';

export async function debugScopeIssue(activeCompanyId?: number | null) {
  const results: string[] = [];
  
  try {
    results.push(`=== SCOPE DEBUG (activeCompanyId=${activeCompanyId}) ===`);
    
    // 1. Check what's in personal mode
    results.push('\n=== PERSONAL MODE DEBUG ===');
    const personalExpenses = await ExpenseService.getExpenses({}, 0, 100, { fromCompany: false });
    results.push(`Personal expenses count: ${personalExpenses.length}`);
    
    // Show first few expenses with their companyId
    personalExpenses.slice(0, 8).forEach((expense, i) => {
      const companyId = (expense as any)?.companyId;
      results.push(`  ${i+1}. ID=${expense.id}, companyId=${companyId}, merchant=${expense.merchant}`);
    });
    
    // 2. Check what's in company mode (if available)
    if (activeCompanyId && Number(activeCompanyId) > 0) {
      results.push('\n=== COMPANY MODE DEBUG ===');
      const companyExpenses = await ExpenseService.getExpenses({}, 0, 100, { fromCompany: true, companyId: Number(activeCompanyId) });
      results.push(`Company expenses count: ${companyExpenses.length}`);
      
      companyExpenses.slice(0, 5).forEach((expense, i) => {
        const companyId = (expense as any)?.companyId;
        results.push(`  ${i+1}. ID=${expense.id}, companyId=${companyId}, merchant=${expense.merchant}`);
      });
      
      // 3. Check for overlap
      const personalIds = new Set(personalExpenses.map(e => e.id));
      const companyIds = new Set(companyExpenses.map(e => e.id));
      const overlap = [...personalIds].filter(id => companyIds.has(id));
      
      results.push(`\n=== OVERLAP ANALYSIS ===`);
      results.push(`Personal expense IDs: [${[...personalIds].slice(0, 10).join(', ')}${personalIds.size > 10 ? '...' : ''}]`);
      results.push(`Company expense IDs: [${[...companyIds].slice(0, 10).join(', ')}${companyIds.size > 10 ? '...' : ''}]`);
      results.push(`Overlapping IDs: [${overlap.join(', ')}]`);
      results.push(`PROBLEM: ${overlap.length} expenses appear in BOTH personal and company lists!`);
      
      if (overlap.length > 0) {
        results.push('\n=== PROBLEMATIC EXPENSES ===');
        overlap.slice(0, 3).forEach(id => {
          const personalExp = personalExpenses.find(e => e.id === id);
          const companyExp = companyExpenses.find(e => e.id === id);
          results.push(`ID ${id}:`);
          results.push(`  In personal: companyId=${(personalExp as any)?.companyId}`);
          results.push(`  In company: companyId=${(companyExp as any)?.companyId}`);
        });
      }
    }
    
    // 4. Raw API calls to see what backend actually returns
    results.push('\n=== RAW API RESPONSES ===');
    
    // Personal API call
    const personalRaw = await api.get('/api/v1/expenses', { 
      params: { companyId: 0, page: 0, size: 5 }, 
      _skipCompany: true 
    } as any);
    const personalData = Array.isArray(personalRaw.data) ? personalRaw.data : [];
    results.push(`Raw personal API (companyId=0): ${personalData.length} items`);
    personalData.forEach((item: any, i: number) => {
      results.push(`  ${i+1}. ID=${item.id}, companyId=${item.companyId}, merchant=${item.merchant}`);
    });
    
    // Company API call (if available)
    if (activeCompanyId && Number(activeCompanyId) > 0) {
      const companyRaw = await api.get('/api/v1/expenses', { 
        params: { companyId: Number(activeCompanyId), page: 0, size: 5 }
      } as any);
      const companyData = Array.isArray(companyRaw.data) ? companyRaw.data : [];
      results.push(`Raw company API (companyId=${activeCompanyId}): ${companyData.length} items`);
      companyData.forEach((item: any, i: number) => {
        results.push(`  ${i+1}. ID=${item.id}, companyId=${item.companyId}, merchant=${item.merchant}`);
      });
    }
    
  } catch (error: any) {
    results.push(`ERROR: ${error.message || error}`);
  }
  
  return results.join('\n');
}
