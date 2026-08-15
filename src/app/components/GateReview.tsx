import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Plus,
  CheckCircle,
  XCircle,
  Link,
  Unlink,
  Flag,
  ChevronDown,
  ChevronRight,
  Target,
  Layers
} from 'lucide-react';

export function GateReview() {
  const { currentUser, hasPermission } = useAuth();
  const {
    apps, goals, tasks, expectations, modules,
    getGoalById, getAppById,
    addExpectation, updateExpectation, deleteExpectation, getExpectationsForGoal
  } = useApp();
  const canManage = hasPermission('manage_modules');

  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [newExpText, setNewExpText] = useState<Record<string, string>>({});
  const [linkingExpId, setLinkingExpId] = useState<string | null>(null);

  const appGoals = goals.filter(g => g.appId === selectedAppId);
  const appGoalIds = new Set(appGoals.map(g => g.id));
  const appTasks = tasks.filter(t => appGoalIds.has(t.goalId || ''));

  const getAccumulatedExpectations = (goalId: string) => {
    const goalExps = getExpectationsForGoal(goalId);
    const goalTaskIds = new Set(appTasks.filter(t => t.goalId === goalId).map(t => t.id));
    const taskExps = expectations.filter(e => e.taskId && goalTaskIds.has(e.taskId));
    const seen = new Set<string>();
    return [...goalExps, ...taskExps].filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  };

  const addExpectationForGoal = async (goalId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    await addExpectation({ goalId, description: text.trim(), status: 'pending', createdBy: currentUser.id });
    setNewExpText(prev => ({ ...prev, [goalId]: '' }));
  };

  const toggleGoal = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      next.has(goalId) ? next.delete(goalId) : next.add(goalId);
      return next;
    });
  };

  const selectedApp = apps.find(a => a.id === selectedAppId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-[#00e5ff]" />
            <h1 className="text-3xl font-bold text-[#f0f0f5]">Gate Review</h1>
          </div>
          <p className="text-[#6b6b80]">Accumulate gate items from each task into a per-goal review before sign-off</p>
        </div>
        <select
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
          className="px-4 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
        >
          {apps.map(app => (
            <option key={app.id} value={app.id}>{app.name}</option>
          ))}
        </select>
      </div>

      {apps.length === 0 && (
        <div className="text-center py-16 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Layers className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80] text-lg mb-2">No apps yet</p>
          <p className="text-[#6b6b80] text-sm">Create an app with goals to start gate reviews</p>
        </div>
      )}

      {apps.length > 0 && appGoals.length === 0 && (
        <div className="text-center py-16 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Target className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80] text-lg mb-2">No goals for {selectedApp?.name}</p>
          <p className="text-[#6b6b80] text-sm">Create a goal first — its tasks will accumulate into the gate review</p>
        </div>
      )}

      {appGoals.length > 0 && (
        <div className="space-y-4">
          {appGoals.map(goal => {
            const goalExps = getAccumulatedExpectations(goal.id);
            const achieved = goalExps.filter(e => e.status === 'achieved').length;
            const missed = goalExps.filter(e => e.status === 'missed').length;
            const isExpanded = expandedGoals.has(goal.id);
            const goalTasks = appTasks.filter(t => t.goalId === goal.id);
            const goalDone = goalTasks.filter(t => t.status === 'approved' || t.status === 'completed').length;

            return (
              <div key={goal.id} className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
                <button
                  onClick={() => toggleGoal(goal.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[rgba(255,255,255,0.02)]"
                >
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-[#6b6b80]" /> : <ChevronRight className="w-5 h-5 text-[#6b6b80]" />}
                  <div className="p-2 bg-[rgba(139,92,246,0.1)]">
                    <Target className="w-5 h-5 text-[#8b5cf6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#f0f0f5]">{goal.name}</h3>
                    <p className="text-xs text-[#6b6b80]">
                      {goalTasks.length} tasks · {goalDone} done · {goalExps.length} gate items
                    </p>
                  </div>
                  {goalExps.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                        <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${(achieved / goalExps.length) * 100}%` }} />
                      </div>
                      <span className="text-xs text-[#6b6b80] whitespace-nowrap">
                        {achieved}/{goalExps.length} ✓
                        {missed > 0 && <span className="text-[#ff3b5c]"> · {missed} ✗</span>}
                      </span>
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-[rgba(0,229,255,0.1)] p-4 space-y-2">
                    {goalExps.length === 0 && (
                      <p className="text-sm text-[#6b6b80] text-center py-4">
                        No gate items yet. Add expectations or link one to a task below.
                      </p>
                    )}
                    {goalExps.map(exp => {
                      const linkedTask = exp.taskId ? tasks.find(t => t.id === exp.taskId) : undefined;
                      return (
                        <div key={exp.id} className="flex items-start gap-2 p-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.05)]">
                          <button
                            onClick={() => updateExpectation(exp.id, { status: exp.status === 'achieved' ? 'pending' : 'achieved' })}
                            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              exp.status === 'achieved' ? 'bg-[#10b981] border-[#10b981] text-white' :
                              exp.status === 'missed' ? 'bg-[#ff3b5c] border-[#ff3b5c] text-white' :
                              'border-[#6b6b80] hover:border-[#00e5ff]'
                            }`}
                          >
                            {(exp.status === 'achieved' || exp.status === 'missed') && (
                              exp.status === 'achieved' ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${exp.status === 'missed' ? 'text-[#ff3b5c] line-through' : 'text-[#f0f0f5]'}`}>
                              {exp.description}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {linkedTask ? (
                                <span className="text-[10px] text-[#00e5ff] flex items-center gap-0.5">
                                  <Link className="w-2.5 h-2.5" />
                                  {linkedTask.name}
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#6b6b80] flex items-center gap-0.5">
                                  <Target className="w-2.5 h-2.5" />
                                  Goal item
                                </span>
                              )}
                              <span className={`text-[10px] px-1 ${
                                exp.status === 'achieved' ? 'text-[#10b981]' :
                                exp.status === 'missed' ? 'text-[#ff3b5c]' : 'text-[#6b6b80]'
                              }`}>
                                {exp.status}
                              </span>
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => setLinkingExpId(linkingExpId === exp.id ? null : exp.id)}
                                className={`p-0.5 ${exp.taskId ? 'text-[#10b981]' : 'text-[#6b6b80]'} hover:text-[#00e5ff]`}
                              >
                                <Link className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => updateExpectation(exp.id, { status: exp.status === 'missed' ? 'pending' : 'missed' })}
                                className="p-0.5 text-[#6b6b80] hover:text-[#ff3b5c]"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteExpectation(exp.id)}
                                className="p-0.5 text-[#6b6b80] hover:text-[#ff3b5c]"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {linkingExpId === exp.id && (
                            <div className="absolute mt-6 right-0 z-10 w-64 p-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] shadow-lg">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-[#f0f0f5] font-medium">Link to Task</span>
                                <button onClick={() => setLinkingExpId(null)} className="text-xs text-[#6b6b80]">Close</button>
                              </div>
                              <div className="max-h-28 overflow-y-auto space-y-0.5">
                                {goalTasks.length > 0 ? goalTasks.map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => { updateExpectation(exp.id, { taskId: t.id }); setLinkingExpId(null); }}
                                    className="w-full text-left px-2 py-1 text-xs text-[#f0f0f5] hover:bg-[rgba(0,229,255,0.1)] rounded flex items-center gap-1.5"
                                  >
                                    <span className="truncate">{t.name}</span>
                                  </button>
                                )) : <p className="text-xs text-[#6b6b80] py-1">No tasks in this goal</p>}
                              </div>
                              {exp.taskId && (
                                <button
                                  onClick={() => { updateExpectation(exp.id, { taskId: undefined as any }); setLinkingExpId(null); }}
                                  className="mt-1 flex items-center gap-1 text-[10px] text-[#ff3b5c] hover:underline"
                                >
                                  <Unlink className="w-2.5 h-2.5" /> Unlink
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {goalTasks.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-medium text-[#6b6b80] uppercase tracking-wider mb-1.5">Accumulated from tasks</p>
                        <div className="space-y-1">
                          {goalTasks.map(t => {
                            const tExps = expectations.filter(e => e.taskId === t.id);
                            return (
                              <div key={t.id} className="flex items-center justify-between px-2 py-1 bg-[#1a1a2e] border border-[rgba(0,229,255,0.03)] text-xs">
                                <span className={`text-[#f0f0f5] ${(t.status === 'approved' || t.status === 'completed') ? '' : 'text-[#6b6b80]'}`}>
                                  {t.name}
                                </span>
                                <span className="text-[#6b6b80]">
                                  {tExps.length} items · {t.status.replace('_', ' ')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={newExpText[goal.id] || ''}
                        onChange={(e) => setNewExpText(prev => ({ ...prev, [goal.id]: e.target.value }))}
                        placeholder="Add a gate expectation for this goal..."
                        className="flex-1 px-2 py-1.5 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-xs outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addExpectationForGoal(goal.id, newExpText[goal.id] || '');
                        }}
                      />
                      {canManage && (
                        <button
                          onClick={() => addExpectationForGoal(goal.id, newExpText[goal.id] || '')}
                          disabled={!(newExpText[goal.id] || '').trim()}
                          className="px-2 py-1.5 bg-[#00e5ff] text-[#0a0a0f] text-xs font-medium disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
