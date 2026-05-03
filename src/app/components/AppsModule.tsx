import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Plus, Layers, Target, CheckSquare, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { App } from '../types';

export function AppsModule() {
  const { currentUser } = useAuth();
  const { apps, goals, tasks, addApp, updateApp, deleteApp, getGoalsForApp, getTasksForGoal } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'completed' | 'on_hold'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingApp) {
      updateApp(editingApp.id, formData);
    } else {
      addApp({
        ...formData,
        createdBy: currentUser!.id
      });
    }
    setFormData({ name: '', description: '', status: 'active' });
    setShowForm(false);
    setEditingApp(null);
  };

  const handleEdit = (app: App) => {
    setFormData({
      name: app.name,
      description: app.description,
      status: app.status
    });
    setEditingApp(app);
    setShowForm(true);
  };

  const handleDelete = (appId: string) => {
    if (confirm('Delete this app and all its goals and tasks?')) {
      deleteApp(appId);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Apps</h1>
          <p className="text-[#6b6b80]">{apps.length} total applications</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingApp(null);
            setFormData({ name: '', description: '', status: 'active' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
        >
          <Plus className="w-4 h-4" />
          New App
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <h3 className="font-semibold text-[#f0f0f5] mb-4">
            {editingApp ? 'Edit App' : 'Create New App'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">App Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                placeholder="e.g., Biops"
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
                placeholder="What is this app about?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'active' | 'completed' | 'on_hold'
                  })
                }
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
              >
                {editingApp ? 'Update' : 'Create'} App
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingApp(null);
                  setFormData({ name: '', description: '', status: 'active' });
                }}
                className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {apps.map((app) => {
          const appGoals = getGoalsForApp(app.id);
          const appTasks = appGoals.flatMap((g) => getTasksForGoal(g.id));

          const completedTasks = appTasks.filter((t) => t.status === 'approved');
          const progress =
            appTasks.length > 0
              ? Math.round((completedTasks.length / appTasks.length) * 100)
              : 0;

          const statusColors = {
            active: 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)]',
            on_hold: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
            completed: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.2)]'
          };

          const circumference = 2 * Math.PI * 28;
          const strokeDashoffset = circumference - (progress / 100) * circumference;

          return (
            <div
              key={app.id}
              className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6 hover:border-[rgba(0,229,255,0.3)] transition relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5" style={{ background: 'radial-gradient(circle, #00e5ff 0%, transparent 70%)' }}></div>

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.2)]">
                    <Layers className="w-6 h-6 text-[#00e5ff]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#f0f0f5] text-lg">{app.name}</h3>
                    <p className="text-sm text-[#6b6b80] mt-1">
                      Created {format(app.createdAt, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-medium ${
                      statusColors[app.status]
                    }`}
                  >
                    {app.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleEdit(app)}
                    className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-[#6b6b80] mb-4">{app.description}</p>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1e1e2a" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="28" fill="none" stroke="#00e5ff" strokeWidth="4"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round" transform="rotate(-90 32 32)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#f0f0f5]">{progress}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#6b6b80]">Task Completion</p>
                  <p className="text-xs text-[#6b6b80] mt-1">{completedTasks.length} of {appTasks.length} tasks approved</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                  <Target className="w-5 h-5 text-[#00e5ff] mx-auto mb-1" />
                  <p className="text-xs text-[#6b6b80]">Goals</p>
                  <p className="text-lg font-bold text-[#f0f0f5]">{appGoals.length}</p>
                </div>
                <div className="text-center p-3 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                  <CheckSquare className="w-5 h-5 text-[#10b981] mx-auto mb-1" />
                  <p className="text-xs text-[#6b6b80]">Tasks</p>
                  <p className="text-lg font-bold text-[#f0f0f5]">{appTasks.length}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {apps.length === 0 && !showForm && (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Layers className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80] mb-4">No apps yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
          >
            Create Your First App
          </button>
        </div>
      )}
    </div>
  );
}
