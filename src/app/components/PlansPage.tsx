import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Edit2,
  Trash2,
  NotebookText,
  Calendar,
  Target,
  CheckSquare,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { MonthlyPlan, MonthlyPlanStatus } from '../types';
import {
  currentMonthKey,
  monthLabel,
  monthRange,
  defaultPlanName,
  planProgress,
  sortPlans
} from '../../utils/plans';
import { deriveGoalStatus } from '../../utils/goalStatus';

const STATUS_STYLES: Record<MonthlyPlanStatus, string> = {
  active: 'text-[#2383E2] bg-[rgba(35,131,226,0.08)] border-[rgba(35,131,226,0.15)]',
  planned: 'text-[#787774] bg-[#F7F7F5] border-[#E9E9E7]',
  completed: 'text-[#0F7B6C] bg-[rgba(15,123,108,0.08)] border-[rgba(15,123,108,0.15)]'
};

export function PlansPage() {
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const {
    apps,
    goals,
    tasks,
    monthlyPlans,
    addMonthlyPlan,
    updateMonthlyPlan,
    deleteMonthlyPlan,
    getAppById,
    getEmployeeById
  } = useApp();

  const canManage = hasPermission('manage_sprints') || hasPermission('create_goal') || hasPermission('view_all_apps');

  const [filterApp, setFilterApp] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MonthlyPlan | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    month: currentMonthKey(),
    appId: '',
    objective: '',
    status: 'planned' as MonthlyPlanStatus
  });

  const visiblePlans = useMemo(() => {
    const filtered = monthlyPlans.filter(p =>
      (filterApp === 'all' || p.appId === filterApp) &&
      (filterStatus === 'all' || p.status === filterStatus)
    );
    return sortPlans(filtered);
  }, [monthlyPlans, filterApp, filterStatus]);

  const activeCount = monthlyPlans.filter(p => p.status === 'active').length;

  const resetForm = () => {
    setFormData({ name: '', month: currentMonthKey(), appId: filterApp !== 'all' ? filterApp : '', objective: '', status: 'planned' });
    setEditingPlan(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setFormData({
      name: defaultPlanName(currentMonthKey()),
      month: currentMonthKey(),
      appId: filterApp !== 'all' ? filterApp : '',
      objective: '',
      status: 'planned'
    });
    setEditingPlan(null);
    setShowForm(true);
  };

  const openEdit = (plan: MonthlyPlan) => {
    setFormData({
      name: plan.name,
      month: plan.month,
      appId: plan.appId || '',
      objective: plan.objective || '',
      status: plan.status
    });
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!formData.month) {
      showToast({ type: 'error', title: 'Missing month', message: 'Pick the month this plan covers.' });
      return;
    }
    const payload = {
      name: (formData.name.trim() || defaultPlanName(formData.month)),
      month: formData.month,
      appId: formData.appId || undefined,
      objective: formData.objective.trim() || undefined,
      status: formData.status,
      createdBy: currentUser.id
    };
    if (editingPlan) {
      await updateMonthlyPlan(editingPlan.id, payload);
      showToast({ type: 'success', title: 'Plan updated' });
    } else {
      await addMonthlyPlan(payload);
      showToast({ type: 'success', title: 'Plan created', message: 'Attach goals and tasks to it from their forms.' });
    }
    resetForm();
  };

  const handleDelete = async (plan: MonthlyPlan) => {
    if (!confirm(`Delete "${plan.name}"? Attached goals and tasks are kept but unlinked from this plan.`)) return;
    await deleteMonthlyPlan(plan.id);
    showToast({ type: 'success', title: 'Plan deleted' });
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const goalsForPlan = (planId: string) => goals.filter(g => g.planId === planId);
  const tasksForPlan = (plan: MonthlyPlan) => {
    const planGoalIds = new Set(goalsForPlan(plan.id).map(g => g.id));
    return tasks.filter(t => t.planId === plan.id || (t.goalId && planGoalIds.has(t.goalId)));
  };

  return (
    <div className="p-4 lg:p-8 bg-white min-h-full" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#37352F] tracking-[-0.01em] mb-1">Monthly Plans</h1>
          <p className="text-sm text-[#787774]">
            {monthlyPlans.length} plans · {activeCount} active — plans drive the goals and tasks for each month
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="planned">Planned</option>
            <option value="completed">Completed</option>
          </select>
          {canManage && (
            <button
              onClick={() => (showForm && !editingPlan ? resetForm() : openCreate())}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1A6FC0] transition duration-150 rounded-[6px] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Plan
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#37352F]">
              {editingPlan ? 'Edit Monthly Plan' : 'New Monthly Plan'}
            </h2>
            <button onClick={resetForm} className="text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] p-1 rounded-[6px] transition duration-150 cursor-pointer">✕</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">Month</label>
              <input
                type="month"
                value={formData.month}
                onChange={(e) => {
                  const month = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    month,
                    name: !editingPlan && (!prev.name || prev.name === defaultPlanName(prev.month)) ? defaultPlanName(month) : prev.name
                  }));
                }}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={defaultPlanName(formData.month)}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">App (optional)</label>
              <select
                value={formData.appId}
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="">Company-wide</option>
                {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-[#37352F] mb-1">Objective</label>
              <input
                type="text"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="What should be achieved this month?"
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#37352F] mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as MonthlyPlanStatus })}
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
              {editingPlan ? 'Save Changes' : 'Create Plan'}
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
        {visiblePlans.length === 0 && (
          <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-12 text-center">
            <NotebookText className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
            <p className="text-sm text-[#787774]">
              No monthly plans yet. Create a plan for {monthLabel(currentMonthKey())} to start organizing goals and tasks.
            </p>
          </div>
        )}

        {visiblePlans.map(plan => {
          const app = plan.appId ? getAppById(plan.appId) : null;
          const progress = planProgress(plan, goals, tasks);
          const planGoals = goalsForPlan(plan.id);
          const planTasks = tasksForPlan(plan);
          const isExpanded = !!expanded[plan.id];
          const range = monthRange(plan.month);
          const isCurrentMonth = plan.month === currentMonthKey();

          return (
            <div key={plan.id} className="bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition duration-150">
              <div className="flex items-start justify-between gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => toggleExpand(plan.id)} className="flex items-center gap-2 text-left group cursor-pointer">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
                      <h2 className="text-[15px] font-semibold text-[#37352F] group-hover:text-[#2383E2] transition duration-150">
                        {plan.name}
                      </h2>
                    </button>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-[4px] border ${STATUS_STYLES[plan.status]}`}>
                      {plan.status.toUpperCase()}
                    </span>
                    {isCurrentMonth && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-[4px] border text-[#37352F] bg-[#E9E9E7] border-[#E9E9E7]">
                        THIS MONTH
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#787774] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {monthLabel(plan.month)}
                      {range ? ` (${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d')})` : ''}
                    </span>
                    {app && (
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> {app.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> {progress.goalsTotal} goals
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5" /> {progress.tasksTotal} tasks
                    </span>
                  </div>
                  {plan.objective && (
                    <p className="text-sm text-[#787774] mt-2 leading-relaxed">{plan.objective}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 max-w-md">
                    <div className="flex-1 h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${progress.percent >= 100 ? 'bg-[#0F7B6C]' : 'bg-[#2383E2]'}`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-[#37352F] whitespace-nowrap">
                      {progress.percent}% · {progress.tasksDone}/{progress.tasksTotal} tasks done
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select
                      value={plan.status}
                      onChange={(e) => updateMonthlyPlan(plan.id, { status: e.target.value as MonthlyPlanStatus })}
                      className="text-xs bg-white border border-[#E0E0DE] text-[#37352F] px-2 py-1 rounded-[6px] focus:border-[#2383E2] focus:outline-none cursor-pointer"
                    >
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button
                      onClick={() => openEdit(plan)}
                      className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white rounded-[6px] transition duration-150 cursor-pointer border border-transparent hover:border-[#E9E9E7]"
                      title="Edit plan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-white rounded-[6px] transition duration-150 cursor-pointer border border-transparent hover:border-[#E9E9E7]"
                      title="Delete plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-[#E9E9E7] p-5 bg-[#F7F7F5] rounded-b-[8px]">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-[#787774] uppercase tracking-wider mb-2 font-medium">Goals in this plan ({planGoals.length})</p>
                      {planGoals.length === 0 ? (
                        <p className="text-xs text-[#787774]">No goals attached. Attach goals from the Goals form (Monthly Plan field).</p>
                      ) : (
                        <div className="border border-[#E9E9E7] rounded-[8px] overflow-hidden divide-y divide-[#E9E9E7] bg-white">
                          {planGoals.map(goal => {
                            const goalTasks = tasks.filter(t => t.goalId === goal.id);
                            const status = deriveGoalStatus(goal, goalTasks);
                            return (
                              <div key={goal.id} className="flex items-center gap-3 px-3 py-2">
                                <Target className="w-4 h-4 text-[#787774] flex-shrink-0" />
                                <span className="flex-1 min-w-0 truncate text-sm text-[#37352F]">{goal.name}</span>
                                <span className="text-xs text-[#787774]">{goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length}/{goalTasks.length} tasks</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-[4px] border ${status === 'completed' ? 'text-[#0F7B6C] bg-[rgba(15,123,108,0.08)] border-[rgba(15,123,108,0.15)]' : status === 'in_progress' ? 'text-[#2383E2] bg-[rgba(35,131,226,0.08)] border-[rgba(35,131,226,0.15)]' : 'text-[#787774] bg-[#F7F7F5] border-[#E9E9E7]'}`}>
                                  {status.replace(/_/g, ' ')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-[#787774] uppercase tracking-wider mb-2 font-medium">Tasks in this plan ({planTasks.length})</p>
                      {planTasks.length === 0 ? (
                        <p className="text-xs text-[#787774]">No tasks attached. Attach tasks directly or via a goal.</p>
                      ) : (
                        <div className="border border-[#E9E9E7] rounded-[8px] overflow-hidden divide-y divide-[#E9E9E7] bg-white max-h-72 overflow-y-auto">
                          {planTasks.map(task => {
                            const assigneeNames = (task.assignedTo || []).map(id => getEmployeeById(id)?.name).filter(Boolean).join(', ');
                            return (
                              <div key={task.id} className="flex items-center gap-3 px-3 py-2">
                                <CheckSquare className="w-4 h-4 text-[#2383E2] flex-shrink-0" />
                                <span className="flex-1 min-w-0 truncate text-sm text-[#37352F]">{task.name}</span>
                                {assigneeNames && <span className="text-xs text-[#787774] hidden sm:inline">{assigneeNames}</span>}
                                <span className="text-xs capitalize text-[#787774]">{task.status.replace(/_/g, ' ')}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
