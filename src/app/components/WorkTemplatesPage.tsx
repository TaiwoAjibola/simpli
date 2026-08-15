import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Copy, LayoutTemplate, CheckCircle } from 'lucide-react';
import { WorkTemplate } from '../types';

export function WorkTemplatesPage() {
  const { workTemplates, addWorkTemplate, deleteWorkTemplate, createWorkFromTemplate, apps, goals } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission('manage_workflow') || hasPermission('assign_tasks');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    workKind: 'task' as WorkTemplate['workKind'],
    title: '',
    priority: 'medium',
    workType: 'non-development'
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.title.trim()) return;
    await addWorkTemplate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      workKind: form.workKind,
      fields: {
        title: form.title.trim(),
        priority: form.priority as any,
        workType: form.workType as any
      },
      createdBy: currentUser?.id || ''
    });
    setForm({ name: '', description: '', workKind: 'task', title: '', priority: 'medium', workType: 'non-development' });
    setShowForm(false);
    showToast({ type: 'success', title: 'Template created', message: 'Work template saved.' });
  };

  const handleUse = async (template: WorkTemplate) => {
    const appId = template.appId || (apps[0]?.id ?? undefined);
    try {
      await createWorkFromTemplate(template.id, {
        appId,
        goalId: goals.find(g => g.appId === appId)?.id,
        assignedTo: currentUser ? [currentUser.id] : []
      });
      showToast({ type: 'success', title: 'Work created', message: `Created a ${template.workKind} from "${template.name}".` });
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to create', message: String(e) });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-[#22C55E]" />
            Work Templates
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">Reusable task, action point, and defect templates.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a]"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-5 rounded-lg mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Template name (e.g. Bug fix rollout)"
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            />
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <select
              value={form.workKind}
              onChange={e => setForm({ ...form, workKind: e.target.value as any })}
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            >
              <option value="task">Task</option>
              <option value="action_point">Action Point</option>
              <option value="defect">Defect</option>
            </select>
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            >
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
            <select
              value={form.workType}
              onChange={e => setForm({ ...form, workType: e.target.value })}
              className="px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
            >
              <option value="non-development">Non-development</option>
              <option value="development">Development</option>
            </select>
          </div>
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder={`Default ${form.workKind.replace('_', ' ')} title`}
            className="w-full px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
          />
          <button
            onClick={handleCreate}
            disabled={!form.name.trim() || !form.title.trim()}
            className="px-4 py-2 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] rounded disabled:opacity-50"
          >
            Save Template
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workTemplates.length === 0 && (
          <p className="text-sm text-[#94A3B8]">No templates yet. Create one to get started.</p>
        )}
        {workTemplates.map(t => (
          <div key={t.id} className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-[#F8FAFC]">{t.name}</h3>
                <p className="text-xs text-[#94A3B8] capitalize">{t.workKind.replace('_', ' ')}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleUse(t)}
                  className="p-1.5 text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)] rounded"
                  title="Create from template"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(t.fields.title); showToast({ type: 'success', title: 'Copied', message: 'Title copied.' }); }}
                  className="p-1.5 text-[#94A3B8] hover:bg-[rgba(34,197,94,0.1)] rounded"
                  title="Copy title"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {canManage && (
                  <button
                    onClick={() => deleteWorkTemplate(t.id)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#ef4444] rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {t.description && <p className="text-sm text-[#94A3B8] mt-2">{t.description}</p>}
            <div className="mt-3 text-xs text-[#94A3B8]">
              <p className="capitalize">Priority: {t.fields.priority || 'medium'}</p>
              <p className="capitalize">Type: {t.fields.workType || 'non-development'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}