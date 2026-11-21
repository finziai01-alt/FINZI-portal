import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '../../context/AuthContext';

export const AppShell: React.FC = () => {
  const { state } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!state.isAuthenticated) return <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className={`flex flex-col transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        <TopNav />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
