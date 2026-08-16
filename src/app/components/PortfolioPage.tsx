import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  HeartPulse,
  ArrowUpRight,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Target,
  CheckSquare,
  Bug,
  AlertCircle,
  Tag as TagIcon,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { computeAppHealth } from '../../utils/portfolio';
import { App, Tag } from '../types';
import { getCardClasses, getCardInlineStyle } from '../../utils/cardStyles';

const LEVEL_STYLES: Record<string, string> = {
  healthy: 'text-[#10b981] bg-[rgba(16,185,129,0.12)]',
  at_risk: 'text-[#f59e0b] bg-[rgba(245,158,11,0.12)]',
  critical: 'text-[#ef4444] bg-[rgba(239,68,68,0.12)]'
};

const PRESET_COLORS = [
  '#22C55E', '#8b5cf6', '#ff006e', '#ff6b35',
  '#00c853', '#ffd600', '#2979ff', '#ff3d00',
  '#00bfa5', '#d500f9', '#536dfe', '#f50057'
];

export function PortfolioPage({ onNavigate }: { onNavigate?: (page: string, appId?: string) => void }) {
  const { currentUser, hasPermission } = useAuth();
  const { apps, goals, tasks, defects, workDependencies, phases, addApp, updateApp, deleteApp, addTag, deleteTag, getGoalsForApp, getTasksForGoal, getTagsForApp } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#22C55E');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'completed' | 'on_hold',
    color: '#22C55E',
    cardStyle: 'default' as 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal'
  });

  const canCreateApp = hasPermission('create_app');

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
    setFormData({ name: '', description: '', status: 'active', color: '#22C55E', cardStyle: 'default' });
    setShowForm(false);
    setEditingApp(null);
  };

  const handleEdit = (app: App) => {
    setFormData({
      name: app.name,
      description: app.description,
      status: app.status,
      color: app.color || '#22C55E',
      cardStyle: app.cardStyle || 'default'
    });
    setEditingApp(app);
    setShowForm(true);
  };

  const handleDelete = (appId: string) => {
    if (confirm('Delete this app and all its goals and tasks?')) {
      deleteApp(appId);
    }
  };

  const handleAddTag = async (appId: string) => {
    if (!newTagName.trim()) return;
    await addTag({ appId, name: newTagName.trim(), color: newTagColor });
    setNewTagName('');
    setNewTagColor('#22C55E');
  };

  const rows = apps.map((app: App) => {
    const appGoalIds = goals.filter(g => g.appId === app.id).map(g => g.id);
    const appTasks = tasks.filter(t => appGoalIds.includes(t.goalId));
    const appDefects = defects.filter(d => d.applicationId === app.id);
    const blockedByDeps = workDependencies.filter(d => {
      const workInApp = (kind: string, wid: string) =>
        (kind === 'defect' ? appDefects.some(dd => dd.id === wid) : appTasks.some(tt => tt.id === wid));
      return d.type === 'blocked_by' && workInApp(d.toKind, d.toId);
    });
    const health = computeAppHealth({
      tasks: appTasks,
      defects: appDefects,
      blockedCount: blockedByDeps.length
    });
    const appPhases = phases.filter(p => p.appId === app.id);
    const currentPhase = appPhases.find(p => p.status === 'in_progress') || appPhases[0];
    const appGoals = getGoalsForApp(app.id);
    const appGoalTasks = appGoals.flatMap((g) => getTasksForGoal(g.id));
    const openDefects = appDefects.filter((d) => !['resolved', 'closed'].includes(d.status)).length;
    const blockedTasks = appGoalTasks.filter((t) => t.status === 'blocked').length;
    return { app, health, currentPhase, appGoals, appGoalTasks, openDefects, blockedTasks };
  });

  const statusColors = {
    active: 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)]',
    on_hold: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]',
    completed: 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border border-[rgba(34,197,94,0.2)]'
  };

  const circumference = 2 * Math.PI * 28;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#22C55E]" />
            Portfolio
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">{apps.length} applications · health snapshot and app management</p>
        </div>
        {canCreateApp && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingApp(null);
              setFormData({ name: '', description: '', status: 'active', color: '#22C55E', cardStyle: 'default' });
            }}
            className="group flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] transition cursor-pointer btn-primary-glow"
          >
            <Plus className="w-4 h-4 micro-pop" />
            New App
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] glass-card">
          <h3 className="font-semibold text-[#F8FAFC] mb-4">
            {editingApp ? 'Edit App' : 'Create New App'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">App Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                placeholder="e.g., Biops"
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
                placeholder="What is this app about?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'active' | 'completed' | 'on_hold'
                  })
                }
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Card Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-sm text-[#94A3B8] font-mono">{formData.color}</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                      className={`w-6 h-6 border-2 ${formData.color === c ? 'border-[#F8FAFC]' : 'border-transparent'} hover:scale-110 transition`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Card Style</label>
                <select
                  value={formData.cardStyle}
                  onChange={(e) => setFormData({ ...formData, cardStyle: e.target.value as 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal' })}
                  className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                >
                  <option value="default">Default</option>
                  <option value="rounded">Rounded</option>
                  <option value="stroked">Stroked</option>
                  <option value="elevated">Elevated</option>
                  <option value="minimal">Minimal</option>
                </select>
                <p className="text-xs text-[#94A3B8] mt-1">Tasks and action points will use this color and style on their cards.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a]"
              >
                {editingApp ? 'Update' : 'Create'} App
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingApp(null);
                  setFormData({ name: '', description: '', status: 'active', color: '#22C55E', cardStyle: 'default' });
                }}
                className="px-4 py-2 bg-[#1E293B] text-[#F8FAFC] border border-[rgba(34,197,94,0.1)] hover:bg-[#1E293B]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {rows.map(({ app, health, currentPhase, appGoals, appGoalTasks, openDefects, blockedTasks }) => {
          const completedTasks = appGoalTasks.filter((t) => t.status === 'approved');
          const progress = appGoalTasks.length > 0 ? Math.round((completedTasks.length / appGoalTasks.length) * 100) : 0;
          const strokeDashoffset = circumference - (progress / 100) * circumference;
          return (
            <div
              key={app.id}
              className={`${getCardClasses(app.cardStyle || 'default', app.color || '#22C55E')} relative overflow-hidden card-lift`}
              style={getCardInlineStyle(app.cardStyle || 'default', app.color || '#22C55E')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none" style={{ background: 'radial-gradient(circle, #22C55E 0%, transparent 70%)' }}></div>

              <div className="flex items-start justify-between mb-4">
                <button
                  onClick={() => onNavigate?.('app-details', app.id)}
                  className="group flex items-start gap-3 text-left hover:opacity-80 transition flex-1 cursor-pointer"
                >
                  <div className="p-3 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)]">
                    <Layers className="w-6 h-6 text-[#22C55E] micro-pop" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#F8FAFC] text-lg">{app.name}</h3>
                    <p className="text-sm text-[#94A3B8] mt-1">
                      {currentPhase ? currentPhase.name : 'No active phase'}
                    </p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#94A3B8] mt-1 micro-slide" />
                </button>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${LEVEL_STYLES[health.level]}`}>
                    {health.level.replace('_', ' ')}
                  </span>
                  {canCreateApp && (
                    <button
                      onClick={() => handleEdit(app)}
                      className="p-2 text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)] transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canCreateApp && (
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-[#94A3B8] mb-4">{app.description}</p>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#1E293B" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="28" fill="none" stroke="#22C55E" strokeWidth="4"
                      strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round" transform="rotate(-90 32 32)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#F8FAFC]">{progress}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#94A3B8]">Health Score</p>
                  <div className="flex-1 h-2 bg-[#020617] rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${health.level === 'healthy' ? 'bg-[#10b981]' : health.level === 'at_risk' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}
                      style={{ width: `${health.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1">{completedTasks.length} of {appGoalTasks.length} tasks approved</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                  <Target className="w-5 h-5 text-[#22C55E] mx-auto mb-1" />
                  <p className="text-xs text-[#94A3B8]">Goals</p>
                  <p className="text-lg font-bold text-[#F8FAFC]">{appGoals.length}</p>
                </div>
                <div className="text-center p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                  <CheckSquare className="w-5 h-5 text-[#10b981] mx-auto mb-1" />
                  <p className="text-xs text-[#94A3B8]">Tasks</p>
                  <p className="text-lg font-bold text-[#F8FAFC]">{appGoalTasks.length}</p>
                </div>
                <div className="text-center p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                  <Bug className="w-5 h-5 text-[#dc2626] mx-auto mb-1" />
                  <p className="text-xs text-[#94A3B8]">Defects</p>
                  <p className="text-lg font-bold text-[#F8FAFC]">{openDefects}</p>
                </div>
                <div className="text-center p-3 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                  <AlertCircle className="w-5 h-5 text-[#ff3b5c] mx-auto mb-1" />
                  <p className="text-xs text-[#94A3B8]">Blocked</p>
                  <p className="text-lg font-bold text-[#F8FAFC]">{blockedTasks}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[rgba(34,197,94,0.1)]">
                <div className="flex items-center gap-2 mb-2">
                  <TagIcon className="w-4 h-4 text-[#94A3B8]" />
                  <span className="text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {getTagsForApp(app.id).map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderLeft: `2px solid ${tag.color}` }}
                    >
                      {tag.name}
                      {canCreateApp && (
                        <button
                          onClick={() => deleteTag(tag.id)}
                          className="hover:opacity-60"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {getTagsForApp(app.id).length === 0 && (
                    <span className="text-xs text-[#94A3B8]">No tags</span>
                  )}
                </div>
                {canCreateApp && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name..."
                      className="flex-1 px-2 py-1 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-xs outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(app.id))}
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-6 h-6 border-0 cursor-pointer bg-transparent p-0"
                    />
                    <button
                      onClick={() => handleAddTag(app.id)}
                      disabled={!newTagName.trim()}
                      className="px-2 py-1 bg-[#22C55E] text-[#020617] text-xs font-medium disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {apps.length === 0 && !showForm && (
        <div className="text-center py-12 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] rounded-lg">
          <Layers className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
          <p className="text-[#94A3B8] mb-4">No apps yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a]"
          >
            Create Your First App
          </button>
        </div>
      )}

      <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#94A3B8] border-b border-[rgba(34,197,94,0.1)]">
              <th className="px-4 py-3 font-medium">Application</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Tasks</th>
              <th className="px-4 py-3 font-medium">Defects</th>
              <th className="px-4 py-3 font-medium">QA Pending</th>
              <th className="px-4 py-3 font-medium">Blocked</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ app, health }) => (
              <tr key={app.id} className="border-b border-[rgba(34,197,94,0.05)] last:border-0 hover:bg-[rgba(34,197,94,0.03)] cursor-pointer" onClick={() => onNavigate?.('app-details', app.id)}>
                <td className="px-4 py-3 text-[#F8FAFC]">{app.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${LEVEL_STYLES[health.level]}`}>
                    <HeartPulse className="w-3 h-3" />
                    {health.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#CBD5E1]">{health.openTasks}</td>
                <td className="px-4 py-3 text-[#CBD5E1]">{health.openDefects}</td>
                <td className="px-4 py-3 text-[#8b5cf6]">{health.qaPending}</td>
                <td className="px-4 py-3 text-[#ef4444]">{health.blocked}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-sm text-[#94A3B8] p-4">No applications yet.</p>}
      </div>
    </div>
  );
}