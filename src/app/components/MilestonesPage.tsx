import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle,
  Clock,
  Flag,
  ChevronRight,
  ChevronDown,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { GoalsModule } from './GoalsMilestonesModule';

type MilestoneTab = 'all' | 'active' | 'completed' | 'upcoming';

export function MilestonesPage() {
  const { goals, tasks } = useApp();
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
    <div className="bg-[#FFFFFF] max-w-[900px] mx-auto p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#37352F] leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Milestones</h1>
          <p className="text-sm text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Track project progress and key milestones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E9E9E7] rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
              <TrendingUp className="w-5 h-5 text-[#787774]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{overallProgress}%</p>
              <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Overall Progress</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-[#E9E9E7] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#2383E2] h-1.5 rounded-full transition-all duration-150" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
        <div className="bg-white border border-[#E9E9E7] rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
              <CheckCircle className="w-5 h-5 text-[#787774]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{totalCompleted}</p>
              <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Tasks Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E9E9E7] rounded-lg p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
              <Clock className="w-5 h-5 text-[#787774]" />
            </div>
            <div>
              <p className="text-xl font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{totalTasks - totalCompleted}</p>
              <p className="text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Tasks Remaining</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center bg-[#E9E9E7] rounded-md p-1 w-fit mb-6">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
          { key: 'upcoming', label: 'Upcoming' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as MilestoneTab)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-[6px] transition-colors duration-150 cursor-pointer ${activeTab === tab.key ? 'bg-white text-[#37352F] shadow-sm border border-[#E9E9E7]' : 'text-[#787774] hover:text-[#37352F]'}`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-8">
        <h2 className="text-[16px] font-semibold text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>Milestone Timeline</h2>
        {milestones.map((milestone) => {
          const isExpanded = expandedItems.has(milestone.id);
          const statusMap: Record<string, { label: string; dot: string; icon: React.ReactNode }> = {
            completed: { label: 'Completed', dot: 'bg-[#0F7B6C]', icon: <CheckCircle className="w-5 h-5 text-[#0F7B6C]" /> },
            in_progress: { label: 'In progress', dot: 'bg-[#2383E2]', icon: <Clock className="w-5 h-5 text-[#2383E2]" /> },
            pending: { label: 'Not started', dot: 'bg-[#9B9A97]', icon: <Flag className="w-5 h-5 text-[#9B9A97]" /> }
          };
          const meta = statusMap[milestone.status] || statusMap.pending;
          return (
            <div key={milestone.id} className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>{milestone.title}</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded bg-white border border-[#E9E9E7] text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {milestone.date}
                    </span>
                    <span className="text-[#9B9A97]">{milestone.type}</span>
                  </div>
                </div>
                <button onClick={() => toggleExpand(milestone.id)} className="p-1.5 rounded-md hover:bg-white border border-transparent hover:border-[#E9E9E7] transition-colors duration-150 cursor-pointer">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[#787774]" /> : <ChevronRight className="w-4 h-4 text-[#787774]" />}
                </button>
              </div>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#E9E9E7]">
                  <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>Milestone details and associated tasks will appear here.</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <CheckCircle className="w-4 h-4 text-[#0F7B6C]" />
                      Prerequisites completed
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#37352F]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <Clock className="w-4 h-4 text-[#2383E2]" />
                      Pending review
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-[16px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Goals & Milestones</h2>
        <GoalsModule />
      </div>
    </div>
  );
}
