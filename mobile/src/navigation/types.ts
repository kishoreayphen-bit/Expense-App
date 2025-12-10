export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;
  
  // Company Registration (moved to authenticated stack)
  CompanyRegistration: undefined;
  
  // Mode Selection
  ModeSelection: undefined;
  CompanySelection: undefined;
  
  // Main App
  MainTabs: undefined;
  ExpenseDetail: { id: number };
  ReceiptsList: { expenseId: number };
  ReceiptPages: { receiptId: number };
  ReceiptViewer: { uri: string; title?: string; subtitle?: string };
  AddExpense: undefined;
  AddTransaction: undefined;
  EditExpense: { expense: any };
  GroupChat: { groupId: number; createSplit?: { totalAmount: number; involvedUserIds: number[]; mode: string; shares?: Array<{ userId: number; amount: number }>; title?: string } };
  GroupInfo: { groupId: number };
  SplitCreate: { groupId: number; members?: Array<{ id:number; name:string; email:string }> };
  SplitCreateWizard: { groupId: number; members?: Array<{ id:number; name:string; email:string }> };
  SplitMembers: { groupId: number; draft: { title: string; totalAmount: number; currency: string; paidByUserId?: number | null; members?: Array<{ id:number; name:string; email:string }> } };
  SplitDetail: { groupId: number; split: { id?: number; title: string; totalAmount: number; currency: string; involvedUserIds: number[]; shares?: Array<{ userId: number; amount: number }> } };
  
  // Company Management
  CompanyMembers: { companyId: number };
  InviteMember: { companyId: number };
  PendingInvitations: undefined;
  ManageMembers: undefined;
  
  // Payment
  Payment: { 
    splitShareId: number; 
    amount: number; 
    currency: string; 
    recipientName: string; 
    expenseTitle: string;
  };
  
  // Admin Screens
  AdminDashboard: undefined;
  UserManagement: undefined;
  RoleManagement: undefined;
  AuditLogs: undefined;
  CreateTeam: undefined;
  
  // Modals
  Loading: undefined;
};

// Main tab navigation parameters
export type MainTabParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Budgets: undefined;
  FX: undefined;
  Splits: undefined;
  Groups: undefined;
  Bills: undefined;
  Claims: undefined;
  Admin: undefined;
  ACL: undefined;
  Audit: undefined;
  Notifications: undefined;
  Profile: undefined;
};
