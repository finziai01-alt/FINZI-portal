import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { notificationsList, notificationsRead } from '../../services/api';
import { cn } from '../../utils/cn';
import { CommandPalette } from './CommandPalette';
import { Dropdown, type MenuItem } from '../ui/Dropdown';

/**
 * The utility bar. Deliberately thin and quiet: it carries the command palette
 * trigger, the notification tray, and the company's GSTIN. Everything else a
 * page needs lives in that page's own header, so no screen pays for chrome it
 * does not use.
 */
export const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const [openPalette, setOpenPalette] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const unread = notifications.filter((n) => !n.is_read).length;

  // ⌘K / Ctrl+K opens the palette from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpenPalette(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let alive = true;
    notificationsList()
      .then((res) => {
        if (alive) setNotifications(res.data?.notifications || []);
      })
      .catch(() => {
        if (alive) setNotifications([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const markRead = async (id: string) => {
    try {
      await notificationsRead(id);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch {
      // Leave the tray as the server reported it; the next open re-reads state.
    }
  };

  const notificationMenu: MenuItem[] = notifications.slice(0, 8).map((n) => ({
    label: n.title,
    description: n.is_read ? n.message : `${n.message} · unread`,
    disabled: n.is_read ? 'Already read' : undefined,
    onSelect: () => markRead(n.id),
  }));

  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpenPalette(true)}
          className={cn(
            'group flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-2.5',
            'text-left transition-colors duration-micro ease-swift hover:border-line-strong',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 sm:max-w-sm'
          )}
        >
          <Search aria-hidden="true" className="size-3.5 shrink-0 text-ink-4" />
          <span className="min-w-0 flex-1 truncate text-[12px] leading-4 text-ink-3">
            Search invoices, bills, vendors, accounts
          </span>
          <kbd className="hidden shrink-0 rounded border border-line px-1 py-0.5 font-mono text-[9.5px] leading-none text-ink-4 sm:block">
            ⌘K
          </kbd>
        </button>

        <span className="ml-auto hidden shrink-0 lg:inline" />

        <Dropdown
          panelTitle="Notifications"
          width="w-80"
          items={notificationMenu.length ? notificationMenu : [{ label: 'No notifications.', disabled: 'Nothing new' }]}
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              onClick={() => {
                toggle();
              }}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              title="Notifications"
              className="relative grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors duration-micro hover:bg-sub hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
            >
              <Bell aria-hidden="true" className="size-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-error px-1 text-[9px] font-bold leading-none text-on-error tnum">
                  {unread}
                </span>
              )}
            </button>
          )}
        />
      </div>

      {openPalette && (
        <CommandPalette
          onClose={() => setOpenPalette(false)}
          onNavigate={(path) => {
            setOpenPalette(false);
            navigate(path);
          }}
        />
      )}
    </>
  );
};