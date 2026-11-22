import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '../../context/AuthContext';

const SIDEBAR_WIDTH = 248;
const SIDEBAR_COLLAPSED = 68;

/**
 * AppShell — the frame every authenticated screen sits in: the navigation rail,
 * the utility bar, and a page column that cross-fades on route change.
 *
 * The page transition is the surface's one motion moment; everything below it
 * is 120–220ms micro-transitions. It is dropped entirely under reduced motion.
 */
export const AppShell: React.FC = () => {
  const { state } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Every route enters from the top of its own scroll, not the previous page's.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  if (!state.isAuthenticated) return <Outlet />;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div
        style={{ paddingLeft: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH }}
        className="flex min-h-screen flex-col transition-[padding] duration-panel ease-swift"
      >
        <TopNav />

        <main className="animate-rise flex-1 px-4 py-5 lg:px-6" key={location.pathname}>
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};