import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Bills = lazy(() => import('./pages/Bills'));
const BillCreate = lazy(() => import('./pages/BillCreate'));
const BillDetails = lazy(() => import('./pages/BillDetails'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceCreate = lazy(() => import('./pages/InvoiceCreate'));
const Ledger = lazy(() => import('./pages/Ledger'));
const VendorCreate = lazy(() => import('./pages/VendorCreate'));
const CustomerCreate = lazy(() => import('./pages/CustomerCreate'));
const AccountCreate = lazy(() => import('./pages/AccountCreate'));
const JournalEntryCreate = lazy(() => import('./pages/JournalEntryCreate'));
const Banking = lazy(() => import('./pages/Banking'));
const Tax = lazy(() => import('./pages/Tax'));
const Reports = lazy(() => import('./pages/Reports'));
const Audit = lazy(() => import('./pages/Audit'));
const AI = lazy(() => import('./pages/AI'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Settings = lazy(() => import('./pages/Settings'));
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

export default function App() {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-12 h-12 bg-green rounded-lg flex items-center justify-center">
            <span className="font-bold text-lg">F</span>
          </div>
          <h1 className="text-xl font-bold">FINZI AI</h1>
          <p className="text-secondary-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
      <Route path="/register" element={<RequireGuest><Register /></RequireGuest>} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/create" element={<BillCreate />} />
        <Route path="bills/:id" element={<BillDetails />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/create" element={<InvoiceCreate />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="ledger/create" element={<JournalEntryCreate />} />
        <Route path="vendors/create" element={<VendorCreate />} />
        <Route path="customers/create" element={<CustomerCreate />} />
        <Route path="banking" element={<Banking />} />
        <Route path="tax" element={<Tax />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<Audit />} />
        <Route path="ai" element={<AI />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}


