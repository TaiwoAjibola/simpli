import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Edit2,
  Trash2,
  Rocket,
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
import { Sprint, SprintStatus } from '../types';
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

  const canManage = hasPermission('manage_sprints') || hasPermission('manage_goals') || hasPermission('view_all_apps');
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
    <div className="p-4 lg:p-8 bg-white min-h-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#37352F] tracking-[-0.01em] mb-1">Sprints</h1>
          <p className="text-sm text-[#787774]">
            {sprints.length} sprints · {sprints.filter(s => s.status === 'active').length} active
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterApp}
            onChange={(e) => setFilterApp(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
          >
            <option value="all">All Apps</option>
            {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
          </select>
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1A6FC0] transition duration-150 rounded-[6px] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Sprint
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#37352F]">
              {editingSprint ? 'Edit Sprint' : 'New Sprint'}
            </h2>
            <button onClick={resetForm} className="text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] p-1 rounded-[6px] transition duration-150 cursor-pointer">✕</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">App</label>
              <select
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="">Select app</option>
                {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sprint 12 — Dashboard v2"
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">Goal / Theme (optional)</label>
              <input
                type="text"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="Sprint objective"
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">Start</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">End</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as SprintStatus })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
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
              className="px-4 py-2 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1A6FC0] transition duration-150 rounded-[6px] cursor-pointer"
            >
              {editingSprint ? 'Save Changes' : 'Create Sprint'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-white text-[#37352F] hover:bg-[#F7F7F5] text-sm border border-[#E9E9E7] rounded-[6px] transition duration-150 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredSprints.length === 0 && (
          <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-12 text-center">
            <Rocket className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
            <p className="text-sm text-[#787774]">No sprints yet. Create your first sprint to start planning work.</p>
          </div>
        )}

        {filteredSprints.map(sprint => {
          const app = getAppById(sprint.appId);
          const items = itemsForSprint(sprint.id);
          const isExpanded = !!expanded[sprint.id];
          const statusColor = sprint.status === 'active'
            ? 'text-[#2383E2] bg-[rgba(35,131,226,0.08)] border-[rgba(35,131,226,0.15)]'
            : sprint.status === 'completed'
            ? 'text-[#787774] bg-[#F7F7F5] border-[#E9E9E7]'
            : 'text-[#787774] bg-[#F7F7F5] border-[#E9E9E7]';

          return (
            <div key={sprint.id} className="bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition duration-150">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => toggleExpand(sprint.id)} className="flex items-center gap-2 text-left group cursor-pointer">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
                      <h2 className="text-[15px] font-semibold text-[#37352F] group-hover:text-[#2383E2] transition duration-150">
                        {sprint.name}
                      </h2>
                    </button>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-[4px] border ${statusColor}`}>
                      {sprint.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#787774] flex-wrap">
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
                      className="text-xs bg-white border border-[#E0E0DE] text-[#37352F] px-2 py-1 rounded-[6px] focus:border-[#2383E2] focus:outline-none cursor-pointer"
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
                      className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white rounded-[6px] transition duration-150 cursor-pointer border border-transparent hover:border-[#E9E9E7]"
                      title="Edit sprint"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sprint)}
                      className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-white rounded-[6px] transition duration-150 cursor-pointer border border-transparent hover:border-[#E9E9E7]"
                      title="Delete sprint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-[#E9E9E7] p-5 bg-[#F7F7F5] rounded-b-[8px]">
                  {items.length === 0 ? (
                    <div>
                      <p className="text-xs text-[#787774] mb-3">No work assigned yet. Pick from unassigned work below.</p>
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
    return <p className="text-xs text-[#787774]">{emptyText}</p>;
  }
  return (
    <div>
      <p className="text-xs text-[#787774] uppercase tracking-wider mb-2 font-medium">Unassigned work for this app</p>
      <div className="border border-[#E9E9E7] rounded-[8px] overflow-hidden divide-y divide-[#E9E9E7] bg-white">
        {items.slice(0, 15).map(item => (
          <div key={`${item.workKind}-${item.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-[#F7F7F5] transition duration-150">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-[4px] border ${item.workKind === 'defect' ? 'text-[#EB5757] bg-[rgba(235,87,87,0.08)] border-[rgba(235,87,87,0.15)]' : item.workKind === 'action_point' ? 'text-[#787774] bg-[#F7F7F5] border-[#E9E9E7]' : 'text-[#2383E2] bg-[rgba(35,131,226,0.08)] border-[rgba(35,131,226,0.15)]'}`}>
              {item.workKind === 'defect' ? 'DEFECT' : item.workKind === 'action_point' ? 'AP' : 'TASK'}
            </span>
            <span className="flex-1 min-w-0 truncate text-sm text-[#37352F]">{item.title}</span>
            {item.code && <span className="text-xs font-mono text-[#787774]">{item.code}</span>}
            <button
              onClick={() => onAssign(item, sprintId)}
              className="text-xs px-2 py-1 text-[#2383E2] border border-[#E9E9E7] bg-white hover:bg-[#F7F7F5] rounded-[6px] transition duration-150 flex-shrink-0 cursor-pointer"
            >
              Add
            </button>
          </div>
        ))}
      </div>
      {items.length > 15 && (
        <p className="text-xs text-[#787774] mt-2">+{items.length - 15} more unassigned items</p>
      )}
    </div>
  );
}

function WorkRow({ item, onUnassign }: { item: WorkItem; onUnassign: () => void }) {
  const kindIcon = item.workKind === 'defect'
    ? <Bug className="w-4 h-4 text-[#EB5757] flex-shrink-0" />
    : item.workKind === 'action_point'
    ? <FileText className="w-4 h-4 text-[#787774] flex-shrink-0" />
    : <CheckSquare className="w-4 h-4 text-[#2383E2] flex-shrink-0" />;

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white border border-[#E9E9E7] rounded-[6px]">
      {kindIcon}
      <span className="flex-1 min-w-0 truncate text-sm text-[#37352F]">{item.title}</span>
      {item.code && <span className="text-xs font-mono text-[#787774]">{item.code}</span>}
      <span className="text-xs capitalize text-[#787774]">{item.status.replace(/_/g, ' ')}</span>
      <button
        onClick={onUnassign}
        className="text-xs px-2 py-1 text-[#787774] hover:text-[#37352F] border border-[#E9E9E7] bg-white hover:bg-[#F7F7F5] rounded-[6px] transition duration-150 flex-shrink-0 cursor-pointer"
        title="Remove from sprint"
      >
        Remove
      </button>
    </div>
  );
}
