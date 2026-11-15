import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finzi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('finzi_token');
      localStorage.removeItem('finzi_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('finzi_token', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('finzi_token');
    delete api.defaults.headers.common.Authorization;
  }
};

export const getAuthToken = () => localStorage.getItem('finzi_token');

export default api;

// ============================================================
// AUTH
// ============================================================
export const authRegister = (data: { email: string; password: string; full_name: string; phone?: string }) =>
  api.post('/auth/register', data);

export const authLogin = (data: { email: string; password: string }) =>
  api.post('/auth/login', data);

export const authLogout = () => api.post('/auth/logout');

export const authMe = () => api.get('/auth/me');

export const authForgotPassword = (data: { email: string }) =>
  api.post('/auth/forgot-password', data);

export const authResetPassword = (data: { token: string; password: string }) =>
  api.post('/auth/reset-password', data);

export const authVerifyOTP = (data: { token: string; type: string }) =>
  api.post('/auth/verify-otp', data);

export const authSwitchCompany = (data: { company_id: string }) =>
  api.post('/auth/switch-company', data);

// ============================================================
// COMPANIES
// ============================================================
export const companiesList = () => api.get('/companies');
export const companiesGet = (id: string) => api.get(`/companies/${id}`);
export const companiesCreate = (data: any) => api.post('/companies', data);
export const companiesUpdate = (id: string, data: any) => api.put(`/companies/${id}`, data);

// ============================================================
// USERS & ROLES
// ============================================================
export const usersList = () => api.get('/users');
export const rolesList = () => api.get('/roles');

// ============================================================
// DASHBOARD
// ============================================================
export const dashboardSummary = () => api.get('/dashboard/summary');

// ============================================================
// BILLS
// ============================================================
export const billsList = (params?: any) => api.get('/bills', { params });
export const billsGet = (id: string) => api.get(`/bills/${id}`);
export const billsCreate = (data: any) => api.post('/bills', data);
export const billsUpdate = (id: string, data: any) => api.put(`/bills/${id}`, data);
export const billsDelete = (id: string) => api.delete(`/bills/${id}`);
export const billsRecordPayment = (id: string, data: any) => api.post(`/bills/${id}/payment`, data);

// ============================================================
// VENDORS
// ============================================================
export const vendorsList = () => api.get('/vendors');
export const vendorsGet = (id: string) => api.get(`/vendors/${id}`);
export const vendorsCreate = (data: any) => api.post('/vendors', data);
export const vendorsUpdate = (id: string, data: any) => api.put(`/vendors/${id}`, data);
export const vendorsDelete = (id: string) => api.delete(`/vendors/${id}`);

// ============================================================
// INVOICES
// ============================================================
export const invoicesList = (params?: any) => api.get('/invoices', { params });
export const invoicesGet = (id: string) => api.get(`/invoices/${id}`);
export const invoicesCreate = (data: any) => api.post('/invoices', data);
export const invoicesUpdate = (id: string, data: any) => api.put(`/invoices/${id}`, data);

// ============================================================
// CUSTOMERS
// ============================================================
export const customersList = () => api.get('/customers');
export const customersGet = (id: string) => api.get(`/customers/${id}`);
export const customersCreate = (data: any) => api.post('/customers', data);
export const customersUpdate = (id: string, data: any) => api.put(`/customers/${id}`, data);
export const customersDelete = (id: string) => api.delete(`/customers/${id}`);

// ============================================================
// ACCOUNTS & LEDGER
// ============================================================
export const accountsList = () => api.get('/accounts');
export const accountsGet = (id: string) => api.get(`/accounts/${id}`);
export const accountsCreate = (data: any) => api.post('/accounts', data);
export const accountsUpdate = (id: string, data: any) => api.put(`/accounts/${id}`, data);
export const journalEntriesList = (params?: any) => api.get('/journal-entries', { params });
export const journalEntriesGet = (id: string) => api.get(`/journal-entries/${id}`);
export const journalEntriesCreate = (data: any) => api.post('/journal-entries', data);
export const trialBalance = () => api.get('/trial-balance');

