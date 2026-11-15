import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditEngagementsList, auditEvidenceList, auditWorkingPapersList, auditObservationsList } from '../services/api';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Shield, FileCheck, BookOpen, AlertTriangle, FileText, Plus } from 'lucide-react';

export default function Audit() {
  const { state } = useAuth();
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eRes, evRes, wpRes, oRes] = await Promise.allSettled([
        auditEngagementsList(),
        auditEvidenceList(),
        auditWorkingPapersList(),
        auditObservationsList(),
      ]);
      if (eRes.status === 'fulfilled') setEngagements(eRes.value.data.engagements || []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Workspace</h1>
          <p className="text-secondary-text">Manage audit engagements, evidence and working papers.</p>
        </div>
        <Button variant="green">
          <Plus size={16} /> New Engagement
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Active Engagements</div>
          <div className="text-2xl font-bold text-primary-text tnum">{engagements.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Evidence Items</div>
          <div className="text-2xl font-bold text-primary-text tnum">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Working Papers</div>
          <div className="text-2xl font-bold text-primary-text tnum">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-secondary-text">Observations</div>
          <div className="text-2xl font-bold text-warning tnum">0</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Audit Engagements</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Engagement</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-text">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Start Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-text">Due Date</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-text">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="6" className="px-4 py-8 text-center text-secondary-text">Loading...</td></tr>
                    ) : engagements.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-secondary-text">No engagements found</td>
                      </tr>
                    ) : (
                      engagements.map((eng) => (
                        <tr key={eng.id} className="border-b border-border hover:bg-surface-container-low">
                          <td className="px-4 py-3 text-primary-text">{eng.engagement_name || 'Engagement'}</td>
                          <td className="px-4 py-3 text-xs text-secondary-text">{eng.client_name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-secondary-text capitalize">{eng.engagement_type || 'statutory'}</td>
                          <td className="px-4 py-3 text-right text-secondary-text tnum">{eng.start_date || '—'}</td>
                          <td className="px-4 py-3 text-right text-secondary-text tnum">{eng.end_date || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={eng.status || 'draft'} />
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

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Quick Actions</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-container-low">
                <Shield size={20} className="text-secondary-text" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-text">Create Engagement</p>
                  <p className="text-xs text-secondary-text">Start a new audit engagement</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-container-low">
                <FileCheck size={20} className="text-secondary-text" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-text">Upload Evidence</p>
                  <p className="text-xs text-secondary-text">Add audit evidence documents</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-container-low">
                <BookOpen size={20} className="text-secondary-text" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-text">Working Papers</p>
                  <p className="text-xs text-secondary-text">Prepare audit working papers</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-container-low">
                <AlertTriangle size={20} className="text-secondary-text" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-text">Observations</p>
                  <p className="text-xs text-secondary-text">Record audit observations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

