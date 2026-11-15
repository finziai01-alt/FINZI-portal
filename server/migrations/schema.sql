-- FINZI AI Database Schema
-- Multi-tenant SaaS for Accounting, Financial Management and Auditing
-- SQLite compatible

PRAGMA foreign_keys = ON;

-- ============================================
-- CORE: Users & Profiles
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  is_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  designation TEXT,
  department TEXT,
  employee_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification / OTP tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email_verification', 'password_reset', 'phone_otp')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset sessions
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- ORGANIZATIONS & COMPANIES (Multi-tenancy)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  legal_name TEXT,
  trade_name TEXT,
  business_type TEXT,
  pan TEXT,
  gstin TEXT,
  tan TEXT,
  registered_address TEXT,
  state TEXT,
  city TEXT,
  pincode TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  subscription_plan TEXT DEFAULT 'starter',
  subscription_status TEXT DEFAULT 'active',
  is_ca_firm INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  business_type TEXT,
  pan TEXT,
  gstin TEXT,
  tan TEXT,
  registered_address TEXT,
  state TEXT,
  city TEXT,
  pincode TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  financial_year_start TEXT,
  financial_year_end TEXT,
  accounting_method TEXT DEFAULT 'accrual',
  base_currency TEXT DEFAULT 'INR',
  gst_registration_status TEXT DEFAULT 'regular',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT,
  invited_by TEXT,
  invited_at TEXT DEFAULT (datetime('now')),
  joined_at TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'removed')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id),
  UNIQUE(company_id, user_id)
);

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 0,
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  granted_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================
-- FINANCIAL YEARS
-- ============================================

CREATE TABLE IF NOT EXISTS financial_years (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_locked INTEGER DEFAULT 0,
  is_current INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- ============================================
-- PARTIES: Vendors, Customers, Clients
-- ============================================

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trade_name TEXT,
  gstin TEXT,
  pan TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  category TEXT,
  credit_limit REAL DEFAULT 0,
  payment_terms TEXT,
  is_msme INTEGER DEFAULT 0,
  udyam_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trade_name TEXT,
  gstin TEXT,
  pan TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  category TEXT,
  credit_limit REAL DEFAULT 0,
  payment_terms TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- CA Firm clients (client organizations managed by a CA firm)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  firm_id TEXT NOT NULL,
  company_id TEXT,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  business_type TEXT,
  pan TEXT,
  gstin TEXT,
  tan TEXT,
  registered_address TEXT,
  state TEXT,
  city TEXT,
  pincode TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  assigned_accountant_id TEXT,
  engagement_type TEXT,
  retainer_fee REAL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  compliance_score REAL DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (firm_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_accountant_id) REFERENCES users(id)
);

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_group TEXT NOT NULL CHECK (account_group IN ('assets', 'liabilities', 'equity', 'income', 'expense')),
  account_type TEXT NOT NULL,
  parent_id TEXT,
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  is_system INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES accounts(id)
);

-- ============================================
-- JOURNAL ENTRIES (Double-entry)
-- ============================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  entry_number TEXT NOT NULL,
  voucher_type TEXT DEFAULT 'JV',
  entry_date TEXT NOT NULL,
  reference_number TEXT,
  narration TEXT,
  total_debit REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'posted', 'rejected', 'voided')),
  posted_by TEXT,
  posted_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  cost_centre TEXT,
  source_document_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (posted_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  journal_entry_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  debit_amount REAL DEFAULT 0,
  credit_amount REAL DEFAULT 0,
  description TEXT,
  cost_centre TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- ============================================
-- BILLS & EXPENSES
-- ============================================

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  vendor_id TEXT,
  vendor_name TEXT,
  vendor_gstin TEXT,
  invoice_number TEXT,
  invoice_date TEXT,
  due_date TEXT,
  purchase_account TEXT,
  cost_centre TEXT,
  taxable_value REAL DEFAULT 0,
  cgst REAL DEFAULT 0,
  sgst REAL DEFAULT 0,
  igst REAL DEFAULT 0,
  cess REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  round_off REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  tds_amount REAL DEFAULT 0,
  tds_section TEXT,
  net_payable REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  balance_due REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'unpaid', 'partially_paid', 'paid', 'overdue', 'rejected')),
  payment_terms TEXT,
  notes TEXT,
  document_id TEXT,
  ocr_confidence REAL,
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'manual')),
  is_duplicate INTEGER DEFAULT 0,
  three_way_match_status TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bill_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bill_id TEXT NOT NULL,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity REAL DEFAULT 1,
  unit TEXT,
  rate REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  taxable_amount REAL DEFAULT 0,
  gst_rate REAL DEFAULT 0,
  cgst REAL DEFAULT 0,
  sgst REAL DEFAULT 0,
  igst REAL DEFAULT 0,
  total REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- ============================================
