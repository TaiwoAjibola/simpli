import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Briefcase,
  Bug,
  CheckSquare,
  Clock,
  AlertCircle,
  Star,
  Code2,
  FileText,
  Inbox,
  CalendarClock
} from 'lucide-react';
import { format, isPast, isToday, startOfToday, addDays } from 'date-fns';
import { TaskDetailModal } from './TaskDetailModal';
import { DefectDetailModal } from './DefectDetailModal';
import { WorkItem, allWork, workForUser } from '../../utils/work';
import { ActionPoint } from '../types';

type WorkSection = {
  id: string;
  title: string;
  icon: React.ElementType;
  items: WorkItem[];
};

export function MyWork() {
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);
  const { currentUser, hasPermission } = useAuth();
  const {
    tasks,
    actionPoints,
    defects,
    goals,
    getAppById,
    getGoalById,
    updateActionPoint
  } = useApp();

  const canApprove = hasPermission('approve_tasks');

  const items = useMemo(() => {
    if (!currentUser) return [];
    const goalAppId = (goalId?: string) => {
      const g = goals.find(x => x.id === goalId);
      return g?.appId;
    };
    const goalPhaseId = (goalId?: string) => {
      const g = goals.find(x => x.id === goalId);
      return g?.phaseId;
    };
    const all = allWork(tasks, actionPoints, defects, goalAppId, goalPhaseId);
    return workForUser(all, currentUser.id);
  }, [currentUser, tasks, actionPoints, defects, goals]);

  const today = startOfToday();

  const sections = useMemo(() => {
    const openItems = items.filter(i => {
      if (i.status === 'approved' || i.status === 'merged' || i.status === 'closed') return false;
      if (i.workKind === 'action_point' && i.status === 'completed') return false;
      return true;
    });

    const blocked: WorkItem[] = [];
    const waitingForMe: WorkItem[] = [];
    const todayItems: WorkItem[] = [];
    const upcoming: WorkItem[] = [];

    for (const item of openItems) {
      if (item.status === 'blocked') {
        blocked.push(item);
        continue;
      }
      if (item.workKind === 'defect' && item.status === 'pending_qa') {
        waitingForMe.push(item);
        continue;
      }
      if (item.workKind === 'task' && item.status === 'completed' && canApprove) {
        waitingForMe.push(item);
        continue;
      }
      const due = item.dueDate || item.startDate;
      if (due && isPast(due)) {
        todayItems.push(item);
      } else if (due && isToday(due)) {
        todayItems.push(item);
      } else if (due && due.getTime() < addDays(today, 7).getTime()) {
        upcoming.push(item);
      } else if (!due) {
        upcoming.push(item);
      } else {
        upcoming.push(item);
      }
    }

    const result: WorkSection[] = [];
    if (todayItems.length) result.push({ id: 'today', title: 'Today', icon: CalendarClock, items: todayItems });
    if (upcoming.length) result.push({ id: 'upcoming', title: 'Upcoming', icon: Clock, items: upcoming });
    if (waitingForMe.length) result.push({ id: 'waiting', title: 'Waiting for me', icon: Inbox, items: waitingForMe });
    if (blocked.length) result.push({ id: 'blocked', title: 'Blocked', icon: AlertCircle, items: blocked });
    return result;
  }, [items, today, canApprove]);

  const openItem = (item: WorkItem) => {
    setSelectedTask(item);
  };

  const handleActionPointToggle = (item: WorkItem) => {
    if (item.workKind !== 'action_point') return;
    const ap = item.raw as ActionPoint;
    if (ap.status === 'completed') {
      updateActionPoint(ap.id, { status: 'pending', completedAt: undefined, completedBy: undefined });
    } else {
      updateActionPoint(ap.id, {
        status: 'completed',
        completedAt: new Date(),
        completedBy: currentUser!.id
      });
    }
  };

  const totalCount = items.length;

  return (
    <div className="min-h-screen bg-[#FFFFFF] p-8" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-[#37352F] tracking-tight">My Work</h1>
          <p className="text-[14px] text-[#787774] mt-1">
            {totalCount} open items assigned to you across tasks, action points and defects
          </p>
        </div>

        {sections.length === 0 ? (
          <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-12 text-center">
            <Briefcase className="w-10 h-10 text-[#787774] mx-auto mb-3" />
            <p className="text-[14px] text-[#787774]">You're all caught up — no open work assigned to you.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map(section => (
              <div key={section.id}>
                <div className="flex items-center gap-2 mb-3">
                  <section.icon className="w-4 h-4 text-[#787774]" />
                  <h2 className="text-[16px] font-semibold text-[#37352F]">{section.title}</h2>
                  <span className="text-[13px] text-[#787774]">({section.items.length})</span>
                </div>
                <div className="bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden divide-y divide-[#E9E9E7]">
                  {section.items.map(item => {
                    const goal = item.goalId ? getGoalById(item.goalId) : null;
                    const app = item.appId ? getAppById(item.appId) : null;
                    return (
                      <WorkRow
                        key={`${item.workKind}-${item.id}`}
                        item={item}
                        appName={app?.name}
                        goalName={goal?.name}
                        onClick={() => openItem(item)}
                        onToggleActionPoint={handleActionPointToggle}
                        canToggleActionPoint={item.workKind === 'action_point'}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTask && selectedTask.workKind === 'task' && (
          <TaskDetailModal
            task={selectedTask.raw as any}
            onClose={() => setSelectedTask(null)}
          />
        )}
        {selectedTask && selectedTask.workKind === 'defect' && (
          <DefectDetailModal
            defect={selectedTask.raw as any}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
}

function WorkRow({
  item,
  appName,
  goalName,
  onClick,
  onToggleActionPoint,
  canToggleActionPoint
}: {
  item: WorkItem;
  appName?: string;
  goalName?: string;
  onClick: () => void;
  onToggleActionPoint: (item: WorkItem) => void;
  canToggleActionPoint: boolean;
}) {
  const kindConfig = {
    task: { icon: CheckSquare, label: 'Task' },
    action_point: { icon: FileText, label: 'Action Point' },
    defect: { icon: Bug, label: 'Defect' }
  } as const;
  const kind = kindConfig[item.workKind];
  const KindIcon = kind.icon;

  const priorityPill = 'bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774]';

  const statusText = item.status.replace(/_/g, ' ');

  return (
    <div
      className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-[#F7F7F5] transition-colors duration-150 group"
      onClick={onClick}
    >
      <KindIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#787774]" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[14px] font-medium text-[#37352F] truncate">{item.title}</p>
              {item.priority === 'urgent' && <Star className="w-4 h-4 text-[#37352F] fill-[#37352F] flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1 text-[12px] text-[#787774]">
              <span className="px-2 py-0.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[4px] text-[#787774]">
                {kind.label}
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[4px] text-[#787774]">
                {item.workType === 'development' ? <Code2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                {item.workType === 'development' ? 'Dev' : 'Non-dev'}
              </span>
              {item.code && <span className="font-mono text-[12px] text-[#787774]">{item.code}</span>}
              {(appName || goalName) && (
                <span className="truncate text-[#787774]">
                  {appName}{goalName ? ` → ${goalName}` : ''}
                </span>
              )}
              {item.dueDate && (
                <span className={isPast(item.dueDate) ? 'text-[#EB5757]' : 'text-[#787774]'}>
                  Due {format(item.dueDate, 'MMM d')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[11px] font-medium px-2 py-1 rounded-[4px] ${priorityPill}`}>
          {item.priority.toUpperCase()}
        </span>
        <span className="text-[12px] text-[#787774] capitalize px-2 py-1 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[4px]">{statusText}</span>
        {canToggleActionPoint && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActionPoint(item);
            }}
            className="p-1.5 text-[#787774] hover:bg-white hover:border hover:border-[#E9E9E7] rounded-[4px] transition opacity-0 group-hover:opacity-100"
            title={item.status === 'completed' ? 'Reopen action point' : 'Mark action point complete'}
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}