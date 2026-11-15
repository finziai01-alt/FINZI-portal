import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  authLogin, authRegister, authMe, authLogout, authVerifyOTP, authForgotPassword,
  authResetPassword, authSwitchCompany, getAuthToken, setAuthToken,
} from '../services/api';
import type { User, Company, AuthState } from '../types';

const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  verifyOTP: (token: string, type: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  checkAuth: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getAuthToken(),
    company: null,
    companies: [],
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setState({ ...state, isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const res = await authMe();
      const { user, token: newToken, company, companies, requiresVerification } = res.data;
      setAuthToken(newToken);
      setState({
        user,
        token: newToken,
        company,
        companies,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      setAuthToken(null);
      setState({ ...state, isLoading: false, isAuthenticated: false });
    }
  };

  const login = async (email: string, password: string) => {
    const res = await authLogin({ email, password });
    const { token, user, company, companies } = res.data;
    setAuthToken(token);
    setState({ user, token, company, companies, isAuthenticated: true, isLoading: false });
  };

  const register = async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    await authRegister(data);
  };

  const logout = async () => {
    try { await authLogout(); } catch {}
    setAuthToken(null);
    setState({ user: null, token: null, company: null, companies: [], isAuthenticated: false, isLoading: false });
  };

  const verifyOTP = async (token: string, type: string) => {
    await authVerifyOTP({ token, type });
  };

  const forgotPassword = async (email: string) => {
    await authForgotPassword({ email });
  };

  const resetPassword = async (token: string, password: string) => {
    await authResetPassword({ token, password });
  };

  const switchCompany = async (companyId: string) => {
    const res = await authSwitchCompany({ company_id: companyId });
    setAuthToken(res.data.token);
    setState({ ...state, company: res.data.company, token: res.data.token });
  };

  return (
    <AuthContext.Provider value={{ state, login, register, logout, verifyOTP, forgotPassword, resetPassword, switchCompany, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
