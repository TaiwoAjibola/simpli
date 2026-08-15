import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Link2, Unlink, Plus, AlertTriangle } from 'lucide-react';
import { WorkDependencyType } from '../types';

type WorkRef = { kind: 'task' | 'defect' | 'action_point'; id: string; label: string };

type DependenciesPanelProps = {
  workKind: 'task' | 'defect' | 'action_point';
  workId: string;
  workRefs: WorkRef[];
};

export function DependenciesPanel({ workKind, workId, workRefs }: DependenciesPanelProps) {
  const { getDependenciesForWork, deleteWorkDependency, addWorkDependency } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [depType, setDepType] = useState<WorkDependencyType>('blocked_by');
  const [targetId, setTargetId] = useState('');

  const deps = getDependenciesForWork(workKind, workId);
  const canManage = hasPermission('assign_tasks') || hasPermission('manage_workflow');

  const blockedBy = deps.filter(d => d.type === 'blocked_by' && d.toKind === workKind && d.toId === workId);
  const blocking = deps.filter(d => d.type === 'blocks' && d.fromKind === workKind && d.fromId === workId);

  const labelFor = (kind: string, id: string) => {
    const ref = workRefs.find(r => r.kind === kind && r.id === id);
    return ref ? ref.label : `${kind} ${id}`;
  };

  const handleAdd = async () => {
    if (!targetId) return;
    const target = workRefs.find(r => r.id === targetId && r.kind !== workKind);
    if (!target) {
      showToast({ type: 'error', title: 'Invalid target', message: 'Select a work item to link.' });
      return;
    }
    if (target.id === workId) return;
    await addWorkDependency({
      fromKind: workKind,
      fromId: workId,
      toKind: target.kind,
      toId: target.id,
      type: depType,
      createdBy: currentUser?.id || ''
    });
    setTargetId('');
    setShowAdd(false);
    showToast({ type: 'success', title: 'Dependency added', message: 'Work item linked.' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Dependencies
          <span className="text-xs font-normal text-[#94A3B8]">({deps.length})</span>
        </h3>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)] rounded"
          >
            <Plus className="w-3.5 h-3.5" /> Link Work
          </button>
        )}
      </div>

      {blockedBy.length > 0 && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] p-3 rounded">
          <p className="text-xs font-medium text-[#ef4444] flex items-center gap-1 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Blocked by
          </p>
          <ul className="space-y-1">
            {blockedBy.map(d => (
              <li key={d.id} className="flex items-center justify-between text-sm text-[#F8FAFC]">
                <span>{labelFor(d.fromKind, d.fromId)}</span>
                {canManage && (
                  <button onClick={() => deleteWorkDependency(d.id)} className="text-[#94A3B8] hover:text-[#ef4444]">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blocking.length > 0 && (
        <div className="bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.3)] p-3 rounded">
          <p className="text-xs font-medium text-[#eab308] mb-2">Blocks</p>
          <ul className="space-y-1">
            {blocking.map(d => (
              <li key={d.id} className="flex items-center justify-between text-sm text-[#F8FAFC]">
                <span>{labelFor(d.toKind, d.toId)}</span>
                {canManage && (
                  <button onClick={() => deleteWorkDependency(d.id)} className="text-[#94A3B8] hover:text-[#ef4444]">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {deps.filter(d => d.type === 'related_to').length > 0 && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3 rounded">
          <p className="text-xs font-medium text-[#94A3B8] mb-2">Related to</p>
          <ul className="space-y-1">
            {deps.filter(d => d.type === 'related_to').map(d => (
              <li key={d.id} className="flex items-center justify-between text-sm text-[#F8FAFC]">
                <span>
                  {d.fromKind === workKind && d.fromId === workId
                    ? labelFor(d.toKind, d.toId)
                    : labelFor(d.fromKind, d.fromId)}
                </span>
                {canManage && (
                  <button onClick={() => deleteWorkDependency(d.id)} className="text-[#94A3B8] hover:text-[#ef4444]">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAdd && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3 rounded space-y-2">
          <select
            value={depType}
            onChange={e => setDepType(e.target.value as WorkDependencyType)}
            className="w-full bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
          >
            <option value="blocked_by">Blocked by</option>
            <option value="blocks">Blocks</option>
            <option value="related_to">Related to</option>
          </select>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
          >
            <option value="">Select work item...</option>
            {workRefs.filter(r => r.id !== workId).map(r => (
              <option key={r.kind + r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!targetId}
            className="w-full px-3 py-1.5 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] rounded disabled:opacity-50"
          >
            Add Link
          </button>
        </div>
      )}
    </div>
  );
}