import React, { useState, useEffect } from 'react';
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
  PauseCircle,
  Link,
  Unlink,
  Flag,
  ClipboardCheck,
  Code2,
  Server,
  FileText,
  Sparkles,
  RefreshCw,
  ListTodo,
  Folder,
  GitBranch,
  MessageCircle
} from 'lucide-react';
import { Phase } from '../types';
import { EngineeringDocsSection } from './EngineeringDocsSection';

import { buildReportSnapshot } from '../../utils/reportLogic';
import { RepositoryBrowser } from './RepositoryBrowser';

type AppDetailsPageProps = {
  appId: string;
  onNavigate: (page: string, appId?: string) => void;
};

export function AppDetailsPage({ appId, onNavigate }: AppDetailsPageProps) {
  const { apps, phases, goals, tasks, defects, repositories, employees, activities, addPhase, updatePhase, deletePhase, getEmployeeById, modules, addModule, deleteModule, getModulesForApp, expectations, addExpectation, updateExpectation, deleteExpectation, getGoalById, updateApp, reports, addReport, deleteReport } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [showModules, setShowModules] = useState(false);
  const [moduleFormName, setModuleFormName] = useState('');
  const [newExpText, setNewExpText] = useState<Record<string, string>>({});
  const [linkingExpId, setLinkingExpId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    notes: '',
    status: 'planned' as Phase['status'],
    stage: 'pre-development' as Phase['stage'],
    startDate: '',
    endDate: '',
    sprintCount: '',
    techStack: '',
    qaCriteria: '',
    deploymentTarget: ''
  });
  const [planningNotesText, setPlanningNotesText] = useState('');
  const [activeProfileTab, setActiveProfileTab] = useState<'Overview' | 'Phases' | 'Tasks' | 'Milestones' | 'Documents' | 'GitHub' | 'Activity'>('Overview');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  const handleSaveProfile = async (field: string, data: any) => {
    await updateApp(appId, { [field]: data });
  };

  const app = apps.find(a => a.id === appId);
  const appPhases = phases.filter(p => p.appId === appId);
  const appGoals = goals.filter(g => g.appId === appId);
  const appGoalIds = new Set(appGoals.map(g => g.id));
  const appTasks = tasks.filter(t => appGoalIds.has(t.goalId || ''));
  const appRepositories = repositories.filter(r => r.appId === appId);

  useEffect(() => {
    if (app) {
      setPlanningNotesText(app.planningNotes || '');
    }
  }, [app]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (editingPhase) {
      await updatePhase(editingPhase.id, {
        ...formData,
        sprintCount: formData.sprintCount ? parseInt(formData.sprintCount) : undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      });
      setEditingPhase(null);
    } else {
      await addPhase({
        ...formData,
        appId,
        createdBy: currentUser.id,
        sprintCount: formData.sprintCount ? parseInt(formData.sprintCount) : undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined
      });
    }

    setFormData({ name: '', details: '', notes: '', status: 'planned', stage: 'pre-development', startDate: '', endDate: '', sprintCount: '', techStack: '', qaCriteria: '', deploymentTarget: '' });
    setShowAddPhase(false);
  };

  const handleEdit = (phase: Phase) => {
    setEditingPhase(phase);
    setFormData({
      name: phase.name,
      details: phase.details,
      notes: phase.notes,
      status: phase.status,
      stage: phase.stage,
      startDate: phase.startDate ? phase.startDate.toISOString().split('T')[0] : '',
      endDate: phase.endDate ? phase.endDate.toISOString().split('T')[0] : '',
      sprintCount: phase.sprintCount ? String(phase.sprintCount) : '',
      techStack: phase.techStack || '',
      qaCriteria: phase.qaCriteria || '',
      deploymentTarget: phase.deploymentTarget || ''
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
    planned: 'bg-[#94A3B8]',
    in_progress: 'bg-[#7C3AED]',
    completed: 'bg-[#10b981]',
    on_hold: 'bg-[#f59e0b]'
  };

  const statusIcons: Record<Phase['status'], any> = {
    planned: Clock,
    in_progress: Clock,
    completed: CheckCircle,
    on_hold: PauseCircle
  };

  const stageColors: Record<Phase['stage'], string> = {
    'pre-development': 'bg-[#3b82f6]',
    'development': 'bg-[#10b981]',
    'post-development': 'bg-[#8b5cf6]'
  };

  const stageLabels: Record<Phase['stage'], string> = {
    'pre-development': 'Pre-Dev',
    'development': 'Dev',
    'post-development': 'Post-Dev'
  };

  if (!app) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#6D28D9]">App not found</p>
        <button onClick={() => onNavigate('portfolio')} className="mt-4 text-[#7C3AED] hover:underline">
          Back to Portfolio
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => onNavigate('portfolio')}
          className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded"
        >
          <ArrowLeft className="w-5 h-5 text-[#4C1D95]" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[#4C1D95]">{app.name}</h1>
          <p className="text-[#6D28D9]">{app.description}</p>
        </div>
        <span className={`ml-auto text-xs px-3 py-1 ${
          app.status === 'active' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]' :
          app.status === 'completed' ? 'bg-[rgba(167,139,250,0.1)] text-[#A78BFA]' :
          'bg-[rgba(245,158,11,0.1)] text-[#F97316]'
        }`}>
          {app.status}
        </span>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-[#E9D5FF]">
        {([
          { key: 'Overview', icon: ClipboardCheck },
          { key: 'Phases', icon: Clock },
          { key: 'Tasks', icon: ListTodo },
          { key: 'Milestones', icon: Target },
          { key: 'Documents', icon: Folder },
          { key: 'GitHub', icon: GitBranch },
          { key: 'Activity', icon: MessageCircle }
        ] as const).map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveProfileTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeProfileTab === key
                ? 'border-[#22C55E] text-[#7C3AED]'
                : 'border-transparent text-[#6D28D9] hover:text-[#4C1D95]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {key}
          </button>
        ))}
      </div>

      {activeProfileTab === 'Overview' && (
        <div className="mb-6 p-6 bg-white border border-[#E9D5FF]">
          <h3 className="text-lg font-medium text-[#4C1D95] mb-4">Planning Notes</h3>
          <textarea
            value={planningNotesText}
            onChange={(e) => setPlanningNotesText(e.target.value)}
            className="w-full bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95] p-4 h-48 resize-none outline-none"
            placeholder="Record meeting notes, requirements discussions, research findings, and planning decisions..."
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={() => updateApp(appId, { planningNotes: planningNotesText })}
              className="px-4 py-2 bg-[#7C3AED] text-[#020617] text-sm font-medium hover:bg-[#6D28D9]"
            >
              Save Notes
            </button>
          </div>
        </div>
      )}

      {activeProfileTab === 'Phases' && (
        <>
      {/* Phases */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[#4C1D95]">Phases ({appPhases.length})</h2>
        </div>
        {hasPermission('create_app') && (
          <button
            onClick={() => {
              setShowAddPhase(!showAddPhase);
              setEditingPhase(null);
              setFormData({ name: '', details: '', notes: '', status: 'planned', stage: 'pre-development', startDate: '', endDate: '', sprintCount: '', techStack: '', qaCriteria: '', deploymentTarget: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] text-sm font-medium hover:bg-[#6D28D9]"
          >
            <Plus className="w-4 h-4" />
            Add Phase
          </button>
        )}
      </div>

          {(showAddPhase || editingPhase) && (
            <form onSubmit={handleSubmit} className="mb-6 p-6 bg-[#F5F3FF] border border-[#E9D5FF] space-y-4">
              <h3 className="text-lg font-medium text-[#4C1D95]">
                {editingPhase ? 'Edit Phase' : 'New Phase'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4C1D95] mb-2">Phase Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                    placeholder="e.g. MVP1, Phase 2, Beta"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4C1D95] mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Phase['status'] })}
                    className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4C1D95] mb-2">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as Phase['stage'] })}
                    className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                  >
                    <option value="pre-development">Pre-Development</option>
                    <option value="development">Development</option>
                    <option value="post-development">Post-Development</option>
                  </select>
                </div>
                {formData.stage === 'development' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#4C1D95] mb-2">Sprint Count</label>
                      <input
                        type="number"
                        value={formData.sprintCount}
                        onChange={(e) => setFormData({ ...formData, sprintCount: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                        placeholder="e.g. 6"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4C1D95] mb-2">Tech Stack</label>
                      <input
                        type="text"
                        value={formData.techStack}
                        onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                        placeholder="e.g. React, Node.js, PostgreSQL"
                      />
                    </div>
                  </>
                )}
                {formData.stage === 'post-development' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#4C1D95] mb-2">QA Criteria</label>
                      <input
                        type="text"
                        value={formData.qaCriteria}
                        onChange={(e) => setFormData({ ...formData, qaCriteria: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                        placeholder="e.g. All critical bugs resolved, 95% test coverage"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4C1D95] mb-2">Deployment Target</label>
                      <input
                        type="text"
                        value={formData.deploymentTarget}
                        onChange={(e) => setFormData({ ...formData, deploymentTarget: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                        placeholder="e.g. Production v2.0, Staging v1.5"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#4C1D95] mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4C1D95] mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#4C1D95] mb-2">Phase Details</label>
                  <textarea
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] h-24 resize-none"
                    placeholder="Describe the scope, objectives, and key deliverables of this phase..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#4C1D95] mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] h-16 resize-none"
                    placeholder="Additional notes, reminders, or observations..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium hover:bg-[#6D28D9]">
                  {editingPhase ? 'Update' : 'Create'} Phase
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddPhase(false); setEditingPhase(null); }}
                  className="px-4 py-2 bg-white text-[#4C1D95] border border-[#E9D5FF]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

      {appPhases.length === 0 && !showAddPhase && (
        <div className="text-center py-12 bg-white border border-[#E9D5FF]">
          <Clock className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
          <p className="text-[#6D28D9]">No phases yet. Add your first phase to get started.</p>
        </div>
      )}

      <div className="space-y-4">
        {appPhases.map(phase => {
          const phaseGoals = goals.filter(g => g.phaseId === phase.id);
          const isExpanded = expandedPhases.has(phase.id);
          const StatusIcon = statusIcons[phase.status];

          return (
            <div key={phase.id} className="bg-white border border-[#E9D5FF]">
              <button onClick={() => togglePhase(phase.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-[rgba(255,255,255,0.02)]">
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[#6D28D9]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#6D28D9]" />
                  )}
                </div>

                <div className={`p-2 ${statusColors[phase.status]} bg-opacity-10`}>
                  <StatusIcon className={`w-5 h-5 ${statusColors[phase.status].replace('bg-', 'text-')}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#4C1D95]">{phase.name}</h3>
                    <span className={`text-xs px-2 py-0.5 ${statusColors[phase.status]} text-white`}>
                      {phase.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 ${stageColors[phase.stage]} text-white`}>
                      {stageLabels[phase.stage]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-[#6D28D9]">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {phaseGoals.length} goals
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                    </span>
                  </div>
                  {phase.details && !isExpanded && (
                    <p className="text-sm text-[#6D28D9] mt-1 line-clamp-1">{phase.details}</p>
                  )}
                  {phase.notes && !isExpanded && (
                    <p className="text-xs text-[#A78BFA] mt-0.5 italic truncate">Note: {phase.notes}</p>
                  )}
                  {!isExpanded && phase.stage === 'development' && (phase.sprintCount || phase.techStack) && (
                    <p className="text-[10px] text-[#10b981] mt-0.5">
                      {phase.sprintCount && `${phase.sprintCount} sprints`}
                      {phase.sprintCount && phase.techStack && ' · '}
                      {phase.techStack && phase.techStack}
                    </p>
                  )}
                  {!isExpanded && phase.stage === 'post-development' && (phase.qaCriteria || phase.deploymentTarget) && (
                    <p className="text-[10px] text-[#A78BFA] mt-0.5">
                      {phase.deploymentTarget || phase.qaCriteria}
                    </p>
                  )}
                </div>

                {hasPermission('create_app') && (
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(phase)}
                      className="p-2 text-[#7C3AED] hover:bg-[rgba(124,58,237,0.1)] rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(phase.id)}
                      className="p-2 text-[#DC2626] hover:bg-[rgba(220,38,38,0.05)] rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-[#E9D5FF]">
                  <div className="p-4 space-y-4">
                    {phase.details && (
                      <div>
                        <h4 className="text-sm font-medium text-[#4C1D95] mb-2">Phase Details</h4>
                        <p className="text-sm text-[#6D28D9] whitespace-pre-wrap leading-relaxed">{phase.details}</p>
                      </div>
                    )}
                    {phase.notes && (
                      <div className="p-3 bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.1)]">
                        <h4 className="text-xs font-medium text-[#A78BFA] mb-1">Notes</h4>
                        <p className="text-sm text-[#A78BFA] whitespace-pre-wrap italic">{phase.notes}</p>
                      </div>
                    )}
                    {phase.stage === 'development' && (phase.sprintCount || phase.techStack) && (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.1)]">
                        {phase.sprintCount && (
                          <div>
                            <span className="text-[10px] font-medium text-[#10b981] uppercase">Sprints</span>
                            <p className="text-sm text-[#4C1D95] mt-0.5">{phase.sprintCount}</p>
                          </div>
                        )}
                        {phase.techStack && (
                          <div>
                            <span className="text-[10px] font-medium text-[#10b981] uppercase">Tech Stack</span>
                            <p className="text-sm text-[#4C1D95] mt-0.5">{phase.techStack}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {phase.stage === 'post-development' && (phase.qaCriteria || phase.deploymentTarget) && (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.1)]">
                        {phase.qaCriteria && (
                          <div>
                            <span className="text-[10px] font-medium text-[#A78BFA] uppercase">QA Criteria</span>
                            <p className="text-sm text-[#4C1D95] mt-0.5">{phase.qaCriteria}</p>
                          </div>
                        )}
                        {phase.deploymentTarget && (
                          <div>
                            <span className="text-[10px] font-medium text-[#A78BFA] uppercase">Deployment Target</span>
                            <p className="text-sm text-[#4C1D95] mt-0.5">{phase.deploymentTarget}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t border-[#E9D5FF] pt-4">
                      <h4 className="text-sm font-medium text-[#4C1D95] mb-3">Goals ({phaseGoals.length})</h4>
                      {phaseGoals.length === 0 ? (
                        <p className="text-sm text-[#6D28D9] text-center py-4">No goals in this phase</p>
                      ) : (
                        <div className="space-y-3">
                          {phaseGoals.map(goal => {
                            const goalTasks = tasks.filter(t => t.goalId === goal.id);
                            const completedTasks = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;

                            return (
                              <div key={goal.id} className="p-4 bg-[#F5F3FF] border border-[#E9D5FF]">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Target className="w-5 h-5 text-[#A78BFA]" />
                                    <div>
                                      <h4 className="font-medium text-[#4C1D95]">{goal.name}</h4>
                                      <p className="text-sm text-[#6D28D9]">{goal.description}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-[#6D28D9]">
                                      {completedTasks}/{goalTasks.length} tasks
                                    </p>
                                    {goalTasks.length > 0 && (
                                      <div className="w-24 h-1.5 bg-white rounded-full mt-1">
                                        <div
                                          className="h-full bg-[#10b981] rounded-full"
                                          style={{ width: `${(completedTasks / goalTasks.length) * 100}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {goalTasks.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-[rgba(124,58,237,0.05)]">
                                    <div className="grid grid-cols-2 gap-2">
                                      {goalTasks.slice(0, 6).map(task => (
                                        <div key={task.id} className="flex items-center gap-2 text-sm">
                                          <CheckSquare className={`w-3 h-3 ${
                                            task.status === 'approved' ? 'text-[#10b981]' :
                                            task.status === 'completed' ? 'text-[#A78BFA]' :
                                            task.status === 'in_progress' ? 'text-[#7C3AED]' :
                                            task.status === 'blocked' ? 'text-[#DC2626]' :
                                            'text-[#6D28D9]'
                                          }`} />
                                          <span className="text-[#4C1D95] truncate">{task.name}</span>
                                          {task.assignedTo.length > 0 && (
                                            <span className="text-xs text-[#6D28D9] ml-auto">
                                              → {getEmployeeById(task.assignedTo[0])?.name?.split(' ')[0] || ''}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {goalTasks.length > 6 && (
                                      <p className="text-xs text-[#6D28D9] mt-2">+{goalTasks.length - 6} more tasks</p>
                                    )}
                                  </div>
                                )}
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

      <div className="mt-8 border-t border-[#E9D5FF] pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-xl font-bold text-[#4C1D95]">Modules</h2>
          </div>
          {hasPermission('manage_modules') && (
            <button
              onClick={() => setShowModules(!showModules)}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] text-sm font-medium hover:bg-[#6D28D9]"
            >
              <Plus className="w-4 h-4" />
              {showModules ? 'Cancel' : 'New Module'}
            </button>
          )}
        </div>

        {showModules && hasPermission('manage_modules') && currentUser && (
          <div className="mb-4 p-3 bg-[#F5F3FF] border border-[#E9D5FF] flex gap-2">
            <input
              type="text"
              value={moduleFormName}
              onChange={(e) => setModuleFormName(e.target.value)}
              placeholder="Module name..."
              className="flex-1 px-3 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && moduleFormName.trim()) {
                  addModule({ appId, name: moduleFormName.trim(), status: 'open', createdBy: currentUser.id });
                  setModuleFormName('');
                  setShowModules(false);
                }
              }}
            />
            <button
              onClick={() => {
                if (moduleFormName.trim()) {
                  addModule({ appId, name: moduleFormName.trim(), status: 'open', createdBy: currentUser.id });
                  setModuleFormName('');
                  setShowModules(false);
                }
              }}
              disabled={!moduleFormName.trim()}
              className="px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium disabled:opacity-50"
            >
              Create
            </button>
          </div>
        )}

        {(() => {
          const appModules = getModulesForApp(appId);
          return appModules.length === 0 ? (
            <p className="text-sm text-[#6D28D9] text-center py-6">No modules yet for this app</p>
          ) : (
            <div className="space-y-3">
              {appModules.map(mod => {
                const modExps = getExpectationsForModule(mod.id);
                const modAchieved = modExps.filter(e => e.status === 'achieved').length;
                return (
                  <div key={mod.id} className="bg-white border border-[#E9D5FF] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#4C1D95]">{mod.name}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 ${mod.status === 'open' ? 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED]' : 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'}`}>
                          {mod.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {modExps.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1 bg-[#F5F3FF] rounded-full overflow-hidden">
                              <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${(modAchieved / modExps.length) * 100}%` }} />
                            </div>
                            <span className="text-xs text-[#6D28D9]">{modAchieved}/{modExps.length}</span>
                          </div>
                        )}
                        {hasPermission('manage_modules') && (
                          <button onClick={() => deleteModule(mod.id)} className="p-1 text-[#6D28D9] hover:text-[#DC2626]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {modExps.map(exp => (
                        <div key={exp.id} className="flex items-start gap-2 p-2 bg-[#F5F3FF] border border-[rgba(34,197,94,0.03)]">
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
                            <p className={`text-xs ${exp.status === 'missed' ? 'text-[#DC2626] line-through' : 'text-[#4C1D95]'}`}>
                              {exp.description}
                            </p>
                            {exp.taskId && (
                              <span className="text-[10px] text-[#7C3AED] flex items-center gap-0.5 mt-0.5">
                                <Link className="w-2.5 h-2.5" /> {tasks.find(t => t.id === exp.taskId)?.name || 'Unknown'}
                              </span>
                            )}
                          </div>
                          {hasPermission('manage_modules') && (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => setLinkingExpId(linkingExpId === exp.id ? null : exp.id)}
                                className={`p-0.5 ${exp.taskId ? 'text-[#10b981]' : 'text-[#6D28D9]'} hover:text-[#7C3AED]`}
                              >
                                <Link className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateExpectation(exp.id, { status: exp.status === 'missed' ? 'pending' : 'missed' })}
                                className="p-0.5 text-[#6D28D9] hover:text-[#DC2626]"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                              <button onClick={() => deleteExpectation(exp.id)} className="p-0.5 text-[#6D28D9] hover:text-[#DC2626]">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {linkingExpId === exp.id && (
                            <div className="absolute mt-5 right-0 z-10 w-56 p-2 bg-[#F5F3FF] border border-[#E9D5FF] shadow-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-[#4C1D95] font-medium">Link to Task</span>
                                <button onClick={() => setLinkingExpId(null)} className="text-xs text-[#6D28D9]">Close</button>
                              </div>
                              <div className="max-h-24 overflow-y-auto space-y-0.5">
                                {(() => {
                                  const appGoalIds = new Set(goals.filter(g => g.appId === appId).map(g => g.id));
                                  const appTasks = tasks.filter(t => appGoalIds.has(t.goalId || ''));
                                  return appTasks.length > 0 ? appTasks.map(t => (
                                    <button
                                      key={t.id}
                                      onClick={() => { updateExpectation(exp.id, { taskId: t.id }); setLinkingExpId(null); }}
                                      className="w-full text-left px-2 py-1 text-xs text-[#4C1D95] hover:bg-[rgba(124,58,237,0.1)] rounded"
                                    >
                                      {t.name}
                                    </button>
                                  )) : <p className="text-xs text-[#6D28D9] py-1">No tasks</p>;
                                })()}
                              </div>
                              {exp.taskId && (
                                <button onClick={() => { updateExpectation(exp.id, { taskId: undefined as any }); setLinkingExpId(null); }}
                                  className="mt-1 flex items-center gap-1 text-[10px] text-[#DC2626] hover:underline">
                                  <Unlink className="w-2.5 h-2.5" /> Unlink
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={newExpText[mod.id] || ''}
                          onChange={(e) => setNewExpText(prev => ({ ...prev, [mod.id]: e.target.value }))}
                          placeholder="What do you hope to achieve?"
                          className="flex-1 px-2 py-1.5 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95] text-xs outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (newExpText[mod.id] || '').trim() && currentUser) {
                              addExpectation({ moduleId: mod.id, description: (newExpText[mod.id] || '').trim(), status: 'pending', createdBy: currentUser.id });
                              setNewExpText(prev => ({ ...prev, [mod.id]: '' }));
                            }
                          }}
                        />
                        {hasPermission('manage_modules') && (
                          <button
                            onClick={() => {
                              if ((newExpText[mod.id] || '').trim() && currentUser) {
                                addExpectation({ moduleId: mod.id, description: (newExpText[mod.id] || '').trim(), status: 'pending', createdBy: currentUser.id });
                                setNewExpText(prev => ({ ...prev, [mod.id]: '' }));
                              }
                            }}
                            disabled={!(newExpText[mod.id] || '').trim()}
                            className="px-2 py-1.5 bg-[#7C3AED] text-[#020617] text-xs font-medium disabled:opacity-50"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
        </>
      )}

      {activeProfileTab === 'Tasks' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#4C1D95]">Tasks ({appTasks.length})</h2>
          {appTasks.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#E9D5FF]">
              <ListTodo className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
              <p className="text-[#6D28D9]">No tasks yet for this app.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appTasks.map(task => {
                const goal = goals.find(g => g.id === task.goalId);
                return (
                  <div key={task.id} className="bg-white border border-[#E9D5FF] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckSquare className={`w-5 h-5 ${
                          task.status === 'approved' ? 'text-[#10b981]' :
                          task.status === 'completed' ? 'text-[#A78BFA]' :
                          task.status === 'in_progress' ? 'text-[#7C3AED]' :
                          task.status === 'blocked' ? 'text-[#DC2626]' :
                          'text-[#6D28D9]'
                        }`} />
                        <div>
                          <h4 className="font-medium text-[#4C1D95]">{task.name}</h4>
                          <p className="text-xs text-[#6D28D9] mt-0.5">
                            {goal?.name && <span className="text-[#A78BFA]">Goal: {goal.name}</span>}
                            {task.assignedTo.length > 0 && (
                              <span> · Assigned: {getEmployeeById(task.assignedTo[0])?.name || 'Unknown'}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 ${
                        task.status === 'approved' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]' :
                        task.status === 'completed' ? 'bg-[rgba(167,139,250,0.1)] text-[#A78BFA]' :
                        task.status === 'in_progress' ? 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED]' :
                        task.status === 'blocked' ? 'bg-[rgba(220,38,38,0.05)] text-[#DC2626]' :
                        'bg-[rgba(148,163,184,0.1)] text-[#6D28D9]'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeProfileTab === 'Milestones' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#4C1D95]">Milestones ({appGoals.length})</h2>
          {appGoals.length === 0 ? (
            <div className="text-center py-12 bg-white border border-[#E9D5FF]">
              <Target className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
              <p className="text-[#6D28D9]">No milestones yet for this app.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appGoals.map(goal => {
                const goalTasks = tasks.filter(t => t.goalId === goal.id);
                const completedTasks = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
                const phase = phases.find(p => p.id === goal.phaseId);
                return (
                  <div key={goal.id} className="bg-white border border-[#E9D5FF] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-[#A78BFA]" />
                        <div>
                          <h4 className="font-medium text-[#4C1D95]">{goal.name}</h4>
                          <p className="text-sm text-[#6D28D9]">{goal.description}</p>
                          {phase && (
                            <span className="text-xs text-[#7C3AED]">Phase: {phase.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[#6D28D9]">
                          {completedTasks}/{goalTasks.length} tasks
                        </p>
                        {goalTasks.length > 0 && (
                          <div className="w-24 h-1.5 bg-white rounded-full mt-1">
                            <div
                              className="h-full bg-[#10b981] rounded-full"
                              style={{ width: `${(completedTasks / goalTasks.length) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeProfileTab === 'Documents' && (
        <EngineeringDocsSection appId={appId} />
      )}

      {activeProfileTab === 'GitHub' && (
        <div className="space-y-4">
          {selectedRepo ? (
            (() => {
              const repo = repositories.find(r => r.id === selectedRepo);
              if (!repo) return <p className="text-[#6D28D9]">Repository not found.</p>;
              return <RepositoryBrowser repo={repo} onBack={() => setSelectedRepo(null)} />;
            })()
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#4C1D95]">GitHub Repositories ({appRepositories.length})</h2>
              {appRepositories.length === 0 ? (
                <div className="text-center py-12 bg-white border border-[#E9D5FF]">
                  <GitBranch className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
                  <p className="text-[#6D28D9]">No repositories linked to this app yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appRepositories.map(repo => (
                    <button
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo.id)}
                      className="w-full text-left bg-white border border-[#E9D5FF] p-4 hover:bg-[rgba(124,58,237,0.05)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch className="w-5 h-5 text-[#7C3AED]" />
                        <div>
                          <h4 className="font-medium text-[#4C1D95]">{repo.name}</h4>
                          {repo.description && (
                            <p className="text-sm text-[#6D28D9]">{repo.description}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#6D28D9] ml-auto" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeProfileTab === 'Activity' && (
        <ReportsTab
          appId={appId}
          apps={apps}
          goals={goals}
          tasks={tasks}
          defects={defects}
          repositories={repositories}
          employees={employees}
          activities={activities}
          reports={reports}
          currentUserId={currentUser?.id}
          addReport={addReport}
          deleteReport={deleteReport}
        />
      )}
    </div>
  );
}

function ReportsTab({
  appId,
  apps,
  goals,
  tasks,
  defects,
  repositories,
  employees,
  activities,
  reports,
  currentUserId,
  addReport,
  deleteReport
}: {
  appId: string;
  apps: any[];
  goals: any[];
  tasks: any[];
  defects: any[];
  repositories: any[];
  employees: any[];
  activities: any[];
  reports: any[];
  currentUserId?: string;
  addReport: (report: any) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appName = apps.find(a => a.id === appId)?.name || 'App';
  const appReports = reports.filter(r => r.appId === appId);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = buildReportSnapshot({
        apps, goals, tasks, defects, repositories, employees, activities, selectedAppId: appId
      });
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Report generation failed');
      await addReport({
        appId,
        title: `${appName} Report · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        content: data.report,
        model: data.model || null,
        generatedBy: currentUserId || 'unknown'
      });
    } catch (e: any) {
      setError(e.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (md: string) => {
    const blocks: React.ReactNode[] = [];
    const lines = md.split('\n');
    let list: string[] = [];
    const flushList = (key: string) => {
      if (list.length === 0) return;
      blocks.push(
        <ul key={key} className="space-y-1.5 my-3">
          {list.map((li, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#CBD5E1]">
              <span className="text-[#7C3AED] mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0" />
              <span>{li}</span>
            </li>
          ))}
        </ul>
      );
      list = [];
    };
    lines.forEach((raw, idx) => {
      const line = raw.trimEnd();
      if (line.trim() === '') { flushList(`l${idx}`); return; }
      if (/^#{1,3}\s/.test(line)) {
        flushList(`l${idx}`);
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const Tag = level === 1 ? 'h2' : 'h3';
        blocks.push(
          <Tag key={`h${idx}`} className={`${Tag === 'h2' ? 'text-xl' : 'text-lg'} font-semibold text-[#4C1D95] mt-6 mb-2 flex items-center gap-2`}>
            <span className="w-1.5 h-5 bg-[#7C3AED]" />
            {text}
          </Tag>
        );
      } else if (/^[-*]\s/.test(line)) {
        list.push(line.replace(/^[-*]\s/, ''));
      } else {
        flushList(`l${idx}`);
        const bolded = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#4C1D95]">$1</strong>');
        blocks.push(
          <p key={`p${idx}`} className="text-sm text-[#CBD5E1] leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: bolded }} />
        );
      }
    });
    flushList('final');
    return blocks;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E9D5FF] p-6 glass-card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-[#4C1D95] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7C3AED]" />
              AI Progress Report
            </h3>
            <p className="text-sm text-[#6D28D9] mt-1">
              Groq analyzes live data for <span className="text-[#7C3AED]">{appName}</span> — health, what's working, risks, and recommendations.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[rgba(220,38,38,0.05)] border border-[rgba(255,59,92,0.2)] text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {appReports.length === 0 && !loading && (
        <div className="text-center py-12 bg-white border border-[#E9D5FF]">
          <Sparkles className="w-12 h-12 text-[#6D28D9] mx-auto mb-4" />
          <p className="text-[#6D28D9]">No reports yet. Generate your first AI progress report for {appName}.</p>
        </div>
      )}

      {appReports.map(report => (
        <div key={report.id} className="bg-white border border-[#E9D5FF] p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E9D5FF]">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            <span className="font-medium text-[#4C1D95]">{report.title}</span>
            <span className="ml-auto text-xs text-[#6D28D9]">
              {report.model ? `Generated by Groq · ${report.model} · ` : 'Generated by Groq · '}
              {report.createdAt ? new Date(report.createdAt).toLocaleString() : ''}
            </span>
            <button
              onClick={() => deleteReport(report.id)}
              className="p-1 text-[#6D28D9] hover:text-[#DC2626]"
              title="Delete report"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">{renderMarkdown(report.content)}</div>
        </div>
      ))}
    </div>
  );
}
