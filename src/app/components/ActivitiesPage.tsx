import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Activity as ActivityIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';

export function ActivitiesPage() {
  const { currentUser, hasPermission } = useAuth();
  const { activities, getTasksForEmployee } = useApp();

  const canViewAll = hasPermission('view_all_apps');
  const myTasks = canViewAll ? [] : getTasksForEmployee(currentUser!.id);
  const myActivityIds = new Set(myTasks.map(t => t.id));

  const filteredActivities = canViewAll
    ? activities
    : activities.filter(a =>
        a.relatedTo?.type === 'task' ? myActivityIds.has(a.relatedTo.id) : true
      );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task_approved': return 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]';
      case 'task_completed': return 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border-[rgba(0,229,255,0.2)]';
      case 'task_created': return 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]';
      case 'app_created': return 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border-[rgba(0,229,255,0.2)]';
      case 'goal_created': return 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]';
      default: return 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80] border-[rgba(107,107,128,0.2)]';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Activities</h1>
          <p className="text-[#6b6b80]">{filteredActivities.length} total activities</p>
        </div>
      </div>

      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
        {filteredActivities.length > 0 ? (
          <div className="divide-y divide-[rgba(0,229,255,0.1)]">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-5 hover:bg-[rgba(255,255,255,0.02)] transition"
              >
                <div className={`w-10 h-10 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                  activity.type === 'task_approved' ? 'bg-[#10b981]' :
                  activity.type === 'task_completed' ? 'bg-[#00e5ff]' :
                  activity.type === 'task_created' ? 'bg-[#f59e0b]' :
                  activity.type === 'app_created' ? 'bg-[#00e5ff]' :
                  'bg-[#6b6b80]'
                }`}>
                  {activity.userName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-[#f0f0f5]">
                        <span className="font-medium">{activity.userName}</span>{' '}
                        {activity.description}
                      </p>
                      {activity.relatedTo && (
                        <p className="text-xs text-[#6b6b80] mt-1">
                          {activity.relatedTo.type}: {activity.relatedTo.name}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium whitespace-nowrap ${getTypeColor(activity.type)}`}>
                      {getTypeLabel(activity.type)}
                    </span>
                  </div>
                  <p className="text-xs text-[#6b6b80]">
                    {format(activity.timestamp, 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ActivityIcon className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
            <p className="text-[#6b6b80] text-lg mb-2">No activities yet</p>
            <p className="text-[#6b6b80] text-sm">Activities will appear here as you work on tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
