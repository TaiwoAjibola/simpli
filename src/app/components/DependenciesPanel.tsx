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
    <div className="space-y-4" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[#37352F] flex items-center gap-2 tracking-[-0.01em]">
          <Link2 className="w-4 h-4 text-[#787774]" />
          Dependencies
          <span className="text-[12px] font-normal text-[#787774]">({deps.length})</span>
        </h3>
        {canManage && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-[6px] text-[14px] font-medium rounded-[6px] cursor-pointer transition-colors duration-150 bg-white border border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F7F5]"
          >
            <Plus className="w-3.5 h-3.5" /> Link work
          </button>
        )}
      </div>

      {blockedBy.length > 0 && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-3">
          <p className="text-[12px] font-medium text-[#EB5757] flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Blocked by
          </p>
          <ul className="space-y-1.5">
            {blockedBy.map(d => (
              <li key={d.id} className="flex items-center justify-between text-[14px] text-[#37352F] bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] px-2.5 py-1.5">
                <span className="truncate">{labelFor(d.fromKind, d.fromId)}</span>
                {canManage && (
                  <button onClick={() => deleteWorkDependency(d.id)} className="ml-2 p-1 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] cursor-pointer transition-colors duration-150 shrink-0">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blocking.length > 0 && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-3">
          <p className="text-[12px] font-medium text-[#787774] mb-2">Blocks</p>
          <ul className="space-y-1.5">
            {blocking.map(d => (
              <li key={d.id} className="flex items-center justify-between text-[14px] text-[#37352F] bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] px-2.5 py-1.5">
                <span className="truncate">{labelFor(d.toKind, d.toId)}</span>
                {canManage && (
                  <button onClick={() => deleteWorkDependency(d.id)} className="ml-2 p-1 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] cursor-pointer transition-colors duration-150 shrink-0">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {deps.filter(d => d.type === 'related_to').length > 0 && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-3">
          <p className="text-[12px] font-medium text-[#787774] mb-2">Related to</p>
          <ul className="space-y-1.5">
            {deps.filter(d => d.type === 'related_to').map(d => (
              <li key={d.id} className="flex items-center justify-between text-[14px] text-[#37352F] bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] px-2.5 py-1.5">
                <span className="truncate">
                  {d.fromKind === workKind && d.fromId === workId
                    ? labelFor(d.toKind, d.toId)
                    : labelFor(d.fromKind, d.fromId)}
                </span>
                {canManage && (
                  <button onClick={() => deleteWorkDependency(d.id)} className="ml-2 p-1 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] cursor-pointer transition-colors duration-150 shrink-0">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {deps.length === 0 && !showAdd && (
        <p className="text-[14px] text-[#787774] bg-white border border-[#E9E9E7] rounded-[8px] p-4 text-center">No dependencies linked.</p>
      )}

      {showAdd && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-3 space-y-3">
          <select
            value={depType}
            onChange={e => setDepType(e.target.value as WorkDependencyType)}
            className="w-full bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] px-2.5 py-[6px] outline-none focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] cursor-pointer transition-colors duration-150"
          >
            <option value="blocked_by">Blocked by</option>
            <option value="blocks">Blocks</option>
            <option value="related_to">Related to</option>
          </select>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] px-2.5 py-[6px] outline-none focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] cursor-pointer transition-colors duration-150"
          >
            <option value="">Select work item…</option>
            {workRefs.filter(r => r.id !== workId).map(r => (
              <option key={r.kind + r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!targetId}
            className="w-full px-3 py-[6px] bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 cursor-pointer transition-colors duration-150"
          >
            Add link
          </button>
        </div>
      )}
    </div>
  );
}
