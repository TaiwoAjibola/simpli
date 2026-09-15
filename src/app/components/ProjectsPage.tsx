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
    });
    setFormName('');
    setFormDesc('');
    setFormClientId('');
    setFormPmId('');
    setFormTechStack('');
    setFormProjectType('');
    setFormExpectedDate('');
    setShowForm(false);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-[rgba(124,58,237,0.1)] text-[#A78BFA] border border-[rgba(124,58,237,0.2)]',
      completed: 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED] border border-[rgba(124,58,237,0.2)]',
      on_hold: 'bg-[rgba(245,158,11,0.1)] text-[#F97316] border border-[rgba(245,158,11,0.2)]'
    };
    return colors[status] || 'bg-[rgba(148,163,184,0.1)] text-[#64748B] border border-[rgba(148,163,184,0.2)]';
  };

  const getAppTasks = (appId: string) => {
    const appGoalIds = new Set(goals.filter(g => g.appId === appId).map(g => g.id));
    return tasks.filter(t => appGoalIds.has(t.goalId || ''));
  };

  return (
    <div className="p-6 bg-[#FAF5FF] min-h-screen font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-[#475569] mt-1">{apps.length} projects · {phases.length} phases · {tasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white font-medium hover:bg-[#6D28D9] transition-all duration-150 cursor-pointer border border-[#7C3AED] text-sm rounded-xl"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-5 bg-white border border-[#E9D5FF] rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="px-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] text-foreground text-sm outline-none focus:border-[#7C3AED] rounded-xl"
              placeholder="Project name *"
              required
            />
            <input
              type="text"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              className="px-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] text-foreground text-sm outline-none focus:border-[#7C3AED] rounded-xl"
              placeholder="Description"
            />
            <select
              value={formClientId}
              onChange={e => setFormClientId(e.target.value)}
              className="px-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] text-foreground text-sm outline-none focus:border-[#7C3AED] rounded-xl"
            >
              <option value="">Select Client (optional)</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
              ))}
            </select>
            <select
              value={formPmId}
              onChange={e => setFormPmId(e.target.value)}
              className="px-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] text-foreground text-sm outline-none focus:border-[#7C3AED] rounded-xl"
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
              className="px-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] text-foreground text-sm outline-none focus:border-[#7C3AED] rounded-xl"
              placeholder="Tech Stack (e.g. React, Node, Postgres)"
            />
            <input
              type="text"
              value={formProjectType}
              onChange={e => setFormProjectType(e.target.value)}
              className="px-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] text-foreground text-sm outline-none focus:border-[#7C3AED] rounded-xl"
              placeholder="Project Type (e.g. Web App, API)"
            />
            <input
              type="date"
              value={formExpectedDate}
              onChange={e => setFormExpectedDate(e.target.value)}
              className="px-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] text-foreground text-sm outline-none focus:border-[#7C3AED] rounded-xl"
            />
            <div className="flex items-center gap-2">
              <button type="submit" className="px-5 py-2 bg-[#7C3AED] text-white font-medium text-sm hover:bg-[#6D28D9] transition-all duration-150 cursor-pointer rounded-xl">
                Create
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-white text-[#475569] border border-[#E9D5FF] text-sm hover:border-[#6D28D9] transition-all duration-150 cursor-pointer rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {apps.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-[#FFFFFF] border border-[#E9D5FF]">
          <p className="text-[#475569] mb-4">No projects yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#7C3AED] text-white font-medium text-sm hover:bg-[#6D28D9] transition-all duration-150 cursor-pointer"
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
                className="bg-white border border-[#E9D5FF] p-5 cursor-pointer transition-all duration-150 hover:border-[#7C3AED] hover:opacity-90 rounded-xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1 truncate">{app.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(app.status)}`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#475569] mb-3 line-clamp-2">{app.description || 'No description provided.'}</p>
                {(client || app.techStack || app.projectType) && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {client && <span className="text-xs px-2 py-1 bg-[#F5F3FF] border border-[#E9D5FF] rounded-full text-[#475569]">{client.name}</span>}
                    {app.projectType && <span className="text-xs px-2 py-1 bg-white border border-[#E9D5FF] rounded-full text-[#475569]">{app.projectType}</span>}
                    {app.techStack && <span className="text-xs px-2 py-1 bg-white border border-[#E9D5FF] rounded-full text-[#475569] truncate max-w-[140px]">{app.techStack}</span>}
                  </div>
                )}
                {pm && <p className="text-xs text-[#475569] mb-2">PM: <span className="font-medium text-foreground">{pm.name}</span></p>}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                    <span className="text-xs text-[#475569]">{appPhases.length} phases</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#6D28D9]" />
                    <span className="text-xs text-[#475569]">{appTasks.length} tasks</span>
                  </div>
                  {app.expectedCompletionDate && (
                    <span className="text-xs text-[#475569]">Due {format(new Date(app.expectedCompletionDate), 'MMM d, yyyy')}</span>
                  )}
                </div>
                <div className="w-full h-1.5 bg-[#F5F3FF] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#7C3AED] rounded-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#475569]">{progress}% complete</span>
                  <span className="text-xs text-[#475569]">{format(app.createdAt, 'MMM d, yyyy')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
