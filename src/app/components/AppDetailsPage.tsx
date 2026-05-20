import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Target,
  CheckSquare,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle
} from 'lucide-react';
import { Phase } from '../types';

type AppDetailsPageProps = {
  appId: string;
  onNavigate: (page: string, appId?: string) => void;
};

export function AppDetailsPage({ appId, onNavigate }: AppDetailsPageProps) {
  const { apps, phases, goals, tasks, addPhase, updatePhase, deletePhase, getEmployeeById } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    notes: '',
    status: 'planned' as Phase['status'],
    startDate: '',
    endDate: ''
  });

  const app = apps.find(a => a.id === appId);
  const appPhases = phases.filter(p => p.appId === appId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (editingPhase) {
      await updatePhase(editingPhase.id, {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      });
      setEditingPhase(null);
    } else {
      await addPhase({
        ...formData,
        appId,
        createdBy: currentUser.id,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      });
    }

    setFormData({ name: '', details: '', notes: '', status: 'planned', startDate: '', endDate: '' });
    setShowAddPhase(false);
  };

  const handleEdit = (phase: Phase) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name,
      details: phase.details,
      notes: phase.notes,
      status: phase.status,
      startDate: phase.startDate ? phase.startDate.toISOString().split('T')[0] : '',
      endDate: phase.endDate ? phase.endDate.toISOString().split('T')[0] : ''
    });
    setShowAddPhase(true);
  };

  const handleDelete = async (phaseId: string) => {
    if (confirm('Delete this phase and all its goals and tasks?')) {
      await deletePhase(phaseId);
    }
  };

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusColors: Record<Phase['status'], string> = {
    planned: 'bg-[#6b6b80]',
    in_progress: 'bg-[#00e5ff]',
    completed: 'bg-[#10b981]',
    on_hold: 'bg-[#f59e0b]'
  };

  const statusIcons: Record<Phase['status'], any> = {
    planned: Clock,
    in_progress: Clock,
    completed: CheckCircle,
    on_hold: PauseCircle
  };

  if (!app) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#6b6b80]">App not found</p>
        <button onClick={() => onNavigate('apps')} className="mt-4 text-[#00e5ff] hover:underline">
          Back to Apps
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => onNavigate('apps')}
          className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded"
        >
          <ArrowLeft className="w-5 h-5 text-[#f0f0f5]" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5]">{app.name}</h1>
          <p className="text-[#6b6b80]">{app.description}</p>
        </div>
        <span className={`ml-auto text-xs px-3 py-1 ${
          app.status === 'active' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]' :
          app.status === 'completed' ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6]' :
          'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]'
        }`}>
          {app.status}
        </span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#f0f0f5]">Phases ({appPhases.length})</h2>
        {hasPermission('create_app') && (
          <button
            onClick={() => {
              setShowAddPhase(!showAddPhase);
              setEditingPhase(null);
              setFormData({ name: '', details: '', notes: '', status: 'planned', startDate: '', endDate: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] text-sm font-medium hover:bg-[#00c4e0]"
          >
            <Plus className="w-4 h-4" />
            Add Phase
          </button>
        )}
      </div>

      {(showAddPhase || editingPhase) && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] space-y-4">
          <h3 className="text-lg font-medium text-[#f0f0f5]">
            {editingPhase ? 'Edit Phase' : 'New Phase'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Phase Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
                placeholder="e.g. MVP1, Phase 2, Beta"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Phase['status'] })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Phase Details</label>
              <textarea
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] h-24 resize-none"
                placeholder="Describe the scope, objectives, and key deliverables of this phase..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] h-16 resize-none"
                placeholder="Additional notes, reminders, or observations..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]">
              {editingPhase ? 'Update' : 'Create'} Phase
            </button>
            <button
              type="button"
              onClick={() => { setShowAddPhase(false); setEditingPhase(null); }}
              className="px-4 py-2 bg-[#12121a] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {appPhases.length === 0 && !showAddPhase && (
        <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Clock className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
          <p className="text-[#6b6b80]">No phases yet. Add your first phase to get started.</p>
        </div>
      )}

      <div className="space-y-4">
        {appPhases.map(phase => {
          const phaseGoals = goals.filter(g => g.phaseId === phase.id);
          const isExpanded = expandedPhases.has(phase.id);
          const StatusIcon = statusIcons[phase.status];

          return (
            <div key={phase.id} className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
              <div className="flex items-center gap-4 p-4">
                <button onClick={() => togglePhase(phase.id)} className="p-1">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[#6b6b80]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#6b6b80]" />
                  )}
                </button>

                <div className={`p-2 ${statusColors[phase.status]} bg-opacity-10`}>
                  <StatusIcon className={`w-5 h-5 ${statusColors[phase.status].replace('bg-', 'text-')}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#f0f0f5]">{phase.name}</h3>
                    <span className={`text-xs px-2 py-0.5 ${statusColors[phase.status]} text-white`}>
                      {phase.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-[#6b6b80]">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {phaseGoals.length} goals
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                    </span>
                  </div>
                  {phase.details && (
                    <p className="text-sm text-[#6b6b80] mt-1 line-clamp-2">{phase.details}</p>
                  )}
                  {phase.notes && (
                    <p className="text-xs text-[#8b5cf6] mt-1 italic">Note: {phase.notes}</p>
                  )}
                </div>

                {hasPermission('create_app') && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(phase)}
                      className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(phase.id)}
                      className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-[rgba(0,229,255,0.1)] p-4 bg-[#0e0e16]">
                  {phaseGoals.length === 0 ? (
                    <p className="text-sm text-[#6b6b80] text-center py-4">No goals in this phase</p>
                  ) : (
                    <div className="space-y-3">
                      {phaseGoals.map(goal => {
                        const goalTasks = tasks.filter(t => t.goalId === goal.id);
                        const completedTasks = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;

                        return (
                          <div key={goal.id} className="p-4 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-[#8b5cf6]" />
                                <div>
                                  <h4 className="font-medium text-[#f0f0f5]">{goal.name}</h4>
                                  <p className="text-sm text-[#6b6b80]">{goal.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-[#6b6b80]">
                                  {completedTasks}/{goalTasks.length} tasks
                                </p>
                                {goalTasks.length > 0 && (
                                  <div className="w-24 h-1.5 bg-[#12121a] rounded-full mt-1">
                                    <div
                                      className="h-full bg-[#10b981] rounded-full"
                                      style={{ width: `${(completedTasks / goalTasks.length) * 100}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {goalTasks.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[rgba(0,229,255,0.05)]">
                                <div className="grid grid-cols-2 gap-2">
                                  {goalTasks.slice(0, 6).map(task => (
                                    <div key={task.id} className="flex items-center gap-2 text-sm">
                                      <CheckSquare className={`w-3 h-3 ${
                                        task.status === 'approved' ? 'text-[#10b981]' :
                                        task.status === 'completed' ? 'text-[#8b5cf6]' :
                                        task.status === 'in_progress' ? 'text-[#00e5ff]' :
                                        task.status === 'blocked' ? 'text-[#ff3b5c]' :
                                        'text-[#6b6b80]'
                                      }`} />
                                      <span className="text-[#f0f0f5] truncate">{task.name}</span>
                                      {task.assignedTo.length > 0 && (
                                        <span className="text-xs text-[#6b6b80] ml-auto">
                                          → {getEmployeeById(task.assignedTo[0])?.name?.split(' ')[0] || ''}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {goalTasks.length > 6 && (
                                  <p className="text-xs text-[#6b6b80] mt-2">+{goalTasks.length - 6} more tasks</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
