import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle,
  Eye,
  RefreshCw,
  Download,
  Edit2,
  Trash2,
  Mail,
  GitPullRequest
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Defect, DefectSeverity, DefectStatus } from '../types';
import { DefectDetailModal } from './DefectDetailModal';
import { DefectCreateModal } from './DefectCreateModal';
import { DefectBulkCreateModal } from './DefectBulkCreateModal';

export function DefectDashboard() {
  const { apps, defects, employees, deleteDefect, sendDefectNotification } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [editDefect, setEditDefect] = useState<Defect | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const appDefects = defects.filter(d => d.applicationId === selectedAppId);

  const filteredDefects = useMemo(() => {
    return appDefects.filter(d => {
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      if (filterSeverity !== 'all' && d.severity !== filterSeverity) return false;
      if (filterAssignee !== 'all' && d.assignedTo !== filterAssignee) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          d.defectCode.toLowerCase().includes(q) ||
          d.module.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [appDefects, filterStatus, filterSeverity, filterAssignee, searchQuery]);

  const metrics = useMemo(() => {
    const total = appDefects.length;
    const open = appDefects.filter(d => d.status === 'open').length;
    const inProgress = appDefects.filter(d => d.status === 'in_progress').length;
    const pendingQA = appDefects.filter(d => d.status === 'pending_qa').length;
    const resolved = appDefects.filter(d => d.status === 'resolved').length;
    const closed = appDefects.filter(d => d.status === 'closed').length;
    const reopened = appDefects.filter(d => d.reopenedCount > 0).length;
    const blockers = appDefects.filter(d => d.severity === 'blocker' && d.status !== 'closed').length;
    const critical = appDefects.filter(d => d.severity === 'critical' && d.status !== 'closed').length;
    const verified = appDefects.filter(d => d.fixVerified).length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return { total, open, inProgress, pendingQA, resolved, closed, reopened, blockers, critical, verified, resolutionRate };
  }, [appDefects]);

  const severityDistribution = useMemo(() => {
    return {
      blocker: appDefects.filter(d => d.severity === 'blocker').length,
      critical: appDefects.filter(d => d.severity === 'critical').length,
      major: appDefects.filter(d => d.severity === 'major').length,
      minor: appDefects.filter(d => d.severity === 'minor').length
    };
  }, [appDefects]);

  const statusDistribution = useMemo(() => {
    return {
      open: appDefects.filter(d => d.status === 'open').length,
      in_progress: appDefects.filter(d => d.status === 'in_progress').length,
      pending_qa: appDefects.filter(d => d.status === 'pending_qa').length,
      resolved: appDefects.filter(d => d.status === 'resolved').length,
      closed: appDefects.filter(d => d.status === 'closed').length,
      reopened: appDefects.filter(d => d.status === 'reopened').length
    };
  }, [appDefects]);

  const severityColors: Record<DefectSeverity, string> = {
    blocker: 'bg-[#991b1b]',
    critical: 'bg-[#dc2626]',
    major: 'bg-[#f59e0b]',
    minor: 'bg-[#eab308]'
  };

  const statusColors: Record<DefectStatus, string> = {
    open: 'bg-[#dc2626]',
    in_progress: 'bg-[#f97316]',
    pending_qa: 'bg-[#8b5cf6]',
    resolved: 'bg-[#3b82f6]',
    closed: 'bg-[#10b981]',
    reopened: 'bg-[#7f1d1d]'
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unassigned';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">Defect Tracker</h1>
          <p className="text-[#94A3B8]">Track bugs, issues, and QA observations</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
          >
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>
          {hasPermission('report_defects') && (
            <>
              <button
                onClick={() => setShowBulkCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#22C55E] text-sm font-medium hover:bg-[rgba(34,197,94,0.05)]"
              >
                <Plus className="w-4 h-4" />
                Bulk Add
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a]"
              >
                <Plus className="w-4 h-4" />
                Report Defect
              </button>
            </>
          )}
        </div>
      </div>

      {!selectedAppId && (
        <div className="text-center py-12 bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
          <Bug className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#94A3B8]">Select an app to view defects</p>
        </div>
      )}

      {selectedAppId && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[rgba(220,38,38,0.1)]">
                  <Bug className="w-5 h-5 text-[#dc2626]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#F8FAFC]">{metrics.total}</p>
                  <p className="text-sm text-[#94A3B8]">Total Defects</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[rgba(249,115,22,0.1)]">
                  <Clock className="w-5 h-5 text-[#f97316]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#F8FAFC]">{metrics.open + metrics.inProgress}</p>
                  <p className="text-sm text-[#94A3B8]">Open Defects</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[rgba(16,185,129,0.1)]">
                  <CheckCircle className="w-5 h-5 text-[#10b981]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#F8FAFC]">{metrics.closed}</p>
                  <p className="text-sm text-[#94A3B8]">Resolved</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[rgba(139,92,246,0.1)]">
                  <TrendingUp className="w-5 h-5 text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#F8FAFC]">{metrics.resolutionRate}%</p>
                  <p className="text-sm text-[#94A3B8]">Resolution Rate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0F172A] border border-[rgba(153,27,27,0.2)] p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#991b1b]" />
                <div>
                  <p className="text-xl font-bold text-[#dc2626]">{metrics.blockers}</p>
                  <p className="text-sm text-[#94A3B8]">Blockers</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-[rgba(220,38,38,0.2)] p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#dc2626]" />
                <div>
                  <p className="text-xl font-bold text-[#dc2626]">{metrics.critical}</p>
                  <p className="text-sm text-[#94A3B8]">Critical</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-[rgba(139,92,246,0.2)] p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-[#8b5cf6]" />
                <div>
                  <p className="text-xl font-bold text-[#8b5cf6]">{metrics.pendingQA}</p>
                  <p className="text-sm text-[#94A3B8]">Pending QA</p>
                </div>
              </div>
            </div>
            <div className="bg-[#0F172A] border border-[rgba(239,68,68,0.2)] p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-[#ef4444]" />
                <div>
                  <p className="text-xl font-bold text-[#ef4444]">{metrics.reopened}</p>
                  <p className="text-sm text-[#94A3B8]">Reopened</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
              <h3 className="text-sm font-medium text-[#F8FAFC] mb-4">Severity Distribution</h3>
              <div className="space-y-3">
                {(['blocker', 'critical', 'major', 'minor'] as DefectSeverity[]).map(sev => {
                  const count = severityDistribution[sev];
                  const pct = appDefects.length > 0 ? (count / appDefects.length) * 100 : 0;
                  return (
                    <div key={sev}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#F8FAFC] capitalize">{sev}</span>
                        <span className="text-[#94A3B8]">{count}</span>
                      </div>
                      <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${severityColors[sev]} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
              <h3 className="text-sm font-medium text-[#F8FAFC] mb-4">Status Distribution</h3>
              <div className="space-y-3">
                {(['open', 'in_progress', 'pending_qa', 'resolved', 'closed'] as DefectStatus[]).map(status => {
                  const count = statusDistribution[status];
                  const pct = appDefects.length > 0 ? (count / appDefects.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#F8FAFC] capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-[#94A3B8]">{count}</span>
                      </div>
                      <div className="h-2 bg-[#1E293B] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${statusColors[status]} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] mb-6">
            <div className="p-4 border-b border-[rgba(34,197,94,0.1)]">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Search by ID, title, module..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_qa">Pending QA</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="reopened">Reopened</option>
                </select>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                >
                  <option value="all">All Severity</option>
                  <option value="blocker">Blocker</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
                >
                  <option value="all">All Assignees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(34,197,94,0.1)]">
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">ID</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Title</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Module</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Severity</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Assigned To</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Reporter</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Due Date</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Verified</th>
                    <th className="text-left py-3 px-4 text-[#94A3B8] font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefects.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-[#94A3B8]">
                        No defects found
                      </td>
                    </tr>
                  )}
                  {filteredDefects.map(defect => (
                    <tr key={defect.id} className="border-b border-[rgba(34,197,94,0.05)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-[#22C55E]">{defect.defectCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#F8FAFC] font-medium">{defect.title}</span>
                        {defect.github?.pullRequest?.prNumber && (
                          <span className={`ml-2 text-xs font-medium px-2 py-0.5 inline-flex items-center gap-1 ${
                            defect.github.pullRequest.state === 'merged'
                              ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]'
                              : defect.github.pullRequest.reviewState === 'approved' && defect.github.pullRequest.checkStatus === 'success'
                                ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                                : defect.github.pullRequest.reviewState === 'changes_requested' ||
                                  defect.github.pullRequest.checkStatus === 'failure'
                                  ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                                  : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                          }`}>
                            <GitPullRequest className="w-3 h-3" />
                            PR #{defect.github.pullRequest.prNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">{defect.module}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 ${severityColors[defect.severity]} text-white`}>
                          {defect.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 ${statusColors[defect.status]} text-white`}>
                          {defect.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#F8FAFC]">{getEmployeeName(defect.assignedTo)}</td>
                      <td className="py-3 px-4 text-[#94A3B8]">{getEmployeeName(defect.reportedBy)}</td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        {defect.dueDate ? defect.dueDate.toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {defect.fixVerified ? (
                          <CheckCircle className="w-4 h-4 text-[#10b981]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#94A3B8]" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedDefect(defect)}
                            className="p-1.5 text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)] rounded"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {hasPermission('manage_defects') && (
                            <>
                              <button
                                onClick={() => setEditDefect(defect)}
                                className="p-1.5 text-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] rounded"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await sendDefectNotification(defect.id);
                                  showToast({ type: 'success', title: 'Email Sent', message: `Notification sent for "${defect.defectCode}"` });
                                }}
                                className={`p-1.5 rounded ${
                                  defect.lastEmailSentAt
                                    ? 'text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)]'
                                    : 'text-[#10b981] hover:bg-[rgba(16,185,129,0.1)]'
                                }`}
                                title={defect.lastEmailSentAt ? 'Resend email' : 'Send email'}
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this defect?')) {
                                    deleteDefect(defect.id);
                                  }
                                }}
                                className="p-1.5 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedDefect && (
        <DefectDetailModal
          defect={selectedDefect}
          onClose={() => setSelectedDefect(null)}
        />
      )}

      {showBulkCreateModal && (
        <DefectBulkCreateModal
          onClose={() => setShowBulkCreateModal(false)}
          appId={selectedAppId}
        />
      )}

      {showCreateModal && (
        <DefectCreateModal
          onClose={() => setShowCreateModal(false)}
          appId={selectedAppId}
        />
      )}

      {editDefect && (
        <DefectCreateModal
          editDefect={editDefect}
          onClose={() => setEditDefect(null)}
        />
      )}
    </div>
  );
}
