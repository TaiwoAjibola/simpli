import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Edit2,
  Trash2,
  Rocket,
  PauseCircle,
  CheckCircle2,
  Calendar,
  Target,
  CheckSquare,
  Bug,
  FileText,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Sprint, SprintStatus, WorkType } from '../types';
import { WorkItem, allWork } from '../../utils/work';

export function SprintsPage() {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const {
    apps,
    goals,
    tasks,
    actionPoints,
    defects,
    sprints,
    addSprint,
    updateSprint,
    deleteSprint,
    updateTask,
    updateActionPoint,
    updateDefect,
    getGoalById,
    getAppById
  } = useApp();

  const canManage = hasPermission('manage_sprints') || hasPermission('manage_goals');
  const [filterApp, setFilterApp] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    appId: '',
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
    status: 'planned' as SprintStatus
  });

  const goalAppId = (goalId?: string) => getGoalById(goalId)?.appId;
  const goalPhaseId = (goalId?: string) => getGoalById(goalId)?.phaseId;

  const workItems = useMemo(() => {
    return allWork(tasks, actionPoints, defects, goalAppId, goalPhaseId);
  }, [tasks, actionPoints, defects, goals]);

  const filteredSprints = sprints.filter(s => filterApp === 'all' || s.appId === filterApp);

  const resetForm = () => {
    setFormData({ appId: filterApp !== 'all' ? filterApp : '', name: '', goal: '', startDate: '', endDate: '', status: 'planned' });
    setEditingSprint(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!formData.appId || !formData.name.trim()) {
      showToast({ type: 'error', title: 'Missing fields', message: 'App and name are required.' });
      return;
    }
    const payload = {
      appId: formData.appId,
      name: formData.name.trim(),
      goal: formData.goal || undefined,
      startDate: formData.startDate ? parseISO(formData.startDate) : undefined,
      endDate: formData.endDate ? parseISO(formData.endDate) : undefined,
      status: formData.status,
      createdBy: currentUser.id
    };
    if (editingSprint) {
      await updateSprint(editingSprint.id, payload);
      showToast({ type: 'success', title: 'Sprint updated' });
    } else {
      await addSprint(payload);
      showToast({ type: 'success', title: 'Sprint created' });
    }
    resetForm();
  };

  const handleDelete = async (sprint: Sprint) => {
    await deleteSprint(sprint.id);
    showToast({ type: 'success', title: 'Sprint deleted' });
  };

  const handleStatusChange = (sprint: Sprint, status: SprintStatus) => {
    updateSprint(sprint.id, { status });
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const itemsForSprint = (sprintId: string) => workItems.filter(i => i.sprintId === sprintId);
  const unassignedItems = (appId: string) => workItems.filter(i => (i.appId || goalAppId(i.goalId)) === appId && !i.sprintId);

  const assignToSprint = async (item: WorkItem, sprintId: string) => {
    if (item.workKind === 'task') await updateTask(item.id, { sprintId });
    else if (item.workKind === 'action_point') await updateActionPoint(item.id, { sprintId });
    else await updateDefect(item.id, { sprintId });
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#f0f0f5] mb-1">Sprints</h1>
          <p className="text-sm text-[#6b6b80]">
            {sprints.length} sprints &middot; {sprints.filter(s => s.status === 'active').length} active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterApp}
            onChange={(e) => setFilterApp(e.target.value)}
            className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
          >
            <option value="all">All Apps</option>
            {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
          </select>
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium text-sm hover:bg-[#00d5ef] transition"
            >
              <Plus className="w-4 h-4" /> New Sprint
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-[#12121a] border border-[rgba(0,229,255,0.2)] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#f0f0f5]">
              {editingSprint ? 'Edit Sprint' : 'New Sprint'}
            </h2>
            <button onClick={resetForm} className="text-[#6b6b80] hover:text-[#f0f0f5]">✕</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">App</label>
              <select
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e0e16] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
              >
                <option value="">Select app</option>
                {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sprint 12 — Dashboard v2"
                className="w-full px-3 py-2 bg-[#0e0e16] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">Goal / Theme (optional)</label>
              <input
                type="text"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="Sprint objective"
                className="w-full px-3 py-2 bg-[#0e0e16] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">Start</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e0e16] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">End</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e0e16] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b6b80] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as SprintStatus })}
                className="w-full px-3 py-2 bg-[#0e0e16] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium text-sm hover:bg-[#00d5ef] transition"
            >
              {editingSprint ? 'Save Changes' : 'Create Sprint'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-[#6b6b80] hover:text-[#f0f0f5] text-sm border border-[rgba(255,255,255,0.1)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredSprints.length === 0 && (
          <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-12 text-center">
            <Rocket className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
            <p className="text-[#6b6b80]">No sprints yet. Create your first sprint to start planning work.</p>
          </div>
        )}

        {filteredSprints.map(sprint => {
          const app = getAppById(sprint.appId);
          const items = itemsForSprint(sprint.id);
          const isExpanded = !!expanded[sprint.id];
          const statusColor = sprint.status === 'active'
            ? 'text-[#10b981] bg-[rgba(16,185,129,0.1)]'
            : sprint.status === 'completed'
            ? 'text-[#6b6b80] bg-[rgba(107,107,128,0.1)]'
            : 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]';

          return (
            <div key={sprint.id} className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => toggleExpand(sprint.id)} className="flex items-center gap-2 text-left group">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-[#6b6b80]" /> : <ChevronRight className="w-5 h-5 text-[#6b6b80]" />}
                      <h2 className="text-lg font-semibold text-[#f0f0f5] group-hover:text-[#00e5ff] transition">
                        {sprint.name}
                      </h2>
                    </button>
                    <span className={`text-xs font-medium px-2 py-1 ${statusColor}`}>
                      {sprint.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#6b6b80] flex-wrap">
                    {app && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> {app.name}
                      </span>
                    )}
                    {sprint.goal && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" /> {sprint.goal}
                      </span>
                    )}
                    {(sprint.startDate || sprint.endDate) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {sprint.startDate ? format(sprint.startDate, 'MMM d') : '?'} → {sprint.endDate ? format(sprint.endDate, 'MMM d') : '?'}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5" /> {items.length} items
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select
                      value={sprint.status}
                      onChange={(e) => handleStatusChange(sprint, e.target.value as SprintStatus)}
                      className="text-xs bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] px-2 py-1"
                    >
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={() => { setEditingSprint(sprint); setFormData({
                        appId: sprint.appId,
                        name: sprint.name,
                        goal: sprint.goal || '',
                        startDate: sprint.startDate ? format(sprint.startDate, 'yyyy-MM-dd') : '',
                        endDate: sprint.endDate ? format(sprint.endDate, 'yyyy-MM-dd') : '',
                        status: sprint.status
                      }); setShowForm(true); }}
                      className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] rounded transition"
                      title="Edit sprint"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sprint)}
                      className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded transition"
                      title="Delete sprint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-[rgba(0,229,255,0.1)] p-5">
                  {items.length === 0 ? (
                    <div>
                      <p className="text-xs text-[#6b6b80] mb-3">No work assigned yet. Pick from unassigned work below.</p>
                      <UnassignedList
                        items={unassignedItems(sprint.appId)}
                        sprintId={sprint.id}
                        onAssign={assignToSprint}
                        emptyText="No unassigned work for this app."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        {items.map(item => (
                          <WorkRow key={`${item.workKind}-${item.id}`} item={item} onUnassign={() => assignToSprint(item, '')} />
                        ))}
                      </div>
                      <UnassignedList
                        items={unassignedItems(sprint.appId)}
                        sprintId={sprint.id}
                        onAssign={assignToSprint}
                        emptyText="No more unassigned work for this app."
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UnassignedList({ items, sprintId, onAssign, emptyText }: {
  items: WorkItem[];
  sprintId: string;
  onAssign: (item: WorkItem, sprintId: string) => void;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-[#6b6b80]">{emptyText}</p>;
  }
  return (
    <div>
      <p className="text-xs text-[#6b6b80] uppercase tracking-wider mb-2">Unassigned work for this app</p>
      <div className="border border-[rgba(0,229,255,0.1)] divide-y divide-[rgba(0,229,255,0.05)]">
        {items.slice(0, 15).map(item => (
          <div key={`${item.workKind}-${item.id}`} className="flex items-center gap-3 px-3 py-2">
            <span className={`text-xs font-medium px-2 py-0.5 ${item.workKind === 'defect' ? 'text-[#dc2626] bg-[rgba(220,38,38,0.1)]' : item.workKind === 'action_point' ? 'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]' : 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]'}`}>
              {item.workKind === 'defect' ? 'DEFECT' : item.workKind === 'action_point' ? 'AP' : 'TASK'}
            </span>
            <span className="flex-1 min-w-0 truncate text-sm text-[#f0f0f5]">{item.title}</span>
            {item.code && <span className="text-xs font-mono text-[#6b6b80]">{item.code}</span>}
            <button
              onClick={() => onAssign(item, sprintId)}
              className="text-xs px-2 py-1 text-[#00e5ff] border border-[rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.1)] transition flex-shrink-0"
            >
              Add
            </button>
          </div>
        ))}
      </div>
      {items.length > 15 && (
        <p className="text-xs text-[#6b6b80] mt-2">+{items.length - 15} more unassigned items</p>
      )}
    </div>
  );
}

function WorkRow({ item, onUnassign }: { item: WorkItem; onUnassign: () => void }) {
  const kindIcon = item.workKind === 'defect'
    ? <Bug className="w-4 h-4 text-[#dc2626] flex-shrink-0" />
    : item.workKind === 'action_point'
    ? <FileText className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
    : <CheckSquare className="w-4 h-4 text-[#00e5ff] flex-shrink-0" />;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#0e0e16] border border-[rgba(0,229,255,0.05)]">
      {kindIcon}
      <span className="flex-1 min-w-0 truncate text-sm text-[#f0f0f5]">{item.title}</span>
      {item.code && <span className="text-xs font-mono text-[#6b6b80]">{item.code}</span>}
      <span className="text-xs capitalize text-[#6b6b80]">{item.status.replace(/_/g, ' ')}</span>
      <button
        onClick={onUnassign}
        className="text-xs px-2 py-1 text-[#6b6b80] hover:text-[#ff3b5c] border border-[rgba(255,255,255,0.1)] transition flex-shrink-0"
        title="Remove from sprint"
      >
        Remove
      </button>
    </div>
  );
}
