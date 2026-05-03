import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Target, Flag, CheckSquare, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Goal, Milestone } from '../types';

export function GoalsModule() {
  const {
    goals,
    apps,
    milestones,
    tasks,
    addGoal,
    updateGoal,
    deleteGoal,
    getAppById,
    getMilestonesForGoal
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      updateGoal(editingGoal.id, formData);
    } else {
      addGoal(formData);
    }
    setFormData({ name: '', description: '', appId: '' });
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setFormData({
      name: goal.name,
      description: goal.description,
      appId: goal.appId
    });
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = (goalId: string) => {
    if (confirm('Delete this goal and all its milestones and tasks?')) {
      deleteGoal(goalId);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Goals</h1>
          <p className="text-[#6b6b80]">{goals.length} total goals</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingGoal(null);
            setFormData({ name: '', description: '', appId: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
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
                onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
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
        {goals.map((goal) => {
          const app = getAppById(goal.appId);
          const goalMilestones = getMilestonesForGoal(goal.id);
          const goalTasks = goalMilestones.flatMap((m) => tasks.filter((t) => t.milestoneId === m.id));
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
                    <p className="text-sm text-[#6b6b80] mt-1">{app?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(goal)} className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                  <Flag className="w-5 h-5 text-[#8b5cf6] mx-auto mb-1" />
                  <p className="text-xs text-[#6b6b80]">Milestones</p>
                  <p className="text-lg font-bold text-[#f0f0f5]">{goalMilestones.length}</p>
                </div>
                <div className="text-center p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                  <CheckSquare className="w-5 h-5 text-[#00e5ff] mx-auto mb-1" />
                  <p className="text-xs text-[#6b6b80]">Tasks</p>
                  <p className="text-lg font-bold text-[#f0f0f5]">{goalTasks.length}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MilestonesModule() {
  const {
    milestones,
    goals,
    tasks,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    getGoalById,
    getAppById,
    getTasksForMilestone
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    goalId: '',
    dueDate: '',
    status: 'not_started' as Milestone['status']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMilestone) {
      updateMilestone(editingMilestone.id, {
        name: formData.name,
        description: formData.description,
        goalId: formData.goalId,
        dueDate: new Date(formData.dueDate),
        status: formData.status
      });
    } else {
      addMilestone({
        name: formData.name,
        description: formData.description,
        goalId: formData.goalId,
        dueDate: new Date(formData.dueDate),
        status: 'not_started'
      });
    }
    setFormData({ name: '', description: '', goalId: '', dueDate: '', status: 'not_started' });
    setShowForm(false);
    setEditingMilestone(null);
  };

  const handleEdit = (milestone: Milestone) => {
    setFormData({
      name: milestone.name,
      description: milestone.description,
      goalId: milestone.goalId,
      dueDate: format(milestone.dueDate, 'yyyy-MM-dd'),
      status: milestone.status
    });
    setEditingMilestone(milestone);
    setShowForm(true);
  };

  const handleDelete = (milestoneId: string) => {
    if (confirm('Delete this milestone and all its tasks?')) {
      deleteMilestone(milestoneId);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Milestones</h1>
          <p className="text-[#6b6b80]">{milestones.length} total milestones</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingMilestone(null);
            setFormData({ name: '', description: '', goalId: '', dueDate: '', status: 'not_started' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
        >
          <Plus className="w-4 h-4" />
          New Milestone
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <h3 className="font-semibold text-[#f0f0f5] mb-4">
            {editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Milestone Name</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Goal</label>
                <select
                  value={formData.goalId}
                  onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select goal</option>
                  {goals.map((goal) => {
                    const app = getAppById(goal.appId);
                    return (
                      <option key={goal.id} value={goal.id}>
                        {app?.name} / {goal.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Milestone['status'] })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]">
                {editingMilestone ? 'Update' : 'Create'} Milestone
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingMilestone(null); setFormData({ name: '', description: '', goalId: '', dueDate: '', status: 'not_started' }); }}
                className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {milestones.map((milestone) => {
          const goal = getGoalById(milestone.goalId);
          const app = goal ? getAppById(goal.appId) : null;
          const milestoneTasks = getTasksForMilestone(milestone.id);
          const completedTasks = milestoneTasks.filter((t) => t.status === 'approved');
          const progress = milestoneTasks.length > 0 ? Math.round((completedTasks.length / milestoneTasks.length) * 100) : 0;

          const statusColors = {
            not_started: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80] border border-[rgba(107,107,128,0.2)]',
            in_progress: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.2)]',
            completed: 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)]'
          };

          const circumference = 2 * Math.PI * 24;
          const strokeDashoffset = circumference - (progress / 100) * circumference;

          return (
            <div
              key={milestone.id}
              className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-5 hover:border-[rgba(0,229,255,0.3)] transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)]">
                    <Flag className="w-5 h-5 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#f0f0f5]">{milestone.name}</h3>
                    <p className="text-xs text-[#6b6b80] mt-1">
                      {app?.name} → {goal?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(milestone)} className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(milestone.id)} className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-[#6b6b80] mb-3">{milestone.description}</p>

              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#1e1e2a" strokeWidth="3" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#00e5ff" strokeWidth="3"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round" transform="rotate(-90 28 28)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#f0f0f5]">{progress}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#6b6b80]">{completedTasks.length}/{milestoneTasks.length} tasks approved</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6b6b80]">Due Date</span>
                  <span className="font-medium text-[#f0f0f5]">
                    {format(milestone.dueDate, 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6b6b80]">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium ${statusColors[milestone.status]}`}>
                    {milestone.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
