import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Companies = lazy(() => import('./pages/Companies'));
const Clients = lazy(() => import('./pages/Clients'));
const Bills = lazy(() => import('./pages/Bills'));
const BillCreate = lazy(() => import('./pages/BillCreate'));
const BillDetails = lazy(() => import('./pages/BillDetails'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceCreate = lazy(() => import('./pages/InvoiceCreate'));
const InvoiceDetails = lazy(() => import('./pages/InvoiceDetails'));
const Ledger = lazy(() => import('./pages/Ledger'));
const VendorCreate = lazy(() => import('./pages/VendorCreate'));
const CustomerCreate = lazy(() => import('./pages/CustomerCreate'));
const AccountCreate = lazy(() => import('./pages/AccountCreate'));
const JournalEntryCreate = lazy(() => import('./pages/JournalEntryCreate'));
const Banking = lazy(() => import('./pages/Banking'));
const Tax = lazy(() => import('./pages/Tax'));
const Reports = lazy(() => import('./pages/Reports'));
const Audit = lazy(() => import('./pages/Audit'));
const AuditEvidence = lazy(() => import('./pages/AuditEvidence'));
const AuditWorkingPapers = lazy(() => import('./pages/AuditWorkingPapers'));
const AI = lazy(() => import('./pages/AI'));
const Automations = lazy(() => import('./pages/Automations'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Settings = lazy(() => import('./pages/Settings'));
const Team = lazy(() => import('./pages/Team'));
const Roles = lazy(() => import('./pages/Roles'));
const Activity = lazy(() => import('./pages/Activity'));
const Support = lazy(() => import('./pages/Support'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuth();
  if (state.isLoading) return null;
  if (!state.isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RequireGuest = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuth();
  if (state.isLoading) return null;
  if (state.isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PageFallback = () => (
  <div className="p-6">
    <div className="h-8 w-56 bg-surface-container rounded animate-pulse" />
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-28 bg-surface-container rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
);

export default function App() {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary-container">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 bg-secondary rounded-md flex items-center justify-center">
            <span className="font-bold text-lg text-on-secondary">F</span>
          </div>
          <h1 className="text-lg font-bold text-white">FINZI AI</h1>
          <p className="text-sm text-on-primary-container">Opening your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
        <Route path="/register" element={<RequireGuest><Register /></RequireGuest>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="clients" element={<Clients />} />
          <Route path="bills" element={<Bills />} />
          <Route path="bills/create" element={<BillCreate />} />
          <Route path="bills/:id" element={<BillDetails />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/create" element={<InvoiceCreate />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="ledger/create" element={<JournalEntryCreate />} />
          <Route path="accounts/create" element={<AccountCreate />} />
          <Route path="vendors/create" element={<VendorCreate />} />
          <Route path="customers/create" element={<CustomerCreate />} />
          <Route path="banking" element={<Banking />} />
          <Route path="tax" element={<Tax />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<Audit />} />
          <Route path="audit/evidence" element={<AuditEvidence />} />
          <Route path="audit/working-papers" element={<AuditWorkingPapers />} />
          <Route path="ai" element={<AI />} />
          <Route path="automations" element={<Automations />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/team" element={<Team />} />
          <Route path="settings/roles" element={<Roles />} />
          <Route path="settings/activity" element={<Activity />} />
          <Route path="support" element={<Support />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
