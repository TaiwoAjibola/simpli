import React, { useState, lazy } from 'react';
import { useApp } from '../context/AppContext';
import { GoalsModule } from './GoalsMilestonesModule';
import {
  ClipboardCheck,
  Clock,
  ListTodo,
  Target,
  Calendar,
  Folder,
  Users,
  Github,
  Activity,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

type TabKey = 'Overview' | 'Phases' | 'Tasks' | 'Milestones' | 'Calendar' | 'Files' | 'Team' | 'Client' | 'GitHub' | 'Activity';

type Props = {
  onNavigate?: (page: string, appId?: string) => void;
};

export function ProjectsPage({ onNavigate }: Props) {
  const { apps, goals, tasks, phases } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [expandedTab, setExpandedTab] = useState<Set<string>>(new Set());

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'Overview', icon: ClipboardCheck },
    { key: 'Phases', icon: Clock },
    { key: 'Tasks', icon: ListTodo },
    { key: 'Milestones', icon: Target },
    { key: 'Calendar', icon: Calendar },
    { key: 'Files', icon: Folder },
    { key: 'Team', icon: Users },
    { key: 'Client', icon: Users },
    { key: 'GitHub', icon: Github },
    { key: 'Activity', icon: Activity }
  ];

  const toggleExpand = (id: string) => {
    setExpandedTab(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#4C1D95]">Projects</h1>
          <p className="text-[#6D28D9] mt-1">{apps.length} projects · {goals.length} goals · {tasks.length} tasks</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#E9D5FF] overflow-x-auto">
        {tabs.map(({ key, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-[#6D28D9] hover:text-[#4C1D95]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {key}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Projects', value: apps.length, color: '#7C3AED' },
              { label: 'Active Goals', value: goals.length, color: '#22C55E' },
              { label: 'In Progress Tasks', value: tasks.filter(t => t.status === 'in_progress').length, color: '#F59E0B' },
              { label: 'Completed', value: tasks.filter(t => t.status === 'approved' || t.status === 'completed').length, color: '#10B981' }
            ].map(card => (
              <div key={card.label} className="glass-card rounded-xl p-6">
                <p className="text-sm text-[#6D28D9]">{card.label}</p>
                <p className="text-3xl font-bold text-[#4C1D95] mt-2">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Phases' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#4C1D95]">Phases</h2>
            </div>
            {phases.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <Clock className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
                <p className="text-[#6D28D9]">No phases yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {phases.map(phase => {
                  const isExpanded = expandedTab.has(phase.id);
                  return (
                    <div key={phase.id} className="glass-card rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={() => toggleExpand(phase.id)}>
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-[#6D28D9]" /> : <ChevronRight className="w-5 h-5 text-[#6D28D9]" />}
                          </button>
                          <Clock className="w-5 h-5 text-[#7C3AED]" />
                          <div>
                            <h3 className="font-semibold text-[#4C1D95]">{phase.name}</h3>
                            <p className="text-sm text-[#6D28D9]">{phase.status.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-[rgba(124,58,237,0.1)] text-[#7C3AED]">{phase.stage}</span>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-[#E9D5FF]">
                          <p className="text-sm text-[#6D28D9]">{phase.details || 'No details provided.'}</p>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <p className="text-xs text-[#94A3B8]">Start</p>
                              <p className="text-sm text-[#4C1D95]">{phase.startDate ? phase.startDate.toLocaleDateString() : '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#94A3B8]">End</p>
                              <p className="text-sm text-[#4C1D95]">{phase.endDate ? phase.endDate.toLocaleDateString() : '-'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Tasks' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#4C1D95] mb-4">Tasks ({tasks.length})</h2>
            {tasks.length === 0 ? (
              <p className="text-[#6D28D9] text-center py-8">No tasks yet.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                    <div>
                      <p className="font-medium text-[#4C1D95]">{task.name}</p>
                      <p className="text-xs text-[#6D28D9]">{task.status.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 ${
                      task.status === 'approved' || task.status === 'completed'
                        ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                        : task.status === 'in_progress'
                        ? 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED]'
                        : 'bg-[rgba(148,163,184,0.1)] text-[#94A3B8]'
                    }`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Milestones' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#4C1D95]">Milestones</h2>
            <GoalsModule />
          </div>
        )}

        {activeTab === 'Calendar' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#4C1D95] mb-4">Calendar</h2>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-[#6D28D9] py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="aspect-square flex items-center justify-center text-sm text-[#4C1D95] bg-[#FAF5FF] rounded-lg border border-[#E9D5FF]">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Files' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#4C1D95] mb-4">Files</h2>
            <div className="space-y-3">
              {['project-plan.pdf', 'requirements.docx', 'design-mockups.fig', 'api-spec.yaml'].map((file, i) => (
                <div key={file} className="flex items-center gap-3 p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                  <Folder className="w-5 h-5 text-[#7C3AED]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#4C1D95]">{file}</p>
                    <p className="text-xs text-[#94A3B8]">{['2.4 MB', '1.1 MB', '15.7 MB', '340 KB'][i]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Team' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#4C1D95] mb-4">Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Alice Johnson', 'Bob Smith', 'Carol Williams'].map((name, i) => (
                <div key={name} className="flex items-center gap-3 p-4 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white font-bold rounded-full">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-[#4C1D95]">{name}</p>
                    <p className="text-xs text-[#6D28D9]">Member {i + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Client' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#4C1D95] mb-4">Client</h2>
            <div className="p-6 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
              <p className="font-semibold text-[#4C1D95]">Acme Corporation</p>
              <p className="text-sm text-[#6D28D9] mt-1">contact@acme.com</p>
              <p className="text-sm text-[#6D28D9]">Active since January 2025</p>
            </div>
          </div>
        )}

        {activeTab === 'GitHub' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#4C1D95] mb-4">GitHub</h2>
            <div className="space-y-3">
              {['simpli/core', 'simpli/api', 'simpli/web'].map((repo, i) => (
                <div key={repo} className="flex items-center gap-3 p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                  <Github className="w-5 h-5 text-[#7C3AED]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#4C1D95]">{repo}</p>
                    <p className="text-xs text-[#94A3B8]">Repository {i + 1}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6D28D9]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Activity' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#4C1D95] mb-4">Activity</h2>
            <div className="space-y-3">
              {['Task approved by Alice', 'Phase completed', 'New milestone created'].map((activity, i) => (
                <div key={activity} className="flex items-center gap-3 p-3 bg-[#FAF5FF] border border-[#E9D5FF] rounded-lg">
                  <div className="w-8 h-8 bg-[rgba(124,58,237,0.1)] flex items-center justify-center rounded-full">
                    <Activity className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#4C1D95]">{activity}</p>
                    <p className="text-xs text-[#94A3B8]">{['2 hours ago', '5 hours ago', '1 day ago'][i]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}