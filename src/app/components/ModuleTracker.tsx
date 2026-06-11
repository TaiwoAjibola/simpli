import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Link,
  Unlink,
  Flag,
  ChevronDown,
  ChevronRight,
  Layers
} from 'lucide-react';

export function ModuleTracker() {
  const { currentUser, hasPermission } = useAuth();
  const { apps, modules, goals, tasks, expectations, addModule, updateModule, deleteModule, getModulesForApp, addExpectation, updateExpectation, deleteExpectation, getExpectationsForModule, getGoalById } = useApp();
  const canManage = hasPermission('manage_modules');

  const [showForm, setShowForm] = useState(false);
  const [formAppId, setFormAppId] = useState('');
  const [formName, setFormName] = useState('');
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [newExpText, setNewExpText] = useState<Record<string, string>>({});
  const [linkingExpId, setLinkingExpId] = useState<string | null>(null);

  const activeApps = apps.filter(a => a.status === 'active');

  const handleAddModule = async () => {
    if (!formName.trim() || !formAppId || !currentUser) return;
    await addModule({ appId: formAppId, name: formName.trim(), status: 'open', createdBy: currentUser.id });
    setFormName('');
    setShowForm(false);
  };

  const addExpectationForModule = async (moduleId: string, text: string) => {
    if (!text.trim() || !currentUser) return;
    await addExpectation({ moduleId, description: text.trim(), status: 'pending', createdBy: currentUser.id });
    setNewExpText(prev => ({ ...prev, [moduleId]: '' }));
  };

  const toggleApp = (appId: string) => {
    setExpandedApps(prev => {
      const next = new Set(prev);
      next.has(appId) ? next.delete(appId) : next.add(appId);
      return next;
    });
  };

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-8 h-8 text-[#00e5ff]" />
            <h1 className="text-3xl font-bold text-[#f0f0f5]">Module Tracker</h1>
          </div>
          <p className="text-[#6b6b80]">Track what was promised vs what was delivered for each module</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setShowForm(!showForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
          >
            <Plus className="w-4 h-4" />
            New Module
          </button>
        )}
      </div>

      {showForm && canManage && (
        <div className="mb-6 p-4 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[#f0f0f5] mb-1">App</label>
            <select
              value={formAppId}
              onChange={(e) => setFormAppId(e.target.value)}
              className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm outline-none"
            >
              <option value="">Select app...</option>
              {activeApps.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-[#f0f0f5] mb-1">Module Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Phase 1 Delivery, MVP Review"
              className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
            />
          </div>
          <button
            onClick={handleAddModule}
            disabled={!formAppId || !formName.trim()}
            className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium disabled:opacity-50"
          >
            Create
          </button>
          <button
            onClick={() => setShowForm(false)}
            className="px-4 py-2 bg-[#12121a] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)]"
          >
            Cancel
          </button>
        </div>
      )}

      {activeApps.length === 0 ? (
        <div className="text-center py-16 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
          <Layers className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80] text-lg mb-2">No active apps</p>
          <p className="text-[#6b6b80] text-sm">Create an app first to start tracking modules</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeApps.map(app => {
            const appModules = getModulesForApp(app.id);
            const isAppExpanded = expandedApps.has(app.id);
            const totalModExps = appModules.flatMap(m => getExpectationsForModule(m.id));
            const achievedModExps = totalModExps.filter(e => e.status === 'achieved');

            return (
              <div key={app.id} className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
                <button
                  onClick={() => toggleApp(app.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[rgba(255,255,255,0.02)]"
                >
                  {isAppExpanded ? <ChevronDown className="w-5 h-5 text-[#6b6b80]" /> : <ChevronRight className="w-5 h-5 text-[#6b6b80]" />}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: app.color || '#00e5ff' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#f0f0f5]">{app.name}</h3>
                    <p className="text-xs text-[#6b6b80]">{appModules.length} modules · {totalModExps.length} expectations</p>
                  </div>
                  {totalModExps.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                        <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${(achievedModExps / totalModExps.length) * 100}%` }} />
                      </div>
                      <span className="text-xs text-[#6b6b80] whitespace-nowrap">{achievedModExps}/{totalModExps.length}</span>
                    </div>
                  )}
                </button>

                {isAppExpanded && (
                  <div className="border-t border-[rgba(0,229,255,0.1)] p-4 space-y-3">
                    {appModules.length === 0 && (
                      <p className="text-sm text-[#6b6b80] text-center py-4">No modules yet for this app</p>
                    )}
                    {appModules.map(mod => {
                      const modExps = getExpectationsForModule(mod.id);
                      const modAchieved = modExps.filter(e => e.status === 'achieved').length;
                      const isModExpanded = expandedModules.has(mod.id);

                      return (
                        <div key={mod.id} className="bg-[#1a1a2e] border border-[rgba(0,229,255,0.05)]">
                          <button
                            onClick={() => toggleModule(mod.id)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-[rgba(255,255,255,0.02)]"
                          >
                            {isModExpanded ? <ChevronDown className="w-4 h-4 text-[#6b6b80]" /> : <ChevronRight className="w-4 h-4 text-[#6b6b80]" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#f0f0f5] text-sm">{mod.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 ${mod.status === 'open' ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]' : 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'}`}>
                                  {mod.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {modExps.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-16 h-1 bg-[#12121a] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${(modAchieved / modExps.length) * 100}%` }} />
                                  </div>
                                  <span className="text-xs text-[#6b6b80]">{modAchieved}/{modExps.length}</span>
                                </div>
                              )}
                              {canManage && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteModule(mod.id); }}
                                  className="p-1 text-[#6b6b80] hover:text-[#ff3b5c]"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </button>

                          {isModExpanded && (
                            <div className="border-t border-[rgba(0,229,255,0.05)] p-3 space-y-2">
                              {modExps.map(exp => (
                                <div key={exp.id} className="flex items-start gap-2 p-2 bg-[#12121a] border border-[rgba(0,229,255,0.03)]">
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
                                      {exp.taskId && (
                                        <span className="text-[10px] text-[#00e5ff] flex items-center gap-0.5">
                                          <Link className="w-2.5 h-2.5" />
                                          {tasks.find(t => t.id === exp.taskId)?.name || 'Unknown'}
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
                                        <Trash2 className="w-3 h-3" />
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
                                        {(() => {
                                          const appGoalIds = new Set(goals.filter(g => g.appId === mod.appId).map(g => g.id));
                                          const appTasks = tasks.filter(t => appGoalIds.has(t.goalId || ''));
                                          return appTasks.length > 0 ? appTasks.map(t => (
                                            <button
                                              key={t.id}
                                              onClick={() => { updateExpectation(exp.id, { taskId: t.id }); setLinkingExpId(null); }}
                                              className="w-full text-left px-2 py-1 text-xs text-[#f0f0f5] hover:bg-[rgba(0,229,255,0.1)] rounded flex items-center gap-1.5"
                                            >
                                              <span className="truncate">{t.name}</span>
                                            </button>
                                          )) : <p className="text-xs text-[#6b6b80] py-1">No tasks in this app</p>;
                                        })()}
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
                              ))}

                              <div className="flex gap-1.5 pt-1">
                                <input
                                  type="text"
                                  value={newExpText[mod.id] || ''}
                                  onChange={(e) => setNewExpText(prev => ({ ...prev, [mod.id]: e.target.value }))}
                                  placeholder="What do you hope to achieve?"
                                  className="flex-1 px-2 py-1.5 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-xs outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      addExpectationForModule(mod.id, newExpText[mod.id] || '');
                                    }
                                  }}
                                />
                                {canManage && (
                                  <button
                                    onClick={() => addExpectationForModule(mod.id, newExpText[mod.id] || '')}
                                    disabled={!(newExpText[mod.id] || '').trim()}
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
          })}
        </div>
      )}
    </div>
  );
}
