import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
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
  Flag,
  ClipboardCheck,
  Sparkles,
  RefreshCw,
  ListTodo,
  Folder,
  GitBranch,
  MessageCircle,
  Users,
  BarChart3,
  Activity,
  AlertTriangle,
  Layers,
  Filter,
  Search,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { Phase } from '../types';
import { EngineeringDocsSection } from './EngineeringDocsSection';
import { buildReportSnapshot } from '../../utils/reportLogic';
import { RepositoryBrowser } from './RepositoryBrowser';
import { TasksModule } from './TasksModule';
import { GoalsModule } from './GoalsMilestonesModule';
import { DefectDashboard } from './DefectDashboard';
import { CalendarPage } from './CalendarPage';
import { SprintsPage } from './SprintsPage';

type AppDetailsPageProps = {
  appId: string;
  onNavigate: (page: string, appId?: string) => void;
};

export function AppDetailsPage({ appId, onNavigate }: AppDetailsPageProps) {
  const { apps, phases, goals, tasks, defects, repositories, employees, roles, clients, activities, addPhase, updatePhase, deletePhase, getEmployeeById, modules, addModule, deleteModule, getModulesForApp, expectations, addExpectation, updateExpectation, deleteExpectation, getExpectationsForModule, getGoalById, updateApp, reports, addReport, deleteReport, sprints, addSprint, updateSprint, deleteSprint, getSprintsForApp, getDefectsForApp, getDocumentsForApp } = useApp();
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
  const [activeProfileTab, setActiveProfileTab] = useState<'Overview' | 'Team' | 'Client' | 'Phases' | 'Tasks' | 'Milestones' | 'Defects' | 'Calendar' | 'Documents' | 'GitHub' | 'Sprints' | 'Activity'>('Overview');
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'task' | 'app' | 'goal'>('all');
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewForm, setOverviewForm] = useState({ clientId: '', projectManagerId: '', techStack: '', projectType: '', expectedCompletionDate: '', budgetAmount: '', budgetCurrency: 'USD', budgetNotes: '' });
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [teamSelectId, setTeamSelectId] = useState('');
  const [extraTeamIds, setExtraTeamIds] = useState<string[]>([]);
  const [clientLinkId, setClientLinkId] = useState('');
  const [clientLinkSaving, setClientLinkSaving] = useState(false);

  const app = apps.find(a => a.id === appId);
  const appPhases = phases.filter(p => p.appId === appId);
  const appGoals = goals.filter(g => g.appId === appId);
  const appGoalIds = new Set(appGoals.map(g => g.id));
  const appTasks = tasks.filter(t => appGoalIds.has(t.goalId || ''));
  const appRepositories = repositories.filter(r => r.appId === appId);
  const appDefects = getDefectsForApp(appId);
  const appSprints = getSprintsForApp(appId);
  const appDocuments = getDocumentsForApp(appId);

  useEffect(() => {
    if (app) {
      setPlanningNotesText(app.planningNotes || '');
      if (!overviewEditing) {
        const toInputDate = (d: any) => {
          if (!d) return '';
          const dt = d instanceof Date ? d : new Date(d);
          if (isNaN(dt.getTime())) return '';
          return dt.toISOString().split('T')[0];
        };
        setOverviewForm({
          clientId: app.clientId || '',
          projectManagerId: app.projectManagerId || '',
          techStack: app.techStack || '',
          projectType: app.projectType || '',
          expectedCompletionDate: toInputDate(app.expectedCompletionDate),
          budgetAmount: app.budgetAmount !== undefined && app.budgetAmount !== null ? String(app.budgetAmount) : '',
          budgetCurrency: app.budgetCurrency || 'USD',
          budgetNotes: app.budgetNotes || ''
        });
      }
    }
  }, [app, overviewEditing]);

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
    planned: 'bg-[#E9E9E7]',
    in_progress: 'bg-[#2383E2]',
    completed: 'bg-[#37352F]',
    on_hold: 'bg-[#E9E9E7]'
  };

  const statusIcons: Record<Phase['status'], any> = {
    planned: Clock,
    in_progress: Clock,
    completed: CheckCircle,
    on_hold: PauseCircle
  };

  const stageColors: Record<Phase['stage'], string> = {
    'pre-development': 'bg-[#787774]',
    'development': 'bg-[#2383E2]',
    'post-development': 'bg-[#37352F]'
  };

  const stageLabels: Record<Phase['stage'], string> = {
    'pre-development': 'Pre-Dev',
    'development': 'Dev',
    'post-development': 'Post-Dev'
  };

  const healthScore = appPhases.length > 0 ? Math.round(appPhases.filter(p => p.status === 'completed').length / appPhases.length * 100) : 0;

  if (!app) {
    return (
      <div className="p-8 text-center font-['Inter',sans-serif] bg-[#FFFFFF] min-h-screen">
        <p className="text-[#37352F]">App not found</p>
        <button onClick={() => onNavigate('portfolio')} className="mt-4 text-[#2383E2] hover:underline cursor-pointer text-sm font-medium">
          Back to Portfolio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] font-['Inter',sans-serif]">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => onNavigate('portfolio')}
            className="p-2 hover:bg-[#F7F7F5] rounded-[6px] cursor-pointer transition-colors duration-150 border border-transparent"
          >
            <ArrowLeft className="w-5 h-5 text-[#787774]" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[24px] font-semibold text-[#37352F] tracking-tight truncate">{app.name}</h1>
            <p className="text-[14px] text-[#787774] leading-relaxed">{app.description}</p>
          </div>
          <span className="ml-auto text-xs px-3 py-1 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] font-medium shrink-0">
            {app.status}
          </span>
        </div>

        <div className="flex gap-6 mb-6 border-b border-[#E9E9E7] overflow-x-auto scrollbar-none">
          {([
            { key: 'Overview', icon: ClipboardCheck },
            { key: 'Team', icon: Users },
            { key: 'Client', icon: Building },
            { key: 'Phases', icon: Clock },
            { key: 'Tasks', icon: ListTodo },
            { key: 'Milestones', icon: Target },
            { key: 'Defects', icon: AlertTriangle },
            { key: 'Calendar', icon: Calendar },
            { key: 'Documents', icon: Folder },
            { key: 'GitHub', icon: GitBranch },
            { key: 'Sprints', icon: Layers },
            { key: 'Activity', icon: MessageCircle }
          ] as const).map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveProfileTab(key)}
              className={`flex items-center gap-2 px-1 py-3 text-[14px] font-medium border-b-2 transition-colors duration-150 cursor-pointer whitespace-nowrap -mb-px ${
                activeProfileTab === key
                  ? 'border-[#2383E2] text-[#37352F] font-medium'
                  : 'border-transparent text-[#787774] hover:text-[#37352F]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {key}
            </button>
          ))}
        </div>

        {activeProfileTab === 'Overview' && (() => {
          const client = clients.find(c => c.id === app.clientId);
          const pm = employees.find(e => e.id === app.projectManagerId);
          const techPills = app.techStack ? app.techStack.split(',').map(s => s.trim()).filter(Boolean) : [];
          const expectedDateObj = (() => {
            const v: any = app.expectedCompletionDate;
            if (!v) return undefined;
            if (v instanceof Date) return v;
            if (typeof v.toDate === 'function') return v.toDate();
            const d = new Date(v);
            return isNaN(d.getTime()) ? undefined : d;
          })();
          const expectedDateStr = expectedDateObj ? formatDate(expectedDateObj) : '—';
          return (
          <div className="space-y-6">
            <div className="p-6 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-[#37352F]">Project Details</h3>
                <button
                  onClick={() => {
                    if (overviewEditing) {
                      const toInputDate = (d: any) => {
                        if (!d) return '';
                        const dt = d instanceof Date ? d : typeof d.toDate === 'function' ? d.toDate() : new Date(d);
                        if (isNaN(dt.getTime())) return '';
                        return dt.toISOString().split('T')[0];
                      };
                      setOverviewForm({
                        clientId: app.clientId || '',
                        projectManagerId: app.projectManagerId || '',
                        techStack: app.techStack || '',
                        projectType: app.projectType || '',
                        expectedCompletionDate: toInputDate(app.expectedCompletionDate),
                        budgetAmount: (app as any).budgetAmount !== undefined && (app as any).budgetAmount !== null ? String((app as any).budgetAmount) : '',
                        budgetCurrency: (app as any).budgetCurrency || 'USD',
                        budgetNotes: (app as any).budgetNotes || ''
                      });
                      setOverviewEditing(false);
                    } else {
                      setOverviewEditing(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[6px] border transition-colors duration-150 cursor-pointer ${overviewEditing ? 'bg-white text-[#37352F] border-[#E9E9E7] hover:bg-[#F7F7F5]' : 'bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F7F5] hover:text-[#37352F]'}`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {overviewEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {overviewEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Client</label>
                      <select
                        value={overviewForm.clientId}
                        onChange={e => setOverviewForm({ ...overviewForm, clientId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      >
                        <option value="">No client</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Project Manager</label>
                      <select
                        value={overviewForm.projectManagerId}
                        onChange={e => setOverviewForm({ ...overviewForm, projectManagerId: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      >
                        <option value="">No PM</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Tech Stack</label>
                      <input
                        type="text"
                        value={overviewForm.techStack}
                        onChange={e => setOverviewForm({ ...overviewForm, techStack: e.target.value })}
                        placeholder="e.g. React, Node, Postgres"
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Project Type</label>
                      <input
                        type="text"
                        value={overviewForm.projectType}
                        onChange={e => setOverviewForm({ ...overviewForm, projectType: e.target.value })}
                        placeholder="e.g. Web App, API"
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Expected Completion Date</label>
                      <input
                        type="date"
                        value={overviewForm.expectedCompletionDate}
                        onChange={e => setOverviewForm({ ...overviewForm, expectedCompletionDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Budget Amount</label>
                      <input
                        type="number"
                        step={100}
                        min={0}
                        value={overviewForm.budgetAmount}
                        onChange={e => setOverviewForm({ ...overviewForm, budgetAmount: e.target.value })}
                        placeholder="Amount"
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Currency</label>
                      <select
                        value={overviewForm.budgetCurrency}
                        onChange={e => setOverviewForm({ ...overviewForm, budgetCurrency: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="NGN">NGN</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Budget Notes</label>
                      <input
                        type="text"
                        value={overviewForm.budgetNotes}
                        onChange={e => setOverviewForm({ ...overviewForm, budgetNotes: e.target.value })}
                        placeholder="Budget notes (optional)"
                        className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Status</label>
                      <div className="px-3 py-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] text-[14px] text-[#37352F]">{app.status}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setOverviewSaving(true);
                        await updateApp(appId, {
                          clientId: overviewForm.clientId || '',
                          projectManagerId: overviewForm.projectManagerId || '',
                          techStack: overviewForm.techStack.trim(),
                          projectType: overviewForm.projectType.trim(),
                          expectedCompletionDate: overviewForm.expectedCompletionDate ? new Date(overviewForm.expectedCompletionDate) : null as any,
                          budgetAmount: overviewForm.budgetAmount ? Number(overviewForm.budgetAmount) : undefined,
                          budgetCurrency: overviewForm.budgetCurrency || 'USD',
                          budgetNotes: overviewForm.budgetNotes.trim() || undefined
                        } as any);
                        setOverviewSaving(false);
                        setOverviewEditing(false);
                      }}
                      disabled={overviewSaving}
                      className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium hover:bg-[#1A6FBF] disabled:opacity-50 transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none"
                    >
                      {overviewSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setOverviewEditing(false)}
                      className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer rounded-[6px] shadow-none"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Client</p>
                    <p className="text-[14px] font-medium text-[#37352F]">{client ? client.name : <span className="text-[#787774]">—</span>}</p>
                    {client?.company && <p className="text-[12px] text-[#787774]">{client.company}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Project Manager</p>
                    <p className="text-[14px] font-medium text-[#37352F]">{pm ? pm.name : <span className="text-[#787774]">—</span>}</p>
                    {pm?.email && <p className="text-[12px] text-[#787774]">{pm.email}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Tech Stack</p>
                    {techPills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {techPills.map((t, i) => (
                          <span key={i} className="text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">{t}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[14px] text-[#787774]">—</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Project Type</p>
                    {app.projectType ? (
                      <span className="inline-flex text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">{app.projectType}</span>
                    ) : (
                      <p className="text-[14px] text-[#787774]">—</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Expected Completion</p>
                    <p className="text-[14px] font-medium text-[#37352F]">{expectedDateStr}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Status</p>
                    <span className="inline-flex text-xs px-2.5 py-1 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] font-medium">{app.status}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Budget</p>
                    {(app as any).budgetAmount !== undefined && (app as any).budgetAmount !== null ? (
                      <span className="inline-flex text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774] font-medium">
                        {(() => {
                          const amt = (app as any).budgetAmount as number;
                          const cur = (app as any).budgetCurrency || 'USD';
                          const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };
                          const sym = symbols[cur] || cur;
                          return `${sym} ${amt.toLocaleString()} ${cur}`;
                        })()}
                      </span>
                    ) : (
                      <p className="text-[14px] text-[#787774]">—</p>
                    )}
                    {(app as any).budgetNotes && <p className="text-[12px] text-[#787774] mt-1">{(app as any).budgetNotes}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
              <h3 className="text-[15px] font-semibold text-[#37352F] mb-4">Planning Notes</h3>
              <textarea
                value={planningNotesText}
                onChange={(e) => setPlanningNotesText(e.target.value)}
                className="w-full bg-white border border-[#E0E0DE] text-[#37352F] p-4 h-48 resize-none outline-none rounded-[6px] text-[14px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                placeholder="Record meeting notes, requirements discussions, research findings, and planning decisions..."
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => updateApp(appId, { planningNotes: planningNotesText })}
                  className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none"
                >
                  Save Notes
                </button>
              </div>
            </div>

            {(() => {
              const taskAssigneeIds = new Set<string>();
              appTasks.forEach(t => (t.assignedTo || []).forEach(id => taskAssigneeIds.add(id)));
              const overviewTeamIds = new Set<string>([...taskAssigneeIds, ...extraTeamIds]);
              if (app.projectManagerId) overviewTeamIds.add(app.projectManagerId);
              const overviewTeam = Array.from(overviewTeamIds).map(id => getEmployeeById(id) || employees.find(e => e.id === id)).filter(Boolean) as typeof employees;
              return (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[#787774]" />
                    <span className="text-[13px] font-medium text-[#787774]">Team</span>
                  </div>
                  <p className="text-[#37352F] text-xl font-semibold">{overviewTeam.length}</p>
                  <div className="mt-2 space-y-1">
                    {overviewTeam.slice(0, 5).map(emp => (
                      <p key={emp.id} className="text-xs text-[#787774]">{emp.name}</p>
                    ))}
                    {overviewTeam.length === 0 && <p className="text-xs text-[#9B9A97]">No members yet</p>}
                  </div>
                </div>
                <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-[#787774]" />
                    <span className="text-[13px] font-medium text-[#787774]">Health</span>
                  </div>
                  <p className="text-[#37352F] text-xl font-semibold">{healthScore}%</p>
                  <p className="text-xs text-[#787774] mt-1">{appPhases.filter(p => p.status === 'completed').length}/{appPhases.length} phases done</p>
                </div>
                <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-[#787774]" />
                    <span className="text-[13px] font-medium text-[#787774]">Key Dates</span>
                  </div>
                  <p className="text-[#37352F] text-sm font-medium">{appPhases.length} phases</p>
                  <p className="text-xs text-[#787774] mt-1">{appPhases.filter(p => p.status === 'in_progress').length} in progress</p>
                </div>
              </div>
              );
            })()}

            <div className="p-6 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
              <h3 className="text-[15px] font-semibold text-[#37352F] mb-4">Phase Status</h3>
              {appPhases.length === 0 ? (
                <p className="text-[#787774] text-center py-4 text-sm">No phases yet.</p>
              ) : (
                <div className="space-y-2">
                  {appPhases.map(phase => {
                    const StatusIcon = statusIcons[phase.status];
                    return (
                      <div key={phase.id} className="flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-[6px] cursor-pointer hover:bg-[#F7F7F5] transition-colors duration-150" onClick={() => togglePhase(phase.id)}>
                        <StatusIcon className={`w-5 h-5 ${statusColors[phase.status].replace('bg-', 'text-')}`} />
                        <span className="text-[#37352F] font-medium flex-1 text-[14px]">{phase.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${statusColors[phase.status]}`}>{phase.status.replace('_', ' ')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${stageColors[phase.stage]}`}>{stageLabels[phase.stage]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
              <h3 className="text-[15px] font-semibold text-[#37352F] mb-4">Recent Activity</h3>
              {activities.filter(a => a.relatedTo?.id === appId || activities.length === 0).length === 0 && activities.length === 0 ? (
                <p className="text-[#787774] text-center py-4 text-sm">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 10).map(act => (
                    <div key={act.id} className="flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-[6px]">
                      <div className="p-2 bg-[#F7F7F5] rounded-[6px] border border-[#E9E9E7]">
                        <Activity className="w-4 h-4 text-[#787774]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[#37352F] text-[14px]">{act.description}</p>
                        <p className="text-xs text-[#9B9A97]">{act.userName} · {formatDate(act.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {activeProfileTab === 'Team' && (() => {
          const taskAssigneeIds = new Set<string>();
          appTasks.forEach(t => (t.assignedTo || []).forEach(id => taskAssigneeIds.add(id)));
          const teamIds = new Set<string>([...extraTeamIds]);
          taskAssigneeIds.forEach(id => teamIds.add(id));
          if (app.projectManagerId) teamIds.add(app.projectManagerId);
          const teamList = Array.from(teamIds).map(id => getEmployeeById(id) || employees.find(e => e.id === id)).filter(Boolean) as typeof employees;
          const pmId = app.projectManagerId;
          const getTaskCount = (empId: string) => appTasks.filter(t => (t.assignedTo || []).includes(empId)).length;
          const getRoleName = (emp: typeof employees[number]) => roles.find(r => r.id === emp.roleId)?.name || 'Team member';
          const availableEmployees = employees.filter(e => !teamIds.has(e.id));
          const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
          return (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[18px] font-semibold text-[#37352F] tracking-tight">Team</h2>
                  <p className="text-[13px] text-[#787774] mt-1">Members assigned to this project — from tasks and project manager. {teamList.length} member{teamList.length !== 1 ? 's' : ''} · {appTasks.length} tasks</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] font-medium shrink-0">{teamList.length} members</span>
              </div>
              <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-[#787774] uppercase tracking-wide mb-1.5">Assign member</label>
                  <select
                    value={teamSelectId}
                    onChange={e => setTeamSelectId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                  >
                    <option value="">Select employee</option>
                    {availableEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} — {getRoleName(emp)}</option>
                    ))}
                    {availableEmployees.length === 0 && <option disabled>No more employees to add</option>}
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!teamSelectId) return;
                    if (teamIds.has(teamSelectId)) return;
                    setExtraTeamIds(prev => [...prev, teamSelectId]);
                    setTeamSelectId('');
                  }}
                  disabled={!teamSelectId}
                  className="self-start sm:self-end px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] border border-[#2383E2] hover:bg-[#1A6FBF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer shrink-0"
                >
                  Add
                </button>
              </div>
              {teamList.length === 0 ? (
                <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
                  <Users className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
                  <p className="text-[14px] font-medium text-[#37352F]">No team members yet</p>
                  <p className="text-[13px] text-[#787774] mt-1 max-w-md mx-auto">Assign members from tasks or add them with the selector above. The project manager will appear highlighted when set.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamList.map(emp => {
                    const isPM = emp.id === pmId;
                    const taskCount = getTaskCount(emp.id);
                    const roleName = getRoleName(emp);
                    return (
                      <div key={emp.id} className={`bg-white border rounded-[8px] p-4 hover:bg-[#F7F7F5] transition-colors duration-150 ${isPM ? 'border-[#2383E2] ring-1 ring-[#2383E2]' : 'border-[#E9E9E7]'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 flex items-center justify-center rounded-[6px] text-[12px] font-semibold shrink-0 ${isPM ? 'bg-[#2383E2] text-white' : 'bg-[#E9E9E7] text-[#37352F]'}`}>
                            {initials(emp.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[14px] font-medium text-[#37352F] truncate">{emp.name}</p>
                              {isPM && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2383E2] text-white font-medium border border-[#2383E2]">PM</span>}
                            </div>
                            <p className="text-[12px] text-[#787774] truncate">{roleName}</p>
                            <p className="text-[12px] text-[#787774] truncate">{emp.email}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (isPM) {
                                updateApp(appId, { projectManagerId: '' } as any);
                              } else {
                                setExtraTeamIds(prev => prev.filter(id => id !== emp.id));
                              }
                            }}
                            className="p-1 text-[#9B9A97] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150 cursor-pointer"
                            title={isPM ? 'Remove PM' : 'Remove from team'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774] font-medium">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
                          {taskCount === 0 && <span className="text-xs text-[#9B9A97]">No tasks assigned</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeProfileTab === 'Client' && (() => {
          const linkedClient = clients.find(c => c.id === app.clientId);
          const linkedProjects = linkedClient ? apps.filter(a => a.clientId === linkedClient.id) : [];
          const statusStyle = linkedClient ? (linkedClient.status === 'active' ? 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]' : linkedClient.status === 'inactive' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' : 'bg-white text-[#787774] border-[#E9E9E7]') : '';
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-[18px] font-semibold text-[#37352F] tracking-tight">Client</h2>
                <p className="text-[13px] text-[#787774] mt-1">Client profile linked to this project. Clean, Notion-style page with contact and relationship context.</p>
              </div>
              {!linkedClient ? (
                <div className="space-y-4">
                  <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
                    <h3 className="text-[14px] font-medium text-[#37352F] mb-1">No client linked</h3>
                    <p className="text-[13px] text-[#787774] mb-4">Select a client from your workspace to link it to this project.</p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-[#787774] uppercase tracking-wide mb-1.5">Client</label>
                        <select
                          value={clientLinkId}
                          onChange={e => setClientLinkId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                        >
                          <option value="">Select client</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                          ))}
                        </select>
                        {clients.length === 0 && <p className="text-xs text-[#9B9A97] mt-2">No clients in workspace yet. Create one from the Clients page.</p>}
                      </div>
                      <button
                        onClick={async () => {
                          if (!clientLinkId) return;
                          setClientLinkSaving(true);
                          await updateApp(appId, { clientId: clientLinkId } as any);
                          setClientLinkSaving(false);
                          setClientLinkId('');
                        }}
                        disabled={!clientLinkId || clientLinkSaving}
                        className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] border border-[#2383E2] hover:bg-[#1A6FBF] disabled:opacity-50 transition-colors duration-150 cursor-pointer shrink-0"
                      >
                        {clientLinkSaving ? 'Linking…' : 'Link'}
                      </button>
                    </div>
                  </div>
                  {clients.length > 0 && (
                    <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
                      <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide mb-3">Available clients · {clients.length}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {clients.slice(0,6).map(c => (
                          <div key={c.id} className="flex items-center gap-3 p-3 border border-[#E9E9E7] rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150">
                            <div className="w-8 h-8 bg-[#E9E9E7] rounded-[6px] flex items-center justify-center shrink-0">
                              <Building className="w-4 h-4 text-[#37352F]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-[#37352F] truncate">{c.name}</p>
                              <p className="text-[12px] text-[#787774] truncate">{c.company || '—'}</p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 ${c.status === 'active' ? 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]' : 'bg-white text-[#787774] border-[#E9E9E7]'}`}>{c.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-[#E9E9E7] rounded-[6px] flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5 text-[#37352F]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[16px] font-semibold text-[#37352F] truncate">{linkedClient.name}</h3>
                          {linkedClient.company && <p className="text-[13px] text-[#787774] truncate">{linkedClient.company}</p>}
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full font-medium border shrink-0 capitalize ${statusStyle}`}>{linkedClient.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {linkedClient.email && (
                        <a href={`mailto:${linkedClient.email}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white border border-[#E9E9E7] rounded-full text-[#2383E2] hover:bg-[#F7F7F5] transition-colors duration-150">
                          <Mail className="w-3 h-3" />{linkedClient.email}
                        </a>
                      )}
                      {linkedClient.phone && (
                        <a href={`tel:${linkedClient.phone}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white border border-[#E9E9E7] rounded-full text-[#2383E2] hover:bg-[#F7F7F5] transition-colors duration-150">
                          <Phone className="w-3 h-3" />{linkedClient.phone}
                        </a>
                      )}
                      {!linkedClient.email && !linkedClient.phone && <span className="text-xs text-[#9B9A97]">No contact details</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E9E9E7]">
                      <div>
                        <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Address</p>
                        <p className="text-[13px] text-[#787774] mt-1 leading-relaxed">{linkedClient.address || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Linked projects</p>
                        <p className="text-[13px] text-[#37352F] mt-1 font-medium">{linkedProjects.length} project{linkedProjects.length !== 1 ? 's' : ''}</p>
                        {linkedProjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {linkedProjects.slice(0,5).map(p => (
                              <span key={p.id} className="text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">{p.name}</span>
                            ))}
                            {linkedProjects.length > 5 && <span className="text-xs text-[#9B9A97]">+{linkedProjects.length - 5} more</span>}
                          </div>
                        )}
                      </div>
                      {linkedClient.contactPerson && (
                        <div>
                          <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Contact person</p>
                          <p className="text-[13px] text-[#37352F] mt-1">{linkedClient.contactPerson}</p>
                        </div>
                      )}
                      {linkedClient.industry && (
                        <div>
                          <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Industry</p>
                          <p className="text-[13px] text-[#787774] mt-1">{linkedClient.industry}</p>
                        </div>
                      )}
                    </div>
                    {linkedClient.notes && (
                      <div className="mt-4 pt-4 border-t border-[#E9E9E7]">
                        <p className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide mb-1.5">Notes</p>
                        <p className="text-[13px] text-[#787774] leading-relaxed whitespace-pre-wrap">{linkedClient.notes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#E9E9E7]">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-[#787774] uppercase tracking-wide mb-1.5">Switch client</label>
                        <select
                          value={clientLinkId}
                          onChange={e => setClientLinkId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                        >
                          <option value="">Select another client</option>
                          {clients.filter(c => c.id !== linkedClient.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={async () => {
                          if (!clientLinkId) return;
                          setClientLinkSaving(true);
                          await updateApp(appId, { clientId: clientLinkId } as any);
                          setClientLinkSaving(false);
                          setClientLinkId('');
                        }}
                        disabled={!clientLinkId || clientLinkSaving}
                        className="self-end px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] border border-[#2383E2] hover:bg-[#1A6FBF] disabled:opacity-50 transition-colors duration-150 cursor-pointer shrink-0"
                      >
                        Link
                      </button>
                      <button
                        onClick={async () => {
                          await updateApp(appId, { clientId: '' } as any);
                        }}
                        className="self-end px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer shrink-0"
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeProfileTab === 'Phases' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-semibold text-[#37352F]">Phases ({appPhases.length})</h2>
              </div>
              {hasPermission('create_app') && (
                <button
                  onClick={() => {
                    setShowAddPhase(!showAddPhase);
                    setEditingPhase(null);
                    setFormData({ name: '', details: '', notes: '', status: 'planned', stage: 'pre-development', startDate: '', endDate: '', sprintCount: '', techStack: '', qaCriteria: '', deploymentTarget: '' });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none"
                >
                  <Plus className="w-4 h-4" />
                  Add Phase
                </button>
              )}
            </div>

            {(showAddPhase || editingPhase) && (
              <form onSubmit={handleSubmit} className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px] space-y-4 shadow-none">
                <h3 className="text-[15px] font-semibold text-[#37352F]">
                  {editingPhase ? 'Edit Phase' : 'New Phase'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Phase Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      placeholder="e.g. MVP1, Phase 2, Beta"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Phase['status'] })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Stage</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => setFormData({ ...formData, stage: e.target.value as Phase['stage'] })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                    >
                      <option value="pre-development">Pre-Development</option>
                      <option value="development">Development</option>
                      <option value="post-development">Post-Development</option>
                    </select>
                  </div>
                  {formData.stage === 'development' && (
                    <>
                      <div>
                        <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Sprint Count</label>
                        <input
                          type="number"
                          value={formData.sprintCount}
                          onChange={(e) => setFormData({ ...formData, sprintCount: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                          placeholder="e.g. 6"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Tech Stack</label>
                        <input
                          type="text"
                          value={formData.techStack}
                          onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                          placeholder="e.g. React, Node.js, PostgreSQL"
                        />
                      </div>
                    </>
                  )}
                  {formData.stage === 'post-development' && (
                    <>
                      <div>
                        <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">QA Criteria</label>
                        <input
                          type="text"
                          value={formData.qaCriteria}
                          onChange={(e) => setFormData({ ...formData, qaCriteria: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                          placeholder="e.g. All critical bugs resolved, 95% test coverage"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Deployment Target</label>
                        <input
                          type="text"
                          value={formData.deploymentTarget}
                          onChange={(e) => setFormData({ ...formData, deploymentTarget: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                          placeholder="e.g. Production v2.0, Staging v1.5"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Phase Details</label>
                    <textarea
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] h-24 resize-none outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      placeholder="Describe the scope, objectives, and key deliverables of this phase..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[13px] font-medium text-[#37352F] mb-1.5">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] h-16 resize-none outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
                      placeholder="Additional notes, reminders, or observations..."
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-[#2383E2] text-white font-medium text-[14px] hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none">
                    {editingPhase ? 'Update' : 'Create'} Phase
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddPhase(false); setEditingPhase(null); }}
                    className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer rounded-[6px] shadow-none"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {appPhases.length === 0 && !showAddPhase && (
              <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                <Clock className="w-12 h-12 text-[#9B9A97] mx-auto mb-3" />
                <p className="text-[#787774] text-sm">No phases yet. Add your first phase to get started.</p>
              </div>
            )}

            <div className="space-y-3">
              {appPhases.map(phase => {
                const phaseGoals = goals.filter(g => g.phaseId === phase.id);
                const isExpanded = expandedPhases.has(phase.id);
                const StatusIcon = statusIcons[phase.status];

                return (
                  <div key={phase.id} className="bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                    <button onClick={() => togglePhase(phase.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer rounded-[8px]">
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-[#787774]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[#787774]" />
                        )}
                      </div>
                      <div className={`p-2 rounded-[6px] ${statusColors[phase.status]}`}>
                        <StatusIcon className={`w-5 h-5 ${statusColors[phase.status].replace('bg-', 'text-') === 'bg-[#E9E9E7]' ? 'text-[#787774]' : statusColors[phase.status].replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[15px] font-semibold text-[#37352F]">{phase.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${statusColors[phase.status]}`}>
                            {phase.status.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${stageColors[phase.stage]}`}>
                            {stageLabels[phase.stage]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[13px] text-[#787774]">
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
                          <p className="text-[13px] text-[#787774] mt-1 line-clamp-1">{phase.details}</p>
                        )}
                        {phase.notes && !isExpanded && (
                          <p className="text-xs text-[#787774] mt-0.5 italic truncate">Note: {phase.notes}</p>
                        )}
                      </div>
                      {hasPermission('create_app') && (
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(phase)}
                            className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] cursor-pointer transition-colors duration-150"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(phase.id)}
                            className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] cursor-pointer transition-colors duration-150"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-[#E9E9E7]">
                        <div className="p-4 space-y-4">
                          {phase.details && (
                            <div>
                              <h4 className="text-[13px] font-semibold text-[#37352F] mb-2">Phase Details</h4>
                              <p className="text-[14px] text-[#787774] whitespace-pre-wrap leading-relaxed">{phase.details}</p>
                            </div>
                          )}
                          {phase.notes && (
                            <div className="p-3 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                              <h4 className="text-xs font-medium text-[#787774] mb-1">Notes</h4>
                              <p className="text-[14px] text-[#787774] whitespace-pre-wrap italic">{phase.notes}</p>
                            </div>
                          )}
                          {phase.stage === 'development' && (phase.sprintCount || phase.techStack) && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                              {phase.sprintCount && (
                                <div>
                                  <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Sprints</span>
                                  <p className="text-[14px] text-[#37352F] mt-0.5">{phase.sprintCount}</p>
                                </div>
                              )}
                              {phase.techStack && (
                                <div>
                                  <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Tech Stack</span>
                                  <p className="text-[14px] text-[#37352F] mt-0.5">{phase.techStack}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {phase.stage === 'post-development' && (phase.qaCriteria || phase.deploymentTarget) && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px]">
                              {phase.qaCriteria && (
                                <div>
                                  <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">QA Criteria</span>
                                  <p className="text-[14px] text-[#37352F] mt-0.5">{phase.qaCriteria}</p>
                                </div>
                              )}
                              {phase.deploymentTarget && (
                                <div>
                                  <span className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wide">Deployment Target</span>
                                  <p className="text-[14px] text-[#37352F] mt-0.5">{phase.deploymentTarget}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="border-t border-[#E9E9E7] pt-4">
                            <h4 className="text-[14px] font-semibold text-[#37352F] mb-3">Goals ({phaseGoals.length})</h4>
                            {phaseGoals.length === 0 ? (
                              <p className="text-sm text-[#787774] text-center py-4">No goals in this phase</p>
                            ) : (
                              <div className="space-y-3">
                                {phaseGoals.map(goal => {
                                  const goalTasks = tasks.filter(t => t.goalId === goal.id);
                                  const completedTasks = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
                                  return (
                                    <div key={goal.id} className="p-4 bg-white border border-[#E9E9E7] rounded-[6px]">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <Target className="w-5 h-5 text-[#787774]" />
                                          <div>
                                            <h4 className="font-medium text-[#37352F] text-[14px]">{goal.name}</h4>
                                            <p className="text-[13px] text-[#787774]">{goal.description}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-[13px] text-[#787774]">{completedTasks}/{goalTasks.length} tasks</p>
                                        </div>
                                      </div>
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

            <div className="mt-8 border-t border-[#E9E9E7] pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-[#787774]" />
                  <h2 className="text-[18px] font-semibold text-[#37352F]">Modules</h2>
                </div>
                {hasPermission('manage_modules') && (
                  <button
                    onClick={() => setShowModules(!showModules)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none"
                  >
                    <Plus className="w-4 h-4" />
                    {showModules ? 'Cancel' : 'New Module'}
                  </button>
                )}
              </div>
              {showModules && hasPermission('manage_modules') && currentUser && (
                <div className="mb-4 p-3 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] flex gap-2">
                  <input
                    type="text"
                    value={moduleFormName}
                    onChange={(e) => setModuleFormName(e.target.value)}
                    placeholder="Module name..."
                    className="flex-1 px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
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
                    className="px-4 py-2 bg-[#2383E2] text-white font-medium text-[14px] disabled:opacity-50 cursor-pointer rounded-[6px] border border-[#2383E2] hover:bg-[#1A6FBF] transition-colors duration-150 shadow-none"
                  >
                    Create
                  </button>
                </div>
              )}
              {(() => {
                const appModules = getModulesForApp(appId);
                return appModules.length === 0 ? (
                  <p className="text-sm text-[#787774] text-center py-6">No modules yet for this app</p>
                ) : (
                  <div className="space-y-3">
                    {appModules.map(mod => {
                      const modExps = getExpectationsForModule(mod.id);
                      const modAchieved = modExps.filter(e => e.status === 'achieved').length;
                      return (
                        <div key={mod.id} className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 shadow-none">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-[#37352F] text-[14px]">{mod.name}</h3>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${mod.status === 'open' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' : 'bg-[#F7F7F5] text-[#9B9A97] border-[#E9E9E7]'}`}>
                                {mod.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {modExps.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-16 h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#2383E2] rounded-full" style={{ width: `${(modAchieved / modExps.length) * 100}%` }} />
                                  </div>
                                  <span className="text-xs text-[#787774]">{modAchieved}/{modExps.length}</span>
                                </div>
                              )}
                              {hasPermission('manage_modules') && (
                                <button onClick={() => deleteModule(mod.id)} className="p-1 text-[#9B9A97] hover:text-[#37352F] cursor-pointer rounded-[4px] hover:bg-[#F7F7F5] transition-colors duration-150">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {modExps.map(exp => (
                              <div key={exp.id} className="flex items-start gap-2 p-2 bg-white border border-[#E9E9E7] rounded-[6px]">
                                <button
                                  onClick={() => updateExpectation(exp.id, { status: exp.status === 'achieved' ? 'pending' : 'achieved' })}
                                  className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-150 ${
                                    exp.status === 'achieved' ? 'bg-[#2383E2] border-[#2383E2] text-white' :
                                    exp.status === 'missed' ? 'bg-[#37352F] border-[#37352F] text-white' :
                                    'border-[#E0E0DE] hover:border-[#787774] bg-white'
                                  }`}
                                >
                                  {(exp.status === 'achieved' || exp.status === 'missed') && (
                                    exp.status === 'achieved' ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[13px] ${exp.status === 'missed' ? 'text-[#9B9A97] line-through' : 'text-[#37352F]'}`}>
                                    {exp.description}
                                  </p>
                                  {exp.taskId && (
                                    <span className="text-[11px] text-[#2383E2] flex items-center gap-0.5 mt-0.5">
                                      <Link className="w-2.5 h-2.5" /> {tasks.find(t => t.id === exp.taskId)?.name || 'Unknown'}
                                    </span>
                                  )}
                                </div>
                                {hasPermission('manage_modules') && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                      onClick={() => setLinkingExpId(linkingExpId === exp.id ? null : exp.id)}
                                      className={`p-1 rounded-[4px] hover:bg-[#F7F7F5] transition-colors duration-150 ${exp.taskId ? 'text-[#2383E2]' : 'text-[#9B9A97]'} hover:text-[#37352F] cursor-pointer`}
                                    >
                                      <Link className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => updateExpectation(exp.id, { status: exp.status === 'missed' ? 'pending' : 'missed' })}
                                      className="p-1 text-[#9B9A97] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[4px] cursor-pointer transition-colors duration-150"
                                    >
                                      <Flag className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteExpectation(exp.id)} className="p-1 text-[#9B9A97] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[4px] cursor-pointer transition-colors duration-150">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
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
                                className="flex-1 px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[13px] outline-none rounded-[6px] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
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
                                  className="px-3 py-2 bg-[#2383E2] text-white text-xs font-medium disabled:opacity-50 cursor-pointer rounded-[6px] border border-[#2383E2] hover:bg-[#1A6FBF] transition-colors duration-150 shadow-none"
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
            <h2 className="text-[18px] font-semibold text-[#37352F]">Tasks ({appTasks.length})</h2>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-[#9B9A97]" />
              <select className="px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150">
                <option value="all">All Tasks</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="pending_qa">Pending QA</option>
                <option value="completed">Completed</option>
                <option value="approved">Approved</option>
              </select>
              <select className="px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150">
                <option value="list">List</option>
                <option value="kanban">Kanban</option>
                <option value="timeline">Timeline</option>
              </select>
            </div>
            {appTasks.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                <ListTodo className="w-12 h-12 text-[#9B9A97] mx-auto mb-3" />
                <p className="text-[#787774] text-sm">No tasks yet for this app.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appTasks.map(task => {
                  const goal = goals.find(g => g.id === task.goalId);
                  return (
                    <div key={task.id} className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 shadow-none hover:bg-[#F7F7F5] transition-colors duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckSquare className={`w-5 h-5 ${
                            task.status === 'approved' ? 'text-[#2383E2]' :
                            task.status === 'completed' ? 'text-[#37352F]' :
                            task.status === 'in_progress' ? 'text-[#2383E2]' :
                            task.status === 'blocked' ? 'text-[#9B9A97]' :
                            'text-[#9B9A97]'
                          }`} />
                          <div>
                            <h4 className="font-medium text-[#37352F] text-[14px]">{task.name}</h4>
                            <p className="text-xs text-[#787774] mt-0.5">
                              {goal?.name && <span className="text-[#2383E2]">Goal: {goal.name}</span>}
                              {task.assignedTo.length > 0 && (
                                <span> · Assigned: {getEmployeeById(task.assignedTo[0])?.name || 'Unknown'}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          task.status === 'approved' ? 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]' :
                          task.status === 'completed' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' :
                          task.status === 'in_progress' ? 'bg-[#2383E2] text-white border-[#2383E2]' :
                          task.status === 'blocked' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' :
                          'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <TasksModule />
          </div>
        )}

        {activeProfileTab === 'Milestones' && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-[#37352F]">Milestones ({appGoals.length})</h2>
            {appGoals.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                <Target className="w-12 h-12 text-[#9B9A97] mx-auto mb-3" />
                <p className="text-[#787774] text-sm">No milestones yet for this app.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appGoals.map(goal => {
                  const goalTasks = tasks.filter(t => t.goalId === goal.id);
                  const completedTasks = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
                  const phase = phases.find(p => p.id === goal.phaseId);
                  return (
                    <div key={goal.id} className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 shadow-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Target className="w-5 h-5 text-[#787774]" />
                          <div>
                            <h4 className="font-medium text-[#37352F] text-[14px]">{goal.name}</h4>
                            <p className="text-[13px] text-[#787774]">{goal.description}</p>
                            {phase && (
                              <span className="text-xs text-[#2383E2]">Phase: {phase.name}</span>
                            )}
                            {goal.startDate && (
                              <span className="text-xs text-[#9B9A97] ml-2">Start: {formatDate(goal.startDate)}</span>
                            )}
                            {goal.endDate && (
                              <span className="text-xs text-[#9B9A97] ml-2">End: {formatDate(goal.endDate)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] text-[#787774]">{completedTasks}/{goalTasks.length} tasks</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <GoalsModule />
          </div>
        )}

        {activeProfileTab === 'Defects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[#37352F]">Defects ({appDefects.length})</h2>
            </div>
            {appDefects.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                <AlertTriangle className="w-12 h-12 text-[#9B9A97] mx-auto mb-3" />
                <p className="text-[#787774] text-sm">No defects found for this project.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                    <p className="text-[#37352F] text-xl font-semibold">{appDefects.length}</p>
                    <p className="text-xs text-[#787774]">Total</p>
                  </div>
                  <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                    <p className="text-[#37352F] text-xl font-semibold">{appDefects.filter(d => d.status === 'open').length}</p>
                    <p className="text-xs text-[#787774]">Open</p>
                  </div>
                  <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                    <p className="text-[#37352F] text-xl font-semibold">{appDefects.filter(d => d.status === 'pending_qa').length}</p>
                    <p className="text-xs text-[#787774]">Pending QA</p>
                  </div>
                  <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                    <p className="text-[#37352F] text-xl font-semibold">{appDefects.filter(d => d.status === 'closed').length}</p>
                    <p className="text-xs text-[#787774]">Closed</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {appDefects.map(defect => (
                    <div key={defect.id} className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 shadow-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs text-[#2383E2]">{defect.defectCode}</span>
                          <h4 className="font-medium text-[#37352F] text-[14px] mt-1">{defect.title}</h4>
                          <p className="text-xs text-[#787774] mt-0.5">{defect.module}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            defect.severity === 'blocker' ? 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]' :
                            defect.severity === 'critical' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' :
                            defect.severity === 'major' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' :
                            'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'
                          }`}>
                            {defect.severity}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            defect.status === 'open' ? 'bg-[#2383E2] text-white border-[#2383E2]' :
                            defect.status === 'in_progress' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' :
                            defect.status === 'pending_qa' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' :
                            defect.status === 'resolved' ? 'bg-[#F7F7F5] text-[#37352F] border-[#E9E9E7]' :
                            'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'
                          }`}>
                            {defect.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DefectDashboard />
          </div>
        )}

        {activeProfileTab === 'Calendar' && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-[#37352F]">Project Calendar</h2>
            <CalendarPage />
          </div>
        )}

        {activeProfileTab === 'Documents' && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-[#37352F]">Documents ({appDocuments.length})</h2>
            <EngineeringDocsSection appId={appId} />
          </div>
        )}

        {activeProfileTab === 'GitHub' && (
          <div className="space-y-4">
            {selectedRepo ? (
              (() => {
                const repo = repositories.find(r => r.id === selectedRepo);
                if (!repo) return <p className="text-[#787774] text-sm">Repository not found.</p>;
                return <RepositoryBrowser repo={repo} onBack={() => setSelectedRepo(null)} />;
              })()
            ) : (
              <>
                <h2 className="text-[18px] font-semibold text-[#37352F]">GitHub Repositories ({appRepositories.length})</h2>
                {appRepositories.length === 0 ? (
                  <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                    <GitBranch className="w-12 h-12 text-[#9B9A97] mx-auto mb-3" />
                    <p className="text-[#787774] text-sm">No repositories linked to this app yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appRepositories.map(repo => (
                      <button
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo.id)}
                        className="w-full text-left bg-white border border-[#E9E9E7] rounded-[8px] p-4 hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer shadow-none"
                      >
                        <div className="flex items-center gap-3">
                          <GitBranch className="w-5 h-5 text-[#787774]" />
                          <div>
                            <h4 className="font-medium text-[#37352F] text-[14px]">{repo.name}</h4>
                            {repo.description && (
                              <p className="text-[13px] text-[#787774]">{repo.description}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#9B9A97] ml-auto" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeProfileTab === 'Sprints' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[#37352F]">Sprints ({appSprints.length})</h2>
              {hasPermission('manage_sprints') && (
                <button
                  onClick={() => {
                    const name = prompt('Sprint name:');
                    if (name) {
                      addSprint({ appId, name: name.trim(), status: 'planned', createdBy: currentUser?.id || '' });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none"
                >
                  <Plus className="w-4 h-4" />
                  New Sprint
                </button>
              )}
            </div>
            {appSprints.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
                <Layers className="w-12 h-12 text-[#9B9A97] mx-auto mb-3" />
                <p className="text-[#787774] text-sm">No sprints for this project yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appSprints.map(sprint => {
                  const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
                  const sprintGoals = goals.filter(g => g.appId === appId);
                  return (
                    <div key={sprint.id} className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 shadow-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-[#37352F] text-[14px]">{sprint.name}</h4>
                          <p className="text-xs text-[#9B9A97] mt-0.5">
                            {sprint.startDate && formatDate(sprint.startDate)} → {sprint.endDate && formatDate(sprint.endDate)}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              sprint.status === 'active' ? 'bg-[#2383E2] text-white border-[#2383E2]' :
                              sprint.status === 'completed' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' :
                              'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'
                            }`}>
                              {sprint.status}
                            </span>
                            <span className="text-xs text-[#787774]">{sprintTasks.length} tasks</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {hasPermission('manage_sprints') && (
                            <>
                              <button
                                onClick={() => updateSprint(sprint.id, { status: sprint.status === 'active' ? 'completed' : 'active' })}
                                className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] cursor-pointer transition-colors duration-150 border border-transparent hover:border-[#E9E9E7]"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this sprint?')) deleteSprint(sprint.id);
                                }}
                                className="p-2 text-[#9B9A97] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] cursor-pointer transition-colors duration-150 border border-transparent hover:border-[#E9E9E7]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <SprintsPage />
          </div>
        )}

        {activeProfileTab === 'Activity' && (() => {
          const taskIdsForApp = new Set(appTasks.map(t => t.id));
          const projectActivities = activities.filter(a => {
            const rt = a.relatedTo;
            if (!rt) return false;
            if (rt.type === 'app' && rt.id === appId) return true;
            if (rt.type === 'goal' && appGoalIds.has(rt.id)) return true;
            if (rt.type === 'task' && taskIdsForApp.has(rt.id)) return true;
            if (rt.type === 'goal') {
              const g = goals.find(g => g.id === rt.id);
              if (g && g.appId === appId) return true;
            }
            return false;
          }).slice(0, 50);
          const filteredActivities = activityFilter === 'all' ? projectActivities : projectActivities.filter(a => a.relatedTo?.type === activityFilter);
          const getInitial = (name: string) => (name || '?').trim().charAt(0).toUpperCase();
          const formatActivityTime = (d: any) => {
            const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
            if (!dt || isNaN(dt.getTime())) return '';
            try { return formatDistanceToNow(dt, { addSuffix: true }); } catch { return formatDate(dt); }
          };
          const typeLabel: Record<string, string> = {
            task_created: 'task',
            task_completed: 'task',
            task_approved: 'task',
            app_created: 'app',
            goal_created: 'goal'
          };
          return (
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-[18px] font-semibold text-[#37352F] tracking-tight">Activity</h2>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] font-medium">{projectActivities.length}</span>
                <div className="ml-auto flex items-center p-1 bg-[#E9E9E7] rounded-[8px] gap-1">
                  {([
                    { key: 'all', label: 'All' },
                    { key: 'task', label: 'Tasks' },
                    { key: 'app', label: 'App' },
                    { key: 'goal', label: 'Goals' }
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setActivityFilter(opt.key as any)}
                      className={`px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors duration-150 cursor-pointer border ${activityFilter === opt.key ? 'bg-white text-[#37352F] border-[#E9E9E7]' : 'bg-transparent text-[#787774] border-transparent hover:text-[#37352F]'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[13px] text-[#787774]">History for this project — tasks, goals, and app events. Newest first.</p>
            </div>
            {projectActivities.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
                <Activity className="w-10 h-10 text-[#787774] mx-auto mb-3" />
                <p className="text-[14px] font-medium text-[#37352F]">No activity yet</p>
                <p className="text-[13px] text-[#787774] mt-1 max-w-md mx-auto">No activity yet for this project — create a task or phase to see history</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-10 bg-white border border-[#E9E9E7] rounded-[8px]">
                <Activity className="w-8 h-8 text-[#787774] mx-auto mb-2" />
                <p className="text-[13px] text-[#787774]">No {activityFilter} activity for this project</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredActivities.map(act => {
                  const initial = getInitial(act.userName);
                  const relType = act.relatedTo?.type || typeLabel[act.type] || act.type;
                  const timeStr = formatActivityTime(act.timestamp);
                  return (
                    <div key={act.id} className="flex items-center gap-3 p-4 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150">
                      <div className="w-8 h-8 rounded-full bg-[#E9E9E7] flex items-center justify-center text-[12px] font-semibold text-[#37352F] shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#37352F] leading-relaxed truncate">{act.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] font-medium capitalize">{relType}</span>
                          {act.relatedTo?.name && <span className="text-[12px] text-[#787774] truncate max-w-[180px]">{act.relatedTo.name}</span>}
                          <span className="text-[12px] text-[#9B9A97]">{act.userName} · {timeStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-8 border-t border-[#E9E9E7] pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#787774]" />
                  <h2 className="text-[18px] font-semibold text-[#37352F]">AI Progress Report</h2>
                </div>
              </div>
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
            </div>
          </div>
          );
        })()}
      </div>
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
            <li key={i} className="flex items-start gap-2 text-[14px] text-[#787774]">
              <span className="text-[#2383E2] mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2383E2] flex-shrink-0" />
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
          <Tag key={`h${idx}`} className={`${Tag === 'h2' ? 'text-[18px]' : 'text-[15px]'} font-semibold text-[#37352F] mt-6 mb-2 flex items-center gap-2`}>
            <span className="w-1 h-5 bg-[#2383E2] rounded-full" />
            {text}
          </Tag>
        );
      } else if (/^[-*]\s/.test(line)) {
        list.push(line.replace(/^[-*]\s/, ''));
      } else {
        flushList(`l${idx}`);
        const bolded = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#37352F] font-semibold">$1</strong>');
        blocks.push(
          <p key={`p${idx}`} className="text-[14px] text-[#787774] leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: bolded }} />
        );
      }
    });
    flushList('final');
    return blocks;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-6 shadow-none">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-[15px] font-semibold text-[#37352F] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#787774]" />
              AI Progress Report
            </h3>
            <p className="text-[13px] text-[#787774] mt-1">
              Analyzes live data for <span className="text-[#2383E2] font-medium">{appName}</span> — health, what's working, risks, and recommendations.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium text-[14px] hover:bg-[#1A6FBF] disabled:opacity-50 cursor-pointer transition-colors duration-150 rounded-[6px] border border-[#2383E2] shadow-none"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] text-sm text-[#37352F] rounded-[6px]">
          {error}
        </div>
      )}

      {appReports.length === 0 && !loading && (
        <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
          <Sparkles className="w-12 h-12 text-[#9B9A97] mx-auto mb-4" />
          <p className="text-[#787774] text-sm">No reports yet. Generate your first AI progress report for {appName}.</p>
        </div>
      )}

      {appReports.map(report => (
        <div key={report.id} className="bg-white border border-[#E9E9E7] rounded-[8px] p-6 shadow-none">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E9E9E7]">
            <Sparkles className="w-4 h-4 text-[#787774]" />
            <span className="font-medium text-[#37352F] text-[14px]">{report.title}</span>
            <span className="ml-auto text-xs text-[#9B9A97]">
              {report.model ? `Generated by Groq · ${report.model} · ` : 'Generated by Groq · '}
              {report.createdAt ? new Date(report.createdAt).toLocaleString() : ''}
            </span>
            <button
              onClick={() => deleteReport(report.id)}
              className="p-1 text-[#9B9A97] hover:text-[#37352F] cursor-pointer rounded-[4px] hover:bg-[#F7F7F5] transition-colors duration-150"
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
