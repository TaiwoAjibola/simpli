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
    <div className="p-8 bg-white min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#37352F] tracking-[-0.01em] mb-1">Goals</h1>
          <p className="text-sm text-[#787774]">{filteredGoals.length} of {goals.length} goals</p>
        </div>
        {canCreateGoal && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingGoal(null);
              setFormData({ name: '', description: '', appId: '', phaseId: '', startDate: '', endDate: '' });
            }}
            className="flex items-center gap-2 px-3 py-2 bg-[#2383E2] text-white font-medium hover:bg-[#1A6FC0] transition duration-150 rounded-[6px] text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={filterAppId}
          onChange={(e) => { setFilterAppId(e.target.value); setFilterPhaseId('all'); }}
          className="px-3 py-1.5 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
        >
          <option value="all">All Apps</option>
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
        <select
          value={filterPhaseId}
          onChange={(e) => setFilterPhaseId(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
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
          className="px-3 py-1.5 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
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
          className="px-3 py-1.5 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
        >
          <option value="all">All Work Types</option>
          <option value="development">Development</option>
          <option value="non-development">Non-development</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px]">
          <h3 className="font-semibold text-[#37352F] mb-4 text-sm">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-1.5">Goal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-1.5">App</label>
              <select
                value={formData.appId}
                onChange={(e) => { setFormData({ ...formData, appId: e.target.value, phaseId: '' }); }}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm cursor-pointer"
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
                <label className="block text-sm font-medium text-[#37352F] mb-1.5">Phase (optional)</label>
                <select
                  value={formData.phaseId}
                  onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm cursor-pointer"
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
                <label className="block text-sm font-medium text-[#37352F] mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#787774]" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#37352F] mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#787774]" />
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-[#2383E2] text-white font-medium hover:bg-[#1A6FC0] transition duration-150 rounded-[6px] text-sm cursor-pointer">
                {editingGoal ? 'Update' : 'Create'} Goal
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingGoal(null); setFormData({ name: '', description: '', appId: '', phaseId: '', startDate: '', endDate: '' }); }}
                className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] hover:bg-[#F7F7F5] transition duration-150 rounded-[6px] text-sm cursor-pointer"
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
              className="bg-white border border-[#E9E9E7] rounded-[8px] p-6 hover:bg-[#F7F7F5] transition duration-150"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-[#787774]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#37352F] text-[15px] leading-tight">{goal.name}</h3>
                    <p className="text-xs text-[#787774] mt-1">{app?.name}{phase && ` • ${phase.name}`}</p>
                    <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-[4px] border ${
                      deriveGoalStatus(goal, goalTasks) === 'completed'
                        ? 'text-[#0F7B6C] bg-[rgba(15,123,108,0.08)] border-[rgba(15,123,108,0.15)]'
                        : deriveGoalStatus(goal, goalTasks) === 'in_progress'
                        ? 'text-[#2383E2] bg-[rgba(35,131,226,0.08)] border-[rgba(35,131,226,0.15)]'
                        : deriveGoalStatus(goal, goalTasks) === 'on_hold'
                        ? 'text-[#787774] bg-[#F7F7F5] border-[#E9E9E7]'
                        : 'text-[#787774] bg-[#F7F7F5] border-[#E9E9E7]'
                    }`}>
                      {deriveGoalStatus(goal, goalTasks).replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canEditGoal && (
                    <button onClick={() => handleEdit(goal)} className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition duration-150 cursor-pointer" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canDeleteGoal && (
                    <button onClick={() => handleDelete(goal.id)} className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-[#F7F7F5] rounded-[6px] transition duration-150 cursor-pointer" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-[#787774] mb-4 leading-relaxed">{goal.description}</p>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#E9E9E7" strokeWidth="4" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#2383E2" strokeWidth="4"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round" transform="rotate(-90 32 32)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#37352F]">{progress}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#787774]">Task Completion</p>
                  <p className="text-xs text-[#9B9A97] mt-1">{completedTasks.length} of {goalTasks.length} tasks approved</p>
                </div>
              </div>

              <div className="text-center p-3 bg-white border border-[#E9E9E7] rounded-[6px]">
                <CheckSquare className="w-4 h-4 text-[#787774] mx-auto mb-1" />
                <p className="text-xs text-[#787774]">Tasks</p>
                <p className="text-lg font-semibold text-[#37352F]">{goalTasks.length}</p>
              </div>

              <div className="mt-3 border-t border-[#E9E9E7] pt-3">
                {(() => {
                  const goalExps = getAccumulatedExpectations(goal.id);
                  const achieved = goalExps.filter(e => e.status === 'achieved').length;
                  const missed = goalExps.filter(e => e.status === 'missed').length;
                  const isOpen = gateOpen.has(goal.id);
                  return (
                    <>
                      <button
                        onClick={() => toggleGate(goal.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] rounded-[6px] text-left hover:bg-[#F7F7F5] transition duration-150 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#787774]" />
                        <span className="text-sm font-medium text-[#37352F]">Gate Review</span>
                        {goalExps.length > 0 && (
                          <span className="ml-auto text-xs text-[#787774] whitespace-nowrap">
                            {achieved}/{goalExps.length} ✓
                            {missed > 0 && <span className="text-[#EB5757]"> · {missed} ✗</span>}
                          </span>
                        )}
                        <ChevronDownIcon className={`w-4 h-4 text-[#787774] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="mt-2 p-3 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] space-y-2">
                          {goalExps.length === 0 && (
                            <p className="text-sm text-[#787774] text-center py-2">
                              No gate items yet. Add expectations or link one to a task below.
                            </p>
                          )}
                          {goalExps.map(exp => {
                            const linkedTask = exp.taskId ? tasks.find(t => t.id === exp.taskId) : undefined;
                            return (
                              <div key={exp.id} className="relative flex items-start gap-2 p-2 bg-white border border-[#E9E9E7] rounded-[6px]">
                                <button
                                  onClick={() => updateExpectation(exp.id, { status: exp.status === 'achieved' ? 'pending' : 'achieved' })}
                                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition duration-150 cursor-pointer ${
                                    exp.status === 'achieved' ? 'bg-[#0F7B6C] border-[#0F7B6C] text-white' :
                                    exp.status === 'missed' ? 'bg-[#EB5757] border-[#EB5757] text-white' :
                                    'border-[#E0E0DE] hover:border-[#2383E2]'
                                  }`}
                                >
                                  {(exp.status === 'achieved' || exp.status === 'missed') && (
                                    exp.status === 'achieved' ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${exp.status === 'missed' ? 'text-[#EB5757] line-through' : 'text-[#37352F]'}`}>
                                    {exp.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {linkedTask ? (
                                      <span className="text-[10px] text-[#2383E2] flex items-center gap-0.5">
                                        <LinkIcon className="w-2.5 h-2.5" />
                                        {linkedTask.name}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-[#787774] flex items-center gap-0.5">
                                        <Target className="w-2.5 h-2.5" />
                                        Goal item
                                      </span>
                                    )}
                                    <span className={`text-[10px] px-1 rounded-[4px] ${
                                      exp.status === 'achieved' ? 'text-[#0F7B6C] bg-[rgba(15,123,108,0.08)]' :
                                      exp.status === 'missed' ? 'text-[#EB5757] bg-[rgba(235,87,87,0.08)]' : 'text-[#787774] bg-[#F7F7F5]'
                                    }`}>
                                      {exp.status}
                                    </span>
                                  </div>
                                </div>
                                {canManageGate && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={() => setLinkingExpId(linkingExpId === exp.id ? null : exp.id)}
                                      className={`p-1 rounded-[4px] ${exp.taskId ? 'text-[#2383E2]' : 'text-[#787774]'} hover:bg-[#F7F7F5] transition duration-150 cursor-pointer`}
                                    >
                                      <LinkIcon className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => updateExpectation(exp.id, { status: exp.status === 'missed' ? 'pending' : 'missed' })}
                                      className="p-1 text-[#787774] hover:text-[#EB5757] hover:bg-[#F7F7F5] rounded-[4px] transition duration-150 cursor-pointer"
                                    >
                                      <Flag className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteExpectation(exp.id)}
                                      className="p-1 text-[#787774] hover:text-[#EB5757] hover:bg-[#F7F7F5] rounded-[4px] transition duration-150 cursor-pointer"
                                    >
                                      <XCircle className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                {linkingExpId === exp.id && (
                                  <div className="absolute mt-6 right-0 z-10 w-56 p-2 bg-white border border-[#E9E9E7] rounded-[8px]">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs text-[#37352F] font-medium">Link to Task</span>
                                      <button onClick={() => setLinkingExpId(null)} className="text-xs text-[#787774] hover:text-[#37352F] cursor-pointer">Close</button>
                                    </div>
                                    <div className="max-h-28 overflow-y-auto space-y-0.5">
                                      {goalTasks.length > 0 ? goalTasks.map(t => (
                                        <button
                                          key={t.id}
                                          onClick={() => { updateExpectation(exp.id, { taskId: t.id }); setLinkingExpId(null); }}
                                          className="w-full text-left px-2 py-1 text-xs text-[#37352F] hover:bg-[#F7F7F5] rounded-[4px] flex items-center gap-1.5 transition duration-150 cursor-pointer"
                                        >
                                          <span className="truncate">{t.name}</span>
                                        </button>
                                      )) : <p className="text-xs text-[#787774] py-1">No tasks in this goal</p>}
                                    </div>
                                    {exp.taskId && (
                                      <button
                                        onClick={() => { updateExpectation(exp.id, { taskId: undefined as any }); setLinkingExpId(null); }}
                                        className="mt-1 flex items-center gap-1 text-[10px] text-[#EB5757] hover:underline cursor-pointer"
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
                              className="flex-1 px-2 py-1.5 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] text-xs rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addExpectationForGoal(goal.id, newExpText[goal.id] || '');
                              }}
                            />
                            {canManageGate && (
                              <button
                                onClick={() => addExpectationForGoal(goal.id, newExpText[goal.id] || '')}
                                disabled={!(newExpText[goal.id] || '').trim()}
                                className="px-2 py-1.5 bg-[#2383E2] text-white text-xs font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
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
