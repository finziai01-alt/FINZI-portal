import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '../../context/AuthContext';

export const AppShell: React.FC = () => {
  const { state } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  if (!state.isAuthenticated) return <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      {!state.isLoading && (
        <>
          <Sidebar />
          <div className={`flex flex-col transition-all duration-300 ${
            sidebarOpen ? 'ml-[260px]' : 'ml-0'
          }`}>
            <TopNav />
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </>
      )}
    </div>
  );
};
