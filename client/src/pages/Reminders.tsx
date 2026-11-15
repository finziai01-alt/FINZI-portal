import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { remindersList } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { AlertTriangle, Bell, Clock, Plus, Mail, Phone } from 'lucide-react';

export default function Reminders() {
  const { state } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await remindersList({ search });
      setReminders(res.data.reminders || []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reminders & Automation</h1>
          <p className="text-secondary-text">Set up automated reminders for compliance and follow-ups.</p>
        </div>
        <Button variant="green">
          <Plus size={16} /> New Reminder
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Total Reminders</div>
          <div className="text-2xl font-bold text-primary-text tnum">{reminders.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Due Today</div>
          <div className="text-2xl font-bold text-warning tnum">
            {reminders.filter(r => r.status === 'pending').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Overdue</div>
          <div className="text-2xl font-bold text-danger tnum">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Completed</div>
          <div className="text-2xl font-bold text-green tnum">
            {reminders.filter(r => r.status === 'completed').length}
          </div>
        </Card>
      </div>

      <div className="relative max-w-md mb-4">
        <SearchIcon size={16} className="absolute left-3 top-3 text-secondary-text" />
        <Input
          placeholder="Search reminders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Scheduled Reminders</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Priority</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-text">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-secondary-text">Loading...</td></tr>
                ) : reminders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-secondary-text">No reminders found</td>
                  </tr>
                ) : (
                  reminders.map((rem) => (
                    <tr key={rem.id} className="border-b border-border hover:bg-surface-container-low">
                      <td className="px-4 py-3 text-primary-text">{rem.title}</td>
                      <td className="px-4 py-3 text-xs text-secondary-text capitalize">{rem.category}</td>
                      <td className="px-4 py-3 text-xs text-secondary-text">{rem.due_date}</td>
                      <td className="px-4 py-3 text-xs text-secondary-text capitalize">{rem.priority}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={rem.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-secondary-text">
                        {rem.assigned_to || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const SearchIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21 -4.3-4.3" />
  </svg>
);



