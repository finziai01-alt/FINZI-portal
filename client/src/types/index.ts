export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  is_verified?: number;
  is_active?: number;
}

export interface Company {
  id: string;
  legal_name: string;
  name?: string;
  trade_name?: string;
  gstin?: string;
  pan?: string;
  role_id?: string;
  role_name?: string;
}

export interface Membership {
  company_id: string;
  company_name: string;
  gstin?: string;
  role_id?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  company: Company | null;
  companies: Company[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Bill {
  id: string;
  bill_number: string;
  vendor_name: string;
  vendor_gstin?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_gstin?: string;
  invoice_date?: string;
  due_date?: string;
  grand_total: number;
  amount_received: number;
  balance_due: number;
  status: string;
  created_at: string;
}

export interface DashboardSummary {
  kpis: Array<{
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
    margin?: string;
  }>;
  receivables: Array<{
    id: string;
    invoice_number: string;
    customer_name: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
  payables: Array<{
    id: string;
    bill_number: string;
    vendor_name: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
  recent_activity: Array<{
    id: string;
    actor: string;
    action: string;
    entity: string;
    time: string;
  }>;
  overdue_count: number;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  account_group: string;
  account_type: string;
  current_balance: number;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  narration: string;
  total_debit: number;
  total_credit: number;
  status: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_nickname?: string;
  account_number_masked: string;
  book_balance: number;
}

export interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  extraction_status?: string;
  confidence_score?: number;
  is_verified?: number;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  category: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to?: string;
}

export interface Notification {
  id: string;
  title: string;
  message?: string;
  type: string;
  is_read: number;
  created_at: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: any;
  suggested_actions?: any;
  created_at: string;
}

export interface AIPagination {
  page: number;
  limit: number;
  total: number;
}
