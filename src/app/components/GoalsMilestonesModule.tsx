import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Plus, Target, CheckSquare, Edit2, Trash2, Calendar, ShieldCheck, CheckCircle, XCircle, Link as LinkIcon, Unlink, Flag, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Goal, WorkType } from '../types';
import { deriveGoalStatus, DerivedGoalStatus } from '../../utils/goalStatus';

export function GoalsModule() {
  const { hasPermission, currentUser } = useAuth();
  const {
    goals,
    apps,
    phases,
    tasks,
    addGoal,
    updateGoal,
    deleteGoal,
    getAppById,
    getTasksForGoal,
    expectations,
    addExpectation,
    updateExpectation,
    deleteExpectation,
    getExpectationsForGoal
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filterAppId, setFilterAppId] = useState<string>('all');
  const [filterPhaseId, setFilterPhaseId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | DerivedGoalStatus>('all');
  const [filterWorkType, setFilterWorkType] = useState<'all' | WorkType>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appId: '',
    phaseId: '',
    startDate: '',
    endDate: ''
  });
  const [gateOpen, setGateOpen] = useState<Set<string>>(new Set());
  const [newExpText, setNewExpText] = useState<Record<string, string>>({});
  const [linkingExpId, setLinkingExpId] = useState<string | null>(null);

  const canCreateGoal = hasPermission('create_goal');
  const canEditGoal = hasPermission('create_goal');
  const canDeleteGoal = hasPermission('create_goal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      updateGoal(editingGoal.id, {
        ...formData,
        phaseId: formData.phaseId || undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      });
    } else {
      addGoal({
        ...formData,
        phaseId: formData.phaseId || undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      });
    }
    setFormData({ name: '', description: '', appId: '', phaseId: '', startDate: '', endDate: '' });
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setFormData({
      name: goal.name,
      description: goal.description,
      appId: goal.appId,
      phaseId: goal.phaseId || '',
      startDate: goal.startDate ? format(goal.startDate, 'yyyy-MM-dd') : '',
      endDate: goal.endDate ? format(goal.endDate, 'yyyy-MM-dd') : ''
    });
    setEditingGoal(goal);
    setShowForm(true);
  };

  const filteredGoals = goals.filter(g => {
    if (filterAppId !== 'all' && g.appId !== filterAppId) return false;
    if (filterPhaseId !== 'all') {
      if (filterPhaseId === 'no-phase') return !g.phaseId;
      return g.phaseId === filterPhaseId;
    }
    const goalTasks = getTasksForGoal(g.id);
    if (filterStatus !== 'all' && deriveGoalStatus(g, goalTasks) !== filterStatus) return false;
    if (filterWorkType !== 'all') {
      const hasWork = goalTasks.length > 0;
      const matchesWorkType = goalTasks.some(t => (t.workType || 'non-development') === filterWorkType);
      if (!hasWork || !matchesWorkType) return false;
    }
    return true;
  });

  const filteredPhases = filterAppId !== 'all' ? phases.filter(p => p.appId === filterAppId) : phases;

  const handleDelete = (goalId: string) => {
    if (confirm('Delete this goal and all its tasks?')) {
      deleteGoal(goalId);
    }
  };

  const canManageGate = hasPermission('manage_modules');

  const getAccumulatedExpectations = (goalId: string) => {
    const goalExps = getExpectationsForGoal(goalId);
    const goalTaskIds = new Set(getTasksForGoal(goalId).map(t => t.id));
    const taskExps = expectations.filter(e => e.taskId && goalTaskIds.has(e.taskId));
    const seen = new Set<string>();
    return [...goalExps, ...taskExps].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  };

  const addExpectationForGoal = async (goalId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    await addExpectation({ goalId, description: text.trim(), status: 'pending', createdBy: currentUser.id });
    setNewExpText(prev => ({ ...prev, [goalId]: '' }));
  };

  const toggleGate = (goalId: string) => {
    setGateOpen(prev => {
      const next = new Set(prev);
      next.has(goalId) ? next.delete(goalId) : next.add(goalId);
      return next;
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F8FAFC] mb-2">Goals</h1>
          <p className="text-[#94A3B8]">{filteredGoals.length} of {goals.length} goals</p>
        </div>
        {canCreateGoal && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingGoal(null);
              setFormData({ name: '', description: '', appId: '', phaseId: '', startDate: '', endDate: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] transition"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterAppId}
          onChange={(e) => { setFilterAppId(e.target.value); setFilterPhaseId('all'); }}
          className="px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
        >
          <option value="all">All Apps</option>
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
        <select
          value={filterPhaseId}
          onChange={(e) => setFilterPhaseId(e.target.value)}
          className="px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
        >
          <option value="all">All Phases</option>
          <option value="no-phase">No Phase</option>
          {filteredPhases.map(phase => (
            <option key={phase.id} value={phase.id}>{phase.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | DerivedGoalStatus)}
          className="px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
        </select>
        <select
          value={filterWorkType}
          onChange={(e) => setFilterWorkType(e.target.value as 'all' | WorkType)}
          className="px-3 py-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
        >
          <option value="all">All Work Types</option>
          <option value="development">Development</option>
          <option value="non-development">Non-development</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
          <h3 className="font-semibold text-[#F8FAFC] mb-4">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Goal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">App</label>
              <select
                value={formData.appId}
                onChange={(e) => { setFormData({ ...formData, appId: e.target.value, phaseId: '' }); }}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                required
              >
                <option value="">Select app</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>

            {formData.appId && phases.filter(p => p.appId === formData.appId).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Phase (optional)</label>
                <select
                  value={formData.phaseId}
                  onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                >
                  <option value="">No phase</option>
                  {phases.filter(p => p.appId === formData.appId).map(phase => (
                    <option key={phase.id} value={phase.id}>{phase.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a]">
                {editingGoal ? 'Update' : 'Create'} Goal
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingGoal(null); setFormData({ name: '', description: '', appId: '' }); }}
                className="px-4 py-2 bg-[#1E293B] text-[#F8FAFC] border border-[rgba(34,197,94,0.1)] hover:bg-[#1E293B]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredGoals.map((goal) => {
          const app = getAppById(goal.appId);
          const phase = goal.phaseId ? phases.find(p => p.id === goal.phaseId) : null;
          const goalTasks = getTasksForGoal(goal.id);
          const completedTasks = goalTasks.filter((t) => t.status === 'approved');
          const progress = goalTasks.length > 0 ? Math.round((completedTasks.length / goalTasks.length) * 100) : 0;

          const circumference = 2 * Math.PI * 28;
          const strokeDashoffset = circumference - (progress / 100) * circumference;

          return (
            <div
              key={goal.id}
              className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6 hover:border-[rgba(34,197,94,0.3)] transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
                    <Target className="w-6 h-6 text-[#10b981]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#F8FAFC] text-lg">{goal.name}</h3>
                    <p className="text-sm text-[#94A3B8] mt-1">{app?.name}{phase && ` • ${phase.name}`}</p>
                    <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 ${
                      deriveGoalStatus(goal, goalTasks) === 'completed'
                        ? 'text-[#10b981] bg-[rgba(16,185,129,0.1)]'
                        : deriveGoalStatus(goal, goalTasks) === 'in_progress'
                        ? 'text-[#22C55E] bg-[rgba(34,197,94,0.1)]'
                        : deriveGoalStatus(goal, goalTasks) === 'on_hold'
                        ? 'text-[#ff3b5c] bg-[rgba(255,59,92,0.1)]'
                        : 'text-[#94A3B8] bg-[rgba(107,107,128,0.1)]'
                    }`}>
                      {deriveGoalStatus(goal, goalTasks).replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canEditGoal && (
                    <button onClick={() => handleEdit(goal)} className="p-2 text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)] transition" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canDeleteGoal && (
                    <button onClick={() => handleDelete(goal.id)} className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-[#94A3B8] mb-4">{goal.description}</p>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1E293B" strokeWidth="4" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="4"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round" transform="rotate(-90 32 32)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#F8FAFC]">{progress}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#94A3B8]">Task Completion</p>
                  <p className="text-xs text-[#94A3B8] mt-1">{completedTasks.length} of {goalTasks.length} tasks approved</p>
                </div>
              </div>

              <div className="text-center p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                <CheckSquare className="w-5 h-5 text-[#22C55E] mx-auto mb-1" />
                <p className="text-xs text-[#94A3B8]">Tasks</p>
                <p className="text-lg font-bold text-[#F8FAFC]">{goalTasks.length}</p>
              </div>

              <div className="mt-3 border-t border-[rgba(34,197,94,0.1)] pt-3">
                {(() => {
                  const goalExps = getAccumulatedExpectations(goal.id);
                  const achieved = goalExps.filter(e => e.status === 'achieved').length;
                  const missed = goalExps.filter(e => e.status === 'missed').length;
                  const isOpen = gateOpen.has(goal.id);
                  return (
                    <>
                      <button
                        onClick={() => toggleGate(goal.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-left hover:border-[rgba(34,197,94,0.3)] transition"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#8b5cf6]" />
                        <span className="text-sm font-medium text-[#F8FAFC]">Gate Review</span>
                        {goalExps.length > 0 && (
                          <span className="ml-auto text-xs text-[#94A3B8] whitespace-nowrap">
                            {achieved}/{goalExps.length} ✓
                            {missed > 0 && <span className="text-[#ff3b5c]"> · {missed} ✗</span>}
                          </span>
                        )}
                        <ChevronDownIcon className={`w-4 h-4 text-[#94A3B8] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="mt-2 p-3 bg-[#0F172A] border border-[rgba(139,92,246,0.2)] space-y-2">
                          {goalExps.length === 0 && (
                            <p className="text-sm text-[#94A3B8] text-center py-2">
                              No gate items yet. Add expectations or link one to a task below.
                            </p>
                          )}
                          {goalExps.map(exp => {
                            const linkedTask = exp.taskId ? tasks.find(t => t.id === exp.taskId) : undefined;
                            return (
                              <div key={exp.id} className="relative flex items-start gap-2 p-2 bg-[#1E293B] border border-[rgba(34,197,94,0.05)]">
                                <button
                                  onClick={() => updateExpectation(exp.id, { status: exp.status === 'achieved' ? 'pending' : 'achieved' })}
                                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    exp.status === 'achieved' ? 'bg-[#10b981] border-[#10b981] text-white' :
                                    exp.status === 'missed' ? 'bg-[#ff3b5c] border-[#ff3b5c] text-white' :
                                    'border-[#94A3B8] hover:border-[#22C55E]'
                                  }`}
                                >
                                  {(exp.status === 'achieved' || exp.status === 'missed') && (
                                    exp.status === 'achieved' ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${exp.status === 'missed' ? 'text-[#ff3b5c] line-through' : 'text-[#F8FAFC]'}`}>
                                    {exp.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {linkedTask ? (
                                      <span className="text-[10px] text-[#22C55E] flex items-center gap-0.5">
                                        <LinkIcon className="w-2.5 h-2.5" />
                                        {linkedTask.name}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-[#94A3B8] flex items-center gap-0.5">
                                        <Target className="w-2.5 h-2.5" />
                                        Goal item
                                      </span>
                                    )}
                                    <span className={`text-[10px] px-1 ${
                                      exp.status === 'achieved' ? 'text-[#10b981]' :
                                      exp.status === 'missed' ? 'text-[#ff3b5c]' : 'text-[#94A3B8]'
                                    }`}>
                                      {exp.status}
                                    </span>
                                  </div>
                                </div>
                                {canManageGate && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={() => setLinkingExpId(linkingExpId === exp.id ? null : exp.id)}
                                      className={`p-0.5 ${exp.taskId ? 'text-[#10b981]' : 'text-[#94A3B8]'} hover:text-[#22C55E]`}
                                    >
                                      <LinkIcon className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => updateExpectation(exp.id, { status: exp.status === 'missed' ? 'pending' : 'missed' })}
                                      className="p-0.5 text-[#94A3B8] hover:text-[#ff3b5c]"
                                    >
                                      <Flag className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteExpectation(exp.id)}
                                      className="p-0.5 text-[#94A3B8] hover:text-[#ff3b5c]"
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                {linkingExpId === exp.id && (
                                  <div className="absolute mt-6 right-0 z-10 w-56 p-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] shadow-lg">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs text-[#F8FAFC] font-medium">Link to Task</span>
                                      <button onClick={() => setLinkingExpId(null)} className="text-xs text-[#94A3B8]">Close</button>
                                    </div>
                                    <div className="max-h-28 overflow-y-auto space-y-0.5">
                                      {goalTasks.length > 0 ? goalTasks.map(t => (
                                        <button
                                          key={t.id}
                                          onClick={() => { updateExpectation(exp.id, { taskId: t.id }); setLinkingExpId(null); }}
                                          className="w-full text-left px-2 py-1 text-xs text-[#F8FAFC] hover:bg-[rgba(34,197,94,0.1)] rounded flex items-center gap-1.5"
                                        >
                                          <span className="truncate">{t.name}</span>
                                        </button>
                                      )) : <p className="text-xs text-[#94A3B8] py-1">No tasks in this goal</p>}
                                    </div>
                                    {exp.taskId && (
                                      <button
                                        onClick={() => { updateExpectation(exp.id, { taskId: undefined as any }); setLinkingExpId(null); }}
                                        className="mt-1 flex items-center gap-1 text-[10px] text-[#ff3b5c] hover:underline"
                                      >
                                        <Unlink className="w-2.5 h-2.5" /> Unlink
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          <div className="flex gap-1.5 pt-1">
                            <input
                              type="text"
                              value={newExpText[goal.id] || ''}
                              onChange={(e) => setNewExpText(prev => ({ ...prev, [goal.id]: e.target.value }))}
                              placeholder="Add a gate expectation for this goal..."
                              className="flex-1 px-2 py-1.5 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-xs outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addExpectationForGoal(goal.id, newExpText[goal.id] || '');
                              }}
                            />
                            {canManageGate && (
                              <button
                                onClick={() => addExpectationForGoal(goal.id, newExpText[goal.id] || '')}
                                disabled={!(newExpText[goal.id] || '').trim()}
                                className="px-2 py-1.5 bg-[#22C55E] text-[#020617] text-xs font-medium disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
