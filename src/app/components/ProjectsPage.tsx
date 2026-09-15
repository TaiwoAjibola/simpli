import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

type Props = {
  onNavigate?: (page: string, appId?: string) => void;
};

export function ProjectsPage({ onNavigate }: Props) {
  const { apps, goals, tasks, phases, clients, employees, addApp } = useApp();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formPmId, setFormPmId] = useState('');
  const [formTechStack, setFormTechStack] = useState('');
  const [formProjectType, setFormProjectType] = useState('');
  const [formExpectedDate, setFormExpectedDate] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('USD');
  const [budgetNotes, setBudgetNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !currentUser) return;
    addApp({
      name: formName.trim(),
      description: formDesc.trim(),
      status: 'active',
      createdBy: currentUser.id,
      clientId: formClientId || undefined,
      projectManagerId: formPmId || undefined,
      techStack: formTechStack || undefined,
      projectType: formProjectType || undefined,
      expectedCompletionDate: formExpectedDate ? new Date(formExpectedDate) : undefined,
      budgetAmount: budgetAmount ? Number(budgetAmount) : undefined,
      budgetCurrency: budgetCurrency || undefined,
      budgetNotes: budgetNotes.trim() || undefined,
    });
    setFormName('');
    setFormDesc('');
    setFormClientId('');
    setFormPmId('');
    setFormTechStack('');
    setFormProjectType('');
    setFormExpectedDate('');
    setBudgetAmount('');
    setBudgetCurrency('USD');
    setBudgetNotes('');
    setShowForm(false);
  };

  const statusBadge = (status: string) => {
    return 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]';
  };

  const getAppTasks = (appId: string) => {
    const appGoalIds = new Set(goals.filter(g => g.appId === appId).map(g => g.id));
    return tasks.filter(t => appGoalIds.has(t.goalId || ''));
  };

  const formatBudget = (amount: number, currency?: string) => {
    const cur = currency || 'USD';
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };
    const sym = symbols[cur] || cur;
    return `${sym} ${amount.toLocaleString()} ${cur}`;
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] font-['Inter',sans-serif] p-6">
      <div className="max-w-[900px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-[#37352F] tracking-tight">Projects</h1>
            <p className="text-[14px] text-[#787774] mt-1">{apps.length} projects · {phases.length} phases · {tasks.length} tasks</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer border border-[#2383E2] shadow-none"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-5 bg-white border border-[#E9E9E7] rounded-[8px] space-y-4 shadow-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] placeholder:text-[#9B9A97] transition-colors duration-150"
                placeholder="Project name *"
                required
              />
              <input
                type="text"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] placeholder:text-[#9B9A97] transition-colors duration-150"
                placeholder="Description"
              />
              <select
                value={formClientId}
                onChange={e => setFormClientId(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] transition-colors duration-150"
              >
                <option value="">Select Client (optional)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
              <select
                value={formPmId}
                onChange={e => setFormPmId(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] transition-colors duration-150"
              >
                <option value="">Project Manager (optional)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={formTechStack}
                onChange={e => setFormTechStack(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] placeholder:text-[#9B9A97] transition-colors duration-150"
                placeholder="Tech Stack (e.g. React, Node, Postgres)"
              />
              <input
                type="text"
                value={formProjectType}
                onChange={e => setFormProjectType(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] placeholder:text-[#9B9A97] transition-colors duration-150"
                placeholder="Project Type (e.g. Web App, API)"
              />
              <input
                type="date"
                value={formExpectedDate}
                onChange={e => setFormExpectedDate(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] transition-colors duration-150"
              />
              <input
                type="number"
                step={100}
                min={0}
                value={budgetAmount}
                onChange={e => setBudgetAmount(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] placeholder:text-[#9B9A97] transition-colors duration-150"
                placeholder="Amount"
              />
              <select
                value={budgetCurrency}
                onChange={e => setBudgetCurrency(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] transition-colors duration-150"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="NGN">NGN</option>
              </select>
              <input
                type="text"
                value={budgetNotes}
                onChange={e => setBudgetNotes(e.target.value)}
                className="md:col-span-2 px-3 py-2 bg-[#FFFFFF] border border-[#E0E0DE] text-[#37352F] text-[14px] outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] rounded-[6px] placeholder:text-[#9B9A97] transition-colors duration-150"
                placeholder="Budget notes (optional)"
              />
              <div className="flex items-center gap-2 md:col-span-2">
                <button type="submit" className="px-5 py-2 bg-[#2383E2] text-white font-medium text-[14px] hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none">
                  Create
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer rounded-[6px] shadow-none">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {apps.length === 0 && !showForm ? (
          <div className="text-center py-16 bg-white border border-[#E9E9E7] rounded-[8px] shadow-none">
            <p className="text-[#787774] text-[14px] mb-4">No projects yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#2383E2] text-white font-medium text-[14px] hover:bg-[#1A6FBF] transition-colors duration-150 cursor-pointer rounded-[6px] border border-[#2383E2] shadow-none"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map(app => {
              const appPhases = phases.filter(p => p.appId === app.id);
              const appTasks = getAppTasks(app.id);
              const completedTasks = appTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
              const progress = appTasks.length > 0 ? Math.round((completedTasks / appTasks.length) * 100) : 0;
              const client = clients.find(c => c.id === app.clientId);
              const pm = employees.find(e => e.id === app.projectManagerId);

              return (
                <div
                  key={app.id}
                  onClick={() => onNavigate?.('app-details', app.id)}
                  className="bg-white border border-[#E9E9E7] rounded-[8px] p-5 cursor-pointer transition-colors duration-150 hover:bg-[#F7F7F5] shadow-none"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-[#37352F] mb-1.5 truncate">{app.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(app.status)}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[14px] text-[#787774] mb-3 line-clamp-2 leading-relaxed">{app.description || 'No description provided.'}</p>
                  {(client || app.techStack || app.projectType) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {client && <span className="text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">{client.name}</span>}
                      {app.projectType && <span className="text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774]">{app.projectType}</span>}
                      {app.techStack && <span className="text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774] truncate max-w-[140px]">{app.techStack}</span>}
                    </div>
                  )}
                  {pm && <p className="text-xs text-[#787774] mb-2">PM: <span className="font-medium text-[#37352F]">{pm.name}</span></p>}
                  {app.budgetAmount !== undefined && app.budgetAmount !== null && (
                    <div className="mb-3">
                      <span className="inline-flex text-xs px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full text-[#787774] font-medium">{formatBudget(app.budgetAmount, app.budgetCurrency)}</span>
                      {app.budgetNotes && <p className="text-xs text-[#787774] mt-1 line-clamp-1">{app.budgetNotes}</p>}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#9B9A97]" />
                      <span className="text-xs text-[#787774]">{appPhases.length} phases</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#2383E2]" />
                      <span className="text-xs text-[#787774]">{appTasks.length} tasks</span>
                    </div>
                    {app.expectedCompletionDate && (
                      <span className="text-xs text-[#9B9A97]">Due {format(new Date(app.expectedCompletionDate), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-[#E9E9E7] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-[#2383E2] rounded-full transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#787774]">{progress}% complete</span>
                    <span className="text-xs text-[#9B9A97]">{format(app.createdAt, 'MMM d, yyyy')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
