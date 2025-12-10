import { ExpenseService } from '../api/expenseService';
import { api } from '../api/client';
import { createTransaction, getTransactions } from '../api/transactionService';
import { runScopeSelfTest } from './ScopeSelfTest';

export interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  message: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    duration: number;
  };
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    return {
      name,
      status: 'PASS',
      message: 'Test passed',
      duration: Date.now() - start
    };
  } catch (error: any) {
    const isAssertion = error.message?.includes('Expected') || error.message?.includes('Assert');
    return {
      name,
      status: isAssertion ? 'FAIL' : 'ERROR',
      message: error.message || String(error),
      duration: Date.now() - start
    };
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runAutomatedTests(activeCompanyId?: number | null): Promise<TestSuite> {
  const suiteStart = Date.now();
  const results: TestResult[] = [];

  // Test 1: Personal Expense Creation
  results.push(await runTest('Personal Expense Creation', async () => {
    const expenseData = {
      merchant: 'Test Merchant Personal',
      amount: 50.00,
      currency: 'INR',
      baseAmount: 50.00,
      baseCurrency: 'INR',
      occurredOn: new Date().toISOString().slice(0, 10),
      category: { id: 1, name: 'Food' }
    };
    
    const created = await ExpenseService.createExpense(expenseData, { fromCompany: false });
    assert(created.id > 0, 'Expense should have valid ID');
    assert(created.merchant === 'Test Merchant Personal', 'Merchant should match');
    assert(created.amount === 50.00, 'Amount should match');
    
    // Verify it appears in personal list but not company list
    const personalList = await ExpenseService.getExpenses({}, 0, 100, { fromCompany: false });
    const foundInPersonal = personalList.some(e => e.id === created.id);
    assert(foundInPersonal, 'Created expense should appear in personal list');
    
    if (activeCompanyId && Number(activeCompanyId) > 0) {
      const companyList = await ExpenseService.getExpenses({}, 0, 100, { fromCompany: true, companyId: Number(activeCompanyId) });
      const foundInCompany = companyList.some(e => e.id === created.id);
      assert(!foundInCompany, 'Personal expense should NOT appear in company list');
    }
  }));

  // Test 2: Company Expense Creation (if company mode available)
  if (activeCompanyId && Number(activeCompanyId) > 0) {
    results.push(await runTest('Company Expense Creation', async () => {
      const expenseData = {
        merchant: 'Test Merchant Company',
        amount: 75.00,
        currency: 'INR',
        baseAmount: 75.00,
        baseCurrency: 'INR',
        occurredOn: new Date().toISOString().slice(0, 10),
        category: { id: 1, name: 'Business' }
      };
      
      const created = await ExpenseService.createExpense(expenseData, { fromCompany: true, companyId: Number(activeCompanyId) });
      assert(created.id > 0, 'Company expense should have valid ID');
      assert(created.merchant === 'Test Merchant Company', 'Merchant should match');
      
      // Verify it appears in company list but not personal list
      const companyList = await ExpenseService.getExpenses({}, 0, 100, { fromCompany: true, companyId: Number(activeCompanyId) });
      const foundInCompany = companyList.some(e => e.id === created.id);
      assert(foundInCompany, 'Created expense should appear in company list');
      
      const personalList = await ExpenseService.getExpenses({}, 0, 100, { fromCompany: false });
      const foundInPersonal = personalList.some(e => e.id === created.id);
      assert(!foundInPersonal, 'Company expense should NOT appear in personal list');
    }));
  }

  // Test 3: Personal Transaction Creation
  results.push(await runTest('Personal Transaction Creation', async () => {
    const transactionData = {
      amount: 100.00,
      type: 'INCOME' as const,
      description: 'Test Personal Income',
      transactionDate: new Date().toISOString(), // Full ISO datetime with timezone
      category: 'Income'
    };
    
    const created = await createTransaction(transactionData, { fromCompany: false });
    assert(created.id > 0, 'Transaction should have valid ID');
    assert(created.amount === 100.00, 'Amount should match');
    assert(created.type === 'INCOME', 'Type should match');
    
    // Verify scoping
    const personalTxs = await getTransactions({ fromCompany: false });
    const foundInPersonal = personalTxs.some(t => t.id === created.id);
    assert(foundInPersonal, 'Created transaction should appear in personal list');
  }));

  // Test 4: Budget API Personal Scope
  results.push(await runTest('Personal Budget API', async () => {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const response = await api.get('/api/v1/budgets', { 
      params: { period, companyId: 0 }, 
      _skipCompany: true 
    } as any);
    
    assert(response.status === 200, 'Budget API should return 200');
    const budgets = Array.isArray(response.data) ? response.data : (response.data?.content || []);
    
    // All budgets should have no companyId or companyId <= 0
    const violations = budgets.filter((b: any) => b?.companyId != null && Number(b.companyId) > 0);
    assert(violations.length === 0, `Personal budgets should not have companyId > 0, found ${violations.length} violations`);
  }));

  // Test 5: Company Budget API (if company available)
  if (activeCompanyId && Number(activeCompanyId) > 0) {
    results.push(await runTest('Company Budget API', async () => {
      const period = new Date().toISOString().slice(0, 7);
      const response = await api.get('/api/v1/budgets', { 
        params: { period, companyId: Number(activeCompanyId) }
      } as any);
      
      assert(response.status === 200, 'Company Budget API should return 200');
      const budgets = Array.isArray(response.data) ? response.data : (response.data?.content || []);
      
      // All budgets should have companyId matching activeCompanyId
      const violations = budgets.filter((b: any) => (b?.companyId ?? -1) !== Number(activeCompanyId));
      assert(violations.length === 0, `Company budgets should have companyId=${activeCompanyId}, found ${violations.length} violations`);
    }));
  }

  // Test 6: Scope Self-Test Integration
  results.push(await runTest('Scope Self-Test', async () => {
    const report = await runScopeSelfTest(activeCompanyId);
    const lines = report.split('\n');
    
    // Check for any violations in the report
    for (const line of lines) {
      if (line.includes('violating=')) {
        const match = line.match(/violating=(\d+)/);
        if (match) {
          const violations = parseInt(match[1]);
          assert(violations === 0, `Scope violation detected: ${line}`);
        }
      }
      if (line.includes('ERROR')) {
        throw new Error(`Scope test error: ${line}`);
      }
    }
  }));

  // Test 7: Strict Isolation Verification
  results.push(await runTest('Strict Isolation Verification', async () => {
    // Create test expenses in both modes
    const personalExpense = await ExpenseService.createExpense({
      merchant: 'Personal Test Store',
      amount: 25.00,
      currency: 'INR',
      baseAmount: 25.00,
      baseCurrency: 'INR',
      occurredOn: new Date().toISOString().slice(0, 10),
      category: { id: 1, name: 'Food' }
    }, { fromCompany: false });
    
    let companyExpense: any = null;
    if (activeCompanyId && Number(activeCompanyId) > 0) {
      companyExpense = await ExpenseService.createExpense({
        merchant: 'Company Test Store',
        amount: 35.00,
        currency: 'INR',
        baseAmount: 35.00,
        baseCurrency: 'INR',
        occurredOn: new Date().toISOString().slice(0, 10),
        category: { id: 1, name: 'Business' }
      }, { fromCompany: true, companyId: Number(activeCompanyId) });
    }
    
    // Verify strict isolation with proper date range
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateRange = { from: yesterday, to: today };
    
    const personalList = await ExpenseService.getExpenses(dateRange, 0, 100, { fromCompany: false, companyId: 0 });
    const personalFound = personalList.some(e => e.id === personalExpense.id);
    assert(personalFound, `Personal expense ID ${personalExpense.id} should appear in personal list. Found IDs: [${personalList.map(e => e.id).join(', ')}]`);
    
    if (companyExpense) {
      const companyNotInPersonal = !personalList.some(e => e.id === companyExpense.id);
      assert(companyNotInPersonal, `Company expense ID ${companyExpense.id} should NOT appear in personal list`);
      
      const companyList = await ExpenseService.getExpenses(dateRange, 0, 100, { fromCompany: true, companyId: Number(activeCompanyId) });
      const companyFound = companyList.some(e => e.id === companyExpense.id);
      assert(companyFound, `Company expense ID ${companyExpense.id} should appear in company list. Found IDs: [${companyList.map(e => e.id).join(', ')}]`);
      
      const personalNotInCompany = !companyList.some(e => e.id === personalExpense.id);
      assert(personalNotInCompany, `Personal expense ID ${personalExpense.id} should NOT appear in company list`);
    }
  }));

  const suiteDuration = Date.now() - suiteStart;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  return {
    name: 'Expense App Functionality Tests',
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      errors,
      duration: suiteDuration
    }
  };
}

export function formatTestReport(suite: TestSuite): string {
  const { summary } = suite;
  let report = `=== ${suite.name} ===\n`;
  report += `Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}, Errors: ${summary.errors}\n`;
  report += `Duration: ${summary.duration}ms\n\n`;
  
  for (const result of suite.results) {
    const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    report += `${status} ${result.name} (${result.duration}ms)\n`;
    if (result.status !== 'PASS') {
      report += `   ${result.message}\n`;
    }
  }
  
  return report;
}
