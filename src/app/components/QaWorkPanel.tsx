import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CheckCircle, XCircle, Loader, Bug } from 'lucide-react';
import { QaCycle, QaCycleResult } from '../types';

type QaWorkPanelProps = {
  workKind: 'task' | 'defect' | 'action_point';
  workId: string;
  qualifies: boolean;
};

export function QaWorkPanel({ workKind, workId, qualifies }: QaWorkPanelProps) {
  const { getQaCyclesForWork, recordQaResult, addDefect } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'production' | 'uat'>('staging');
  const [notes, setNotes] = useState('');
  const [defectsDiscovered, setDefectsDiscovered] = useState('');
  const [busy, setBusy] = useState(false);

  const cycles = getQaCyclesForWork(workKind, workId);
  const canTest = hasPermission('run_qa') && qualifies;

  const handleRecord = async (result: QaCycleResult) => {
    if (!currentUser) return;
    setBusy(true);
    try {
      const defectRefs = defectsDiscovered
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await recordQaResult({
        workKind,
        workId,
        environment,
        result,
        notes,
        defectsDiscovered: defectRefs
      });
      showToast({
        type: result === 'pass' ? 'success' : 'error',
        title: result === 'pass' ? 'QA Passed' : 'QA Failed',
        message: result === 'pass' ? 'Work item passed verification.' : 'Work item returned for fixes.'
      });
      setNotes('');
    } catch (e) {
      showToast({ type: 'error', title: 'QA failed to record', message: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[#F8FAFC] mb-2 flex items-center gap-2">
          QA Cycles
          <span className="text-xs font-normal text-[#94A3B8]">({cycles.length})</span>
        </h3>
        {cycles.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">No QA cycles recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {cycles.map(c => (
              <li key={c.id} className="flex items-start gap-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3 rounded">
                {c.result === 'pass' ? (
                  <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                )}
                <div className="text-sm text-[#F8FAFC]">
                  <span className="font-medium">Cycle {c.cycleNumber}</span>
                  <span className="text-[#94A3B8]"> · {c.environment} · {new Date(c.testedAt).toLocaleDateString()}</span>
                  {c.notes && <p className="text-sm text-[#CBD5E1] mt-1">{c.notes}</p>}
                  {c.defectsDiscovered.length > 0 && (
                    <p className="text-xs text-[#ef4444] mt-1">
                      <Bug className="w-3 h-3 inline mr-1" />
                      Discovered: {c.defectsDiscovered.join(', ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canTest && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3 rounded space-y-3">
          <h3 className="text-sm font-semibold text-[#F8FAFC]">Record QA Result</h3>
          <select
            value={environment}
            onChange={e => setEnvironment(e.target.value as any)}
            className="w-full bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
          >
            {(['dev', 'staging', 'production', 'uat'] as const).map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="QA notes..."
            className="w-full bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded min-h-[80px]"
          />
          {workKind === 'task' && (
            <input
              value={defectsDiscovered}
              onChange={e => setDefectsDiscovered(e.target.value)}
              placeholder="New defect codes discovered (comma separated, e.g. DEF-101)"
              className="w-full bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleRecord('pass')}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#10b981] text-white text-sm hover:bg-[#059669] rounded disabled:opacity-50"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Mark Passed
            </button>
            <button
              onClick={() => handleRecord('fail')}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#dc2626] text-white text-sm hover:bg-[#b91c1c] rounded disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Mark Failed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}