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
  GitPullRequest,
  LayoutGrid,
  List,
  GripVertical
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Defect, DefectSeverity, DefectStatus } from '../types';
import { DefectDetailModal } from './DefectDetailModal';
import { DefectCreateModal } from './DefectCreateModal';
import { DefectBulkCreateModal } from './DefectBulkCreateModal';
import { getWorkTargetStates } from '../../utils/workflow';

const DEFECT_BOARD_STATUSES: DefectStatus[] = ['open', 'in_progress', 'pending_qa', 'resolved', 'closed', 'reopened'];

const DEFECT_COLUMN_META: Record<DefectStatus, { label: string }> = {
  open: { label: 'Open' },
  in_progress: { label: 'In Progress' },
  pending_qa: { label: 'Pending QA' },
  resolved: { label: 'Resolved' },
  closed: { label: 'Closed' },
  reopened: { label: 'Reopened' }
};

export function DefectDashboard() {
  const { apps, defects, employees, deleteDefect, sendDefectNotification, updateDefect } = useApp();
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
  const [viewMode, setViewMode] = useState<'dashboard' | 'board'>('dashboard');
  const [dragDefectId, setDragDefectId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<DefectStatus | null>(null);
  const [dragValidTargets, setDragValidTargets] = useState<Set<DefectStatus>>(new Set());

  const appDefects = defects.filter(d => d.applicationId === selectedAppId);

  const handleDefectDragStart = (defect: Defect) => {
    const targets = getWorkTargetStates({
      kind: 'defect',
      currentStatus: defect.status,
      workType: defect.workType || 'development',
      can: hasPermission
    });
    setDragDefectId(defect.id);
    setDragValidTargets(new Set<DefectStatus>([defect.status, ...targets]));
  };

  const handleDefectDrop = async (defect: Defect, targetStatus: DefectStatus) => {
    setDragOverColumn(null);
    setDragDefectId(null);
    if (targetStatus === defect.status) return;
    if (!dragValidTargets.has(targetStatus)) {
      showToast({
        type: 'error',
        title: 'Move not allowed',
        message: `"${defect.defectCode}" can't move from ${defect.status.replace(/_/g, ' ')} to ${targetStatus.replace(/_/g, ' ')} for your role.`
      });
      return;
    }
    await updateDefect(defect.id, { status: targetStatus }, currentUser?.id, currentUser?.name);
    showToast({ type: 'success', title: 'Defect moved', message: `"${defect.defectCode}" → ${targetStatus.replace(/_/g, ' ')}` });
  };

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

  const severityBarColor: Record<DefectSeverity, string> = {
    blocker: 'bg-[#EB5757]',
    critical: 'bg-[#787774]',
    major: 'bg-[#9B9A97]',
    minor: 'bg-[#E9E9E7]'
  };

  const statusBarColor: Record<DefectStatus, string> = {
    open: 'bg-[#787774]',
    in_progress: 'bg-[#37352F]',
    pending_qa: 'bg-[#9B9A97]',
    resolved: 'bg-[#0F7B6C]',
    closed: 'bg-[#2383E2]',
    reopened: 'bg-[#EB5757]'
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unassigned';

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#37352F]">Defect Tracker</h1>
            <p className="text-[14px] text-[#787774] mt-1">Track bugs, issues, and QA observations</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedAppId && (
              <div className="flex items-center bg-white border border-[#E9E9E7] rounded-[6px] p-0.5">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 flex items-center gap-1.5 ${viewMode === 'dashboard' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
                >
                  <List className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] transition-colors duration-150 flex items-center gap-1.5 ${viewMode === 'board' ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Board
                </button>
              </div>
            )}
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
            >
              {apps.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
            {hasPermission('report_defects') && (
              <>
                <button
                  onClick={() => setShowBulkCreateModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E9E9E7] rounded-[6px] text-[#37352F] text-[14px] font-medium hover:bg-[#F7F7F5] transition-colors duration-150"
                >
                  <Plus className="w-4 h-4 text-[#787774]" />
                  Bulk Add
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150"
                >
                  <Plus className="w-4 h-4" />
                  Report Defect
                </button>
              </>
            )}
          </div>
        </div>

        {!selectedAppId && (
          <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
            <Bug className="w-12 h-12 text-[#9B9A97] mx-auto mb-3" />
            <p className="text-[14px] text-[#787774]">Select an app to view defects</p>
          </div>
        )}

        {selectedAppId && viewMode === 'board' && (
          <div className="flex gap-4 items-start pb-4 overflow-x-auto">
            {DEFECT_BOARD_STATUSES.map((status) => {
              const colDefects = appDefects.filter(d => d.status === status);
              const meta = DEFECT_COLUMN_META[status];
              const isValidTarget = !!dragDefectId && dragValidTargets.has(status);
              const isInvalidTarget = !!dragDefectId && !dragValidTargets.has(status);
              const isOver = dragOverColumn === status;
              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    if (!dragDefectId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = isValidTarget ? 'move' : 'none';
                    if (dragOverColumn !== status) setDragOverColumn(status);
                  }}
                  onDragLeave={() => setDragOverColumn(prev => (prev === status ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const def = appDefects.find(d => d.id === dragDefectId);
                    if (def) handleDefectDrop(def, status);
                  }}
                  className={`bg-[#F7F7F5] border rounded-[8px] p-3 flex flex-col w-[280px] flex-shrink-0 transition-colors duration-150 ${isOver && isValidTarget ? 'border-[#2383E2] bg-[#E8F0FE]' : 'border-[#E9E9E7]'} ${isInvalidTarget ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${statusBarColor[status]}`} />
                    <h3 className="font-semibold text-[#37352F] capitalize text-[12px] tracking-wide">{meta.label}</h3>
                    <span className="text-[12px] text-[#787774] font-normal ml-auto bg-white border border-[#E9E9E7] rounded-full px-2 py-0.5">{colDefects.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {colDefects.map(defect => {
                      const isDragging = dragDefectId === defect.id;
                      return (
                        <div
                          key={defect.id}
                          draggable
                          onDragStart={(e) => {
                            handleDefectDragStart(defect);
                            e.dataTransfer.effectAllowed = 'move';
                            try { e.dataTransfer.setData('text/plain', defect.id); } catch {}
                          }}
                          onDragEnd={() => { setDragDefectId(null); setDragOverColumn(null); }}
                          onClick={() => setSelectedDefect(defect)}
                          className={`bg-white border border-[#E9E9E7] rounded-[8px] p-3 cursor-grab active:cursor-grabbing hover:bg-[#F7F7F5] transition-colors duration-150 group ${isDragging ? 'opacity-40' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium text-[#37352F] leading-snug">{defect.title}</p>
                              <p className="text-[12px] text-[#787774] mt-0.5 truncate">{defect.defectCode} · {defect.module}</p>
                              <div className="flex items-center gap-1.5 mt-2">
                                <span className={`text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${defect.severity === 'blocker' ? 'bg-[#FBE9E9] text-[#EB5757] border-[#EB5757]/20' : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${defect.severity === 'blocker' ? 'bg-[#EB5757]' : defect.severity === 'critical' ? 'bg-[#37352F]' : 'bg-[#9B9A97]'}`} />
                                  {defect.severity}
                                </span>
                                {defect.fixVerified && <CheckCircle className="w-3.5 h-3.5 text-[#0F7B6C]" />}
                              </div>
                            </div>
                            <GripVertical className="w-3.5 h-3.5 text-[#9B9A97] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                          </div>
                        </div>
                      );
                    })}
                    {colDefects.length === 0 && (
                      <div className={`text-[12px] text-[#9B9A97] text-center py-4 border-2 border-dashed rounded-[8px] transition-colors duration-150 ${isOver && isValidTarget ? 'border-[#2383E2] text-[#2383E2]' : 'border-transparent'}`}>
                        {dragDefectId && isValidTarget ? 'Drop here' : 'No defects'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedAppId && viewMode === 'dashboard' && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                    <Bug className="w-5 h-5 text-[#787774]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#37352F] leading-none">{metrics.total}</p>
                    <p className="text-[12px] text-[#787774] mt-1">Total Defects</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                    <Clock className="w-5 h-5 text-[#787774]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#37352F] leading-none">{metrics.open + metrics.inProgress}</p>
                    <p className="text-[12px] text-[#787774] mt-1">Open Defects</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                    <CheckCircle className="w-5 h-5 text-[#0F7B6C]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#37352F] leading-none">{metrics.closed}</p>
                    <p className="text-[12px] text-[#787774] mt-1">Resolved</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                    <TrendingUp className="w-5 h-5 text-[#2383E2]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#37352F] leading-none">{metrics.resolutionRate}%</p>
                    <p className="text-[12px] text-[#787774] mt-1">Resolution Rate</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#FBE9E9] rounded-[6px]">
                    <AlertTriangle className="w-4 h-4 text-[#EB5757]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#EB5757] leading-none">{metrics.blockers}</p>
                    <p className="text-[12px] text-[#787774] mt-1">Blockers</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                    <AlertTriangle className="w-4 h-4 text-[#787774]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#37352F] leading-none">{metrics.critical}</p>
                    <p className="text-[12px] text-[#787774] mt-1">Critical</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                    <RefreshCw className="w-4 h-4 text-[#787774]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#37352F] leading-none">{metrics.pendingQA}</p>
                    <p className="text-[12px] text-[#787774] mt-1">Pending QA</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                    <XCircle className="w-4 h-4 text-[#787774]" />
                  </div>
                  <div>
                    <p className="text-[20px] font-semibold text-[#37352F] leading-none">{metrics.reopened}</p>
                    <p className="text-[12px] text-[#787774] mt-1">Reopened</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <h3 className="text-[14px] font-semibold text-[#37352F] mb-4">Severity Distribution</h3>
                <div className="space-y-3">
                  {(['blocker', 'critical', 'major', 'minor'] as DefectSeverity[]).map(sev => {
                    const count = severityDistribution[sev];
                    const pct = appDefects.length > 0 ? (count / appDefects.length) * 100 : 0;
                    return (
                      <div key={sev}>
                        <div className="flex items-center justify-between text-[14px] mb-1">
                          <span className="text-[#37352F] capitalize">{sev}</span>
                          <span className="text-[#787774] text-[12px]">{count}</span>
                        </div>
                        <div className="h-2 bg-[#F7F7F5] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${severityBarColor[sev]} transition-all duration-150`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                <h3 className="text-[14px] font-semibold text-[#37352F] mb-4">Status Distribution</h3>
                <div className="space-y-3">
                  {(['open', 'in_progress', 'pending_qa', 'resolved', 'closed'] as DefectStatus[]).map(status => {
                    const count = statusDistribution[status];
                    const pct = appDefects.length > 0 ? (count / appDefects.length) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-[14px] mb-1">
                          <span className="text-[#37352F] capitalize">{status.replace('_', ' ')}</span>
                          <span className="text-[#787774] text-[12px]">{count}</span>
                        </div>
                        <div className="h-2 bg-[#F7F7F5] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${statusBarColor[status]} transition-all duration-150`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden mb-6">
              <div className="p-4 border-b border-[#E9E9E7]">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                    <input
                      type="text"
                      placeholder="Search by ID, title, module..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
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
                    className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
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
                    className="px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] focus:border-[#2383E2] focus:outline-none"
                  >
                    <option value="all">All Assignees</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="border-b border-[#E9E9E7]">
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">ID</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Title</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Module</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Severity</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Status</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Assigned To</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Reporter</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Due Date</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Verified</th>
                      <th className="text-left py-3 px-4 text-[#787774] font-medium text-[12px] uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDefects.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-[#787774] text-[14px]">
                          No defects found
                        </td>
                      </tr>
                    )}
                    {filteredDefects.map(defect => (
                      <tr key={defect.id} className="border-b border-[#E9E9E7] hover:bg-[#F7F7F5] transition-colors duration-150">
                        <td className="py-3 px-4">
                          <span className="font-mono text-[12px] text-[#2383E2]">{defect.defectCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[#37352F] font-medium text-[14px]">{defect.title}</span>
                          {defect.github?.pullRequest?.prNumber && (
                            <span className="ml-2 text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] inline-flex items-center gap-1">
                              <GitPullRequest className="w-3 h-3" />
                              PR #{defect.github.pullRequest.prNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#787774] text-[14px]">{defect.module}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[12px] px-2 py-1 rounded-full border inline-flex items-center gap-1.5 ${defect.severity === 'blocker' ? 'bg-[#FBE9E9] text-[#EB5757] border-[#EB5757]/20' : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${defect.severity === 'blocker' ? 'bg-[#EB5757]' : defect.severity === 'critical' ? 'bg-[#37352F]' : 'bg-[#9B9A97]'}`} />
                            {defect.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[12px] px-2 py-1 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] capitalize inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9B9A97]" />
                            {defect.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#37352F] text-[14px]">{getEmployeeName(defect.assignedTo)}</td>
                        <td className="py-3 px-4 text-[#787774] text-[14px]">{getEmployeeName(defect.reportedBy)}</td>
                        <td className="py-3 px-4 text-[#787774] text-[14px]">
                          {defect.dueDate ? defect.dueDate.toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {defect.fixVerified ? (
                            <CheckCircle className="w-4 h-4 text-[#0F7B6C]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#9B9A97]" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedDefect(defect)}
                              className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {hasPermission('manage_defects') && (
                              <>
                                <button
                                  onClick={() => setEditDefect(defect)}
                                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
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
                                  className={`p-1.5 rounded-[6px] border border-transparent transition-colors duration-150 ${defect.lastEmailSentAt ? 'text-[#2383E2] hover:bg-white hover:border-[#E9E9E7]' : 'text-[#787774] hover:text-[#37352F] hover:bg-white hover:border-[#E9E9E7]'}`}
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
                                  className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150"
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
    </div>
  );
}
