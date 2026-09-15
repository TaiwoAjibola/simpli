import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Target,
  CheckCircle,
  Clock,
  XCircle,
  Flag,
  ChevronRight,
  ChevronDown,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';
import { GoalsModule } from './GoalsMilestonesModule';

type MilestoneTab = 'all' | 'active' | 'completed' | 'upcoming';

export function MilestonesPage() {
  const { goals, tasks, phases } = useApp();
  const [activeTab, setActiveTab] = useState<MilestoneTab>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredGoals = goals.filter(g => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return g.status === 'in_progress';
    if (activeTab === 'completed') return g.status === 'completed';
    if (activeTab === 'upcoming') return g.status === 'pending';
    return true;
  });

  const goalTasks = filteredGoals.flatMap(g => tasks.filter(t => t.goalId === g.id));
  const totalCompleted = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;
  const totalTasks = goalTasks.length;
  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const milestones = [
    { id: 'm1', title: 'Project Kickoff', status: 'completed', date: '2025-01-05', type: 'phase' },
    { id: 'm2', title: 'Design Review Complete', status: 'completed', date: '2025-01-15', type: 'milestone' },
    { id: 'm3', title: 'Alpha Release', status: 'in_progress', date: '2025-02-01', type: 'milestone' },
    { id: 'm4', title: 'Beta Testing', status: 'pending', date: '2025-03-01', type: 'milestone' },
    { id: 'm5', title: 'Final Delivery', status: 'pending', date: '2025-04-15', type: 'milestone' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Milestones</h1>
          <p className="text-foreground mt-1">Track project progress and key milestones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[rgba(124,58,237,0.1)] rounded-lg">
              <TrendingUp className="w-6 h-6 text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overallProgress}%</p>
              <p className="text-sm text-foreground">Overall Progress</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[rgba(124,58,237,0.1)] rounded-lg">
              <CheckCircle className="w-6 h-6 text-[#A78BFA]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
              <p className="text-sm text-foreground">Tasks Completed</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[rgba(245,158,11,0.1)] rounded-lg">
              <Clock className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalTasks - totalCompleted}</p>
              <p className="text-sm text-foreground">Tasks Remaining</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
          { key: 'upcoming', label: 'Upcoming' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as MilestoneTab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab.key
                ? 'bg-[#7C3AED] text-white'
                : 'bg-white text-foreground border border-[#E9D5FF] hover:border-[#7C3AED]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-bold text-foreground">Milestone Timeline</h2>
        {milestones.map((milestone, index) => {
          const isExpanded = expandedItems.has(milestone.id);
          const statusColors = {
            completed: 'bg-[rgba(124,58,237,0.1)] text-[#A78BFA]',
            in_progress: 'bg-[rgba(124,58,237,0.1)] text-[#7C3AED]',
            pending: 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
          };
          return (
            <div key={milestone.id} className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {milestone.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-[#A78BFA]" />
                  ) : milestone.status === 'in_progress' ? (
                    <Clock className="w-6 h-6 text-[#7C3AED]" />
                  ) : (
                    <Flag className="w-6 h-6 text-[#F59E0B]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{milestone.title}</h3>
                    <span className={`text-xs px-2 py-0.5 ${statusColors[milestone.status]}`}>
                      {milestone.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {milestone.date}
                    </span>
                    <span className="text-xs text-muted-foreground">{milestone.type}</span>
                  </div>
                </div>
                <button onClick={() => toggleExpand(milestone.id)}>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-foreground" /> : <ChevronRight className="w-5 h-5 text-foreground" />}
                </button>
              </div>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#E9D5FF]">
                  <p className="text-sm text-foreground">Milestone details and associated tasks will appear here.</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#A78BFA]" />
                      <span className="text-foreground">Prerequisites completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-foreground">Pending review</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Goals & Milestones</h2>
        <GoalsMilestonesModule />
      </div>
    </div>
  );
}