import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, History } from 'lucide-react';
import { Automation, AutomationTriggerEvent } from '../types';

const EVENTS: AutomationTriggerEvent[] = [
  'task_created', 'task_status_changed', 'defect_created', 'defect_status_changed',
  'pr_opened', 'review_approved', 'review_changes_requested', 'ci_failed', 'ci_passed', 'pr_merged'
];

export function AutomationsPage() {
  const { automations, addAutomation, updateAutomation, deleteAutomation } = useApp();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission('manage_automations') || hasPermission('manage_workflow');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    event: 'pr_opened' as AutomationTriggerEvent,
    workKind: 'task',
    workType: '',
    statusFilter: '',
    setStatus: ''
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.setStatus.trim()) return;
    await addAutomation({
      name: form.name.trim(),
      enabled: true,
      trigger: {
        event: form.event,
        filter: {
          workKind: form.workKind as any,
          ...(form.workType ? { workType: form.workType as any } : {}),
          ...(form.statusFilter ? { status: form.statusFilter } : {})
        }
      },
      action: { setStatus: form.setStatus.trim() }
    });
    setForm({ name: '', event: 'pr_opened', workKind: 'task', workType: '', statusFilter: '', setStatus: '' });
    setShowForm(false);
    showToast({ type: 'success', title: 'Automation created', message: 'Rule saved.' });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#22C55E]" />
            Automations
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Rules that react to work events with permission-protected, idempotent actions.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a]"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-5 rounded-lg mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Rule name (e.g. Move to QA on PR open)"
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            />
            <select
              value={form.event}
              onChange={e => setForm({ ...form, event: e.target.value as AutomationTriggerEvent })}
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            >
              {EVENTS.map(ev => (
                <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <select
              value={form.workKind}
              onChange={e => setForm({ ...form, workKind: e.target.value })}
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            >
              <option value="">Any kind</option>
              <option value="task">Task</option>
              <option value="defect">Defect</option>
              <option value="action_point">Action Point</option>
            </select>
            <select
              value={form.workType}
              onChange={e => setForm({ ...form, workType: e.target.value })}
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            >
              <option value="">Any type</option>
              <option value="development">Development</option>
              <option value="non-development">Non-development</option>
            </select>
            <input
              value={form.statusFilter}
              onChange={e => setForm({ ...form, statusFilter: e.target.value })}
              placeholder="Only when status is (e.g. in_progress)"
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            />
          </div>
          <input
            value={form.setStatus}
            onChange={e => setForm({ ...form, setStatus: e.target.value })}
            placeholder="Action: set status to (e.g. completed)"
            className="w-full px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
          />
          <button
            onClick={handleCreate}
            disabled={!form.name.trim() || !form.setStatus.trim()}
            className="px-4 py-2 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] rounded disabled:opacity-50"
          >
            Save Rule
          </button>
        </div>
      )}

      <div className="space-y-3">
        {automations.length === 0 && (
          <p className="text-sm text-[#94A3B8]">No automation rules yet.</p>
        )}
        {automations.map(a => (
          <div key={a.id} className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[#F8FAFC]">{a.name}</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  When <span className="text-[#22C55E]">{a.trigger.event.replace(/_/g, ' ')}</span>
                  {a.trigger.filter?.workKind ? ` · ${a.trigger.filter.workKind}` : ''}
                  {a.trigger.filter?.workType ? ` · ${a.trigger.filter.workType}` : ''}
                  {a.trigger.filter?.status ? ` · status=${a.trigger.filter.status}` : ''}
                  {' → '}set status to <span className="text-[#10b981]">{a.action.setStatus || '-'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <>
                    <button
                      onClick={() => updateAutomation(a.id, { enabled: !a.enabled })}
                      className="text-[#F8FAFC] hover:opacity-80"
                      title={a.enabled ? 'Disable' : 'Enable'}
                    >
                      {a.enabled ? <ToggleRight className="w-5 h-5 text-[#10b981]" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="p-1.5 text-[#94A3B8] hover:text-[#22C55E]">
                      <History className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteAutomation(a.id)} className="p-1.5 text-[#94A3B8] hover:text-[#ef4444]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {expanded === a.id && (
              <div className="mt-3 border-t border-[rgba(34,197,94,0.1)] pt-3">
                <p className="text-xs text-[#94A3B8] mb-2">Run history ({a.runHistory?.length || 0})</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {(a.runHistory || []).slice().reverse().map(r => (
                    <div key={r.runId} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${r.outcome === 'applied' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]' : 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'}`}>
                        {r.outcome}
                      </span>
                      <span className="text-[#F8FAFC]">{r.workKind} {r.workId}</span>
                      <span className="text-[#94A3B8]">{r.runAt.toLocaleString()}</span>
                      {r.note && <span className="text-[#94A3B8] truncate">{r.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}