-- INVOICES (Sales)
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  customer_gstin TEXT,
  invoice_date TEXT,
  due_date TEXT,
  place_of_supply TEXT,
  po_reference TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  cgst REAL DEFAULT 0,
  sgst REAL DEFAULT 0,
  igst REAL DEFAULT 0,
  cess REAL DEFAULT 0,
  round_off REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  tds_deductible REAL DEFAULT 0,
  tds_section TEXT,
  net_expected_inflow REAL DEFAULT 0,
  amount_received REAL DEFAULT 0,
  balance_due REAL DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  payment_terms TEXT,
  bank_details TEXT,
  upi_id TEXT,
  notes TEXT,
  terms_conditions TEXT,
  document_id TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurring_frequency TEXT,
  irn TEXT,
  eway_bill_no TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  invoice_id TEXT NOT NULL,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity REAL DEFAULT 1,
  unit TEXT,
  rate REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  taxable_amount REAL DEFAULT 0,
  gst_rate REAL DEFAULT 0,
  cgst REAL DEFAULT 0,
  sgst REAL DEFAULT 0,
  igst REAL DEFAULT 0,
  total REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  payment_number TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('vendor_payment', 'customer_receipt', 'contra', 'journal')),
  party_type TEXT CHECK (party_type IN ('vendor', 'customer', 'bank', 'employee', 'other')),
  party_id TEXT,
  party_name TEXT,
  amount REAL NOT NULL,
  payment_method TEXT,
  bank_account_id TEXT,
  reference_number TEXT,
  utr_number TEXT,
  narration TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'voided')),
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  payment_id TEXT NOT NULL,
  bill_id TEXT,
  invoice_id TEXT,
  journal_entry_id TEXT,
  amount REAL NOT NULL,
  allocated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
);

-- ============================================
-- BANKING
-- ============================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_nickname TEXT,
  account_number_masked TEXT NOT NULL,
  account_type TEXT DEFAULT 'current',
  ifsc_code TEXT,
  book_balance REAL DEFAULT 0,
  bank_balance REAL DEFAULT 0,
  last_synced_at TEXT,
  reconciliation_status TEXT DEFAULT 'unreconciled' CHECK (reconciliation_status IN ('unreconciled', 'partially_reconciled', 'reconciled')),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bank_statements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bank_account_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  statement_period_start TEXT,
  statement_period_end TEXT,
  total_transactions INTEGER DEFAULT 0,
  import_status TEXT DEFAULT 'pending' CHECK (import_status IN ('pending', 'imported', 'partial', 'failed')),
  error_message TEXT,
  imported_by TEXT,
  imported_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (imported_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bank_account_id TEXT NOT NULL,
  bank_statement_id TEXT,
  transaction_date TEXT NOT NULL,
  value_date TEXT,
  description TEXT NOT NULL,
  reference TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  running_balance REAL DEFAULT 0,
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'matched', 'partial', 'flagged')),
  match_confidence REAL,
  match_reason TEXT,
  matched_record_type TEXT,
  matched_record_id TEXT,
  reconciled_at TEXT,
  reconciled_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_statement_id) REFERENCES bank_statements(id),
  FOREIGN KEY (reconciled_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reconciliations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  bank_account_id TEXT NOT NULL,
  statement_period TEXT,
  reconciliation_date TEXT NOT NULL,
  book_balance REAL DEFAULT 0,
  bank_balance REAL DEFAULT 0,
  difference REAL DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'locked')),
  total_entries INTEGER DEFAULT 0,
  matched_entries INTEGER DEFAULT 0,
  unmatched_entries INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- DOCUMENTS & OCR
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_hash TEXT,
  mime_type TEXT,
  document_category TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  sha256_hash TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS document_extractions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  document_id TEXT NOT NULL,
  extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'manual_review')),
  vendor_name TEXT,
  vendor_gstin TEXT,
  invoice_number TEXT,
  invoice_date TEXT,
  due_date TEXT,
  taxable_value REAL,
  cgst REAL,
  sgst REAL,
  igst REAL,
  cess REAL,
  discount REAL,
  round_off REAL,
  grand_total REAL,
  confidence_score REAL,
  confidence_details TEXT,
  missing_fields TEXT,
  validated_by TEXT,
  validated_at TEXT,
  is_verified INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- ============================================
-- TAX: GST & TDS
-- ============================================

