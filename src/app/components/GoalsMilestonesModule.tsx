import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Plus, Target, CheckSquare, Edit2, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Goal, WorkType } from '../types';
import { deriveGoalStatus, DerivedGoalStatus } from '../../utils/goalStatus';

export function GoalsModule() {
  const { hasPermission } = useAuth();
  const {
    goals,
    apps,
    phases,
    tasks,
    addGoal,
    updateGoal,
    deleteGoal,
    getAppById,
    getTasksForGoal
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Goals</h1>
          <p className="text-[#6b6b80]">{filteredGoals.length} of {goals.length} goals</p>
        </div>
        {canCreateGoal && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingGoal(null);
              setFormData({ name: '', description: '', appId: '', phaseId: '', startDate: '', endDate: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
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
          className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
        >
          <option value="all">All Apps</option>
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
        <select
          value={filterPhaseId}
          onChange={(e) => setFilterPhaseId(e.target.value)}
          className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
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
          className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
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
          className="px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm"
        >
          <option value="all">All Work Types</option>
          <option value="development">Development</option>
          <option value="non-development">Non-development</option>
        </select>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <h3 className="font-semibold text-[#f0f0f5] mb-4">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Goal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">App</label>
              <select
                value={formData.appId}
                onChange={(e) => { setFormData({ ...formData, appId: e.target.value, phaseId: '' }); }}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
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
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Phase (optional)</label>
                <select
                  value={formData.phaseId}
                  onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
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
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]">
                {editingGoal ? 'Update' : 'Create'} Goal
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingGoal(null); setFormData({ name: '', description: '', appId: '' }); }}
                className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
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
              className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6 hover:border-[rgba(0,229,255,0.3)] transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]">
                    <Target className="w-6 h-6 text-[#10b981]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#f0f0f5] text-lg">{goal.name}</h3>
                    <p className="text-sm text-[#6b6b80] mt-1">{app?.name}{phase && ` • ${phase.name}`}</p>
                    <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 ${
                      deriveGoalStatus(goal, goalTasks) === 'completed'
                        ? 'text-[#10b981] bg-[rgba(16,185,129,0.1)]'
                        : deriveGoalStatus(goal, goalTasks) === 'in_progress'
                        ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.1)]'
                        : deriveGoalStatus(goal, goalTasks) === 'on_hold'
                        ? 'text-[#ff3b5c] bg-[rgba(255,59,92,0.1)]'
                        : 'text-[#6b6b80] bg-[rgba(107,107,128,0.1)]'
                    }`}>
                      {deriveGoalStatus(goal, goalTasks).replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canEditGoal && (
                    <button onClick={() => handleEdit(goal)} className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition" title="Edit">
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

              <p className="text-sm text-[#6b6b80] mb-4">{goal.description}</p>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1e1e2a" strokeWidth="4" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="4"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round" transform="rotate(-90 32 32)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#f0f0f5]">{progress}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#6b6b80]">Task Completion</p>
                  <p className="text-xs text-[#6b6b80] mt-1">{completedTasks.length} of {goalTasks.length} tasks approved</p>
                </div>
              </div>

              <div className="text-center p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                <CheckSquare className="w-5 h-5 text-[#00e5ff] mx-auto mb-1" />
                <p className="text-xs text-[#6b6b80]">Tasks</p>
                <p className="text-lg font-bold text-[#f0f0f5]">{goalTasks.length}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