// ============================================================
// BANKING
// ============================================================
export const bankAccountsList = () => api.get('/bank-accounts');
export const bankAccountsCreate = (data: any) => api.post('/bank-accounts', data);
export const bankTransactionsList = (params?: any) => api.get('/bank-transactions', { params });
export const bankTransactionMatch = (id: string, data: any) => api.post(`/bank-transactions/${id}/match`, data);
export const bankStatementImport = (data: any) => api.post('/bank-statements/import', data);

// ============================================================
// DOCUMENTS
// ============================================================
export const documentsList = () => api.get('/documents');
export const documentsUpload = (file: File, companyId: string) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { company_id: companyId },
  });
};
export const documentsDownload = (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' });
export const documentExtractionsGet = (documentId: string) => api.get(`/document-extractions/${documentId}`);
export const documentExtractionsUpdate = (documentId: string, data: any) =>
  api.put(`/document-extractions/${documentId}`, data);

// ============================================================
// TAX
// ============================================================
export const taxDashboard = () => api.get('/tax/dashboard');
export const taxGSTR3B = () => api.get('/tax/gstr3b');
export const taxGSTR2BReconciliation = () => api.get('/tax/gstr2b-reconciliation');

// ============================================================
// REPORTS
// ============================================================
export const reportsPL = () => api.get('/reports/profit-loss');
export const reportsBalanceSheet = () => api.get('/reports/balance-sheet');
export const reportsCashFlow = () => api.get('/reports/cash-flow');
export const reportsReceivablesAgeing = () => api.get('/reports/receivables-ageing');
export const reportsPayablesAgeing = () => api.get('/reports/payables-ageing');

// ============================================================
// AUDIT
// ============================================================
export const auditEngagementsList = () => api.get('/audit/engagements');
export const auditEngagementsCreate = (data: any) => api.post('/audit/engagements', data);
export const auditEngagementsGet = (id: string) => api.get(`/audit/engagements/${id}`);
export const auditEvidenceList = (params?: any) => api.get('/audit/evidence', { params });
export const auditEvidenceCreate = (data: any, file?: File) => {
  const formData = new FormData();
  formData.append('engagement_id', data.engagement_id);
  formData.append('document_name', data.document_name);
  formData.append('category', data.category);
  if (data.source) formData.append('source', data.source);
  if (data.linked_wp_area) formData.append('linked_wp_area', data.linked_wp_area);
  if (file) formData.append('file', file);
  return api.post('/audit/evidence', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const auditWorkingPapersList = (params?: any) => api.get('/audit/working-papers', { params });
export const auditWorkingPapersCreate = (data: any) => api.post('/audit/working-papers', data);
export const auditObservationsList = (params?: any) => api.get('/audit/observations', { params });

// ============================================================
// FINZI AI
// ============================================================
export const aiConversationsList = () => api.get('/ai/conversations');
export const aiConversationsCreate = (data: { title: string }) => api.post('/ai/conversations', data);
export const aiMessagesGet = (conversationId: string) => api.get(`/ai/messages/${conversationId}`);
export const aiMessageSend = (data: { conversation_id: string; content: string }) =>
  api.post('/ai/message', data);
export const aiApprovalsList = () => api.get('/ai/approval-requests');
export const aiApprovalsCreate = (data: any) => api.post('/ai/approval-requests', data);
export const aiApprovalsDecision = (id: string, decision: 'approve' | 'reject' | 'edit') =>
  api.post(`/ai/approval-requests/${id}/decision`, { decision });

// ============================================================
// REMINDERS
// ============================================================
export const remindersList = (params?: any) => api.get('/reminders', { params });
export const remindersCreate = (data: any) => api.post('/reminders', data);

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationsList = () => api.get('/notifications');
export const notificationsRead = (id: string) => api.post(`/notifications/${id}/read`);

// ============================================================
// ACTIVITY LOGS
// ============================================================
export const activityLogsList = () => api.get('/activity-logs');

// ============================================================
// SETTINGS
// ============================================================
export const settingsGet = () => api.get('/settings');