CREATE TABLE IF NOT EXISTS tax_records (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('gst', 'tds')),
  tax_period TEXT NOT NULL,
  taxable_value REAL DEFAULT 0,
  output_tax REAL DEFAULT 0,
  input_tax REAL DEFAULT 0,
  net_tax_payable REAL DEFAULT 0,
  tds_withheld REAL DEFAULT 0,
  tds_deposited REAL DEFAULT 0,
  tds_due REAL DEFAULT 0,
  filing_status TEXT DEFAULT 'not_started' CHECK (filing_status IN ('not_started', 'in_progress', 'ready_for_review', 'reviewed', 'filed', 'attention_required')),
  filing_date TEXT,
    acknowledgement_number TEXT,
  gstr_1_status TEXT,
  gstr_3b_status TEXT,
  itc_eligible REAL DEFAULT 0,
  itc_blocked REAL DEFAULT 0,
  prepared_by TEXT,
  prepared_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  filed_by TEXT,
  filed_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (prepared_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (filed_by) REFERENCES users(id)
);

-- ============================================
-- REMINDERS & NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  related_document_id TEXT,
  due_date TEXT NOT NULL,
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed', 'overdue')),
  notification_method TEXT DEFAULT 'in_app',
  scope TEXT DEFAULT 'personal' CHECK (scope IN ('personal', 'company', 'delegated')),
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  company_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  related_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- ============================================
-- AUDIT MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS audit_engagements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_id TEXT NOT NULL,
  engagement_id TEXT NOT NULL,
  engagement_name TEXT NOT NULL,
  audit_type TEXT NOT NULL,
  audit_period_start TEXT NOT NULL,
  audit_period_end TEXT NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'pending_evidence', 'under_review', 'completed', 'closed')),
  lead_auditor_id TEXT NOT NULL,
  review_status TEXT DEFAULT 'pending',
  materiality REAL,
  performance_materiality REAL,
  trivial_threshold REAL,
  progress REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (lead_auditor_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_risks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  engagement_id TEXT NOT NULL,
  risk_area TEXT NOT NULL,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  sa_reference TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (engagement_id) REFERENCES audit_engagements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_evidence (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  engagement_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  document_name TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT,
  uploaded_by TEXT,
  upload_date TEXT DEFAULT (datetime('now')),
  linked_wp_area TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'auditor_verified', 'under_review', 'discrepancy_flagged')),
  file_path TEXT,
  sha256_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (engagement_id) REFERENCES audit_engagements(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS working_papers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  engagement_id TEXT NOT NULL,
  wp_number TEXT NOT NULL,
  audit_area TEXT NOT NULL,
  objective TEXT,
  procedure TEXT,
  evidence_"references" TEXT,
  auditor_conclusion TEXT,
  reviewer_comments TEXT,
  approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
  version INTEGER DEFAULT 1,
  prepared_by TEXT,
  prepared_at TEXT DEFAULT (datetime('now')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  FOREIGN KEY (engagement_id) REFERENCES audit_engagements(id) ON DELETE CASCADE,
  FOREIGN KEY (prepared_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_observations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  engagement_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  observation_type TEXT DEFAULT 'ai_suggestion' CHECK (observation_type IN ('ai_suggestion', 'auditor_finding', 'reviewer_comment', 'approved_conclusion')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  amount_involved REAL DEFAULT 0,
  sa_reference TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'responded', 'resolved', 'closed')),
  auditor_id TEXT,
  manager_response TEXT,
  approved_conclusion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (engagement_id) REFERENCES audit_engagements(id) ON DELETE CASCADE,
  FOREIGN KEY (auditor_id) REFERENCES users(id)
);

-- ============================================
-- APPROVAL REQUESTS (AI action approvals)
-- ============================================

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  request_type TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_changes TEXT,
  source_document_id TEXT,
  debit_account TEXT,
  credit_account TEXT,
  amount REAL DEFAULT 0,
  validation_result TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
  requested_by TEXT DEFAULT 'system',
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- ============================================
-- AUTOMATION WORKFLOWS
-- ============================================

CREATE TABLE IF NOT EXISTS automation_workflows (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  trigger_condition TEXT,
  workflow_steps TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  last_executed_at TEXT,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  owner_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ============================================
-- ACTIVITY LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  company_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- AI CONVERSATIONS & MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  context_type TEXT DEFAULT 'general',
  context_id TEXT,
  financial_year TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  "references" TEXT,
  suggested_actions TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_org ON organizations(id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_bills_company ON bills(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_vendor ON bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_records_company ON tax_records(company_id);
CREATE INDEX IF NOT EXISTS idx_reminders_company ON reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_engagements_client ON audit_engagements(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_firm ON clients(firm_id);
