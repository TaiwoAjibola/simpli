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
    <div className="space-y-4" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div>
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-3 flex items-center gap-2 tracking-[-0.01em]">
          QA cycles
          <span className="text-[12px] font-normal text-[#787774]">({cycles.length})</span>
        </h3>
        {cycles.length === 0 ? (
          <p className="text-[14px] text-[#787774] bg-white border border-[#E9E9E7] rounded-[8px] p-4 text-center">No QA cycles recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {cycles.map(c => (
              <li key={c.id} className="flex items-start gap-3 bg-white border border-[#E9E9E7] rounded-[8px] p-3 hover:bg-[#F7F7F5] transition-colors duration-150">
                <span className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5 border ${c.result === 'pass' ? 'bg-white border-[#E9E9E7] text-[#0F7B6C]' : 'bg-white border-[#E9E9E7] text-[#EB5757]'}`}>
                  {c.result === 'pass' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-[#37352F]">Cycle {c.cycleNumber}</span>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-[6px] border ${c.result === 'pass' ? 'bg-[#F7F7F5] border-[#E9E9E7] text-[#0F7B6C]' : 'bg-[#F7F7F5] border-[#E9E9E7] text-[#EB5757]'}`}>
                      {c.result === 'pass' ? 'Pass' : 'Fail'}
                    </span>
                    <span className="text-[12px] text-[#787774]">{c.environment} · {new Date(c.testedAt).toLocaleDateString()}</span>
                  </div>
                  {c.notes && <p className="text-[14px] text-[#37352F] mt-1 leading-[1.5]">{c.notes}</p>}
                  {c.defectsDiscovered.length > 0 && (
                    <p className="text-[12px] text-[#EB5757] mt-1 flex items-center gap-1">
                      <Bug className="w-3 h-3" />
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
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-4 space-y-3">
          <h3 className="text-[14px] font-semibold text-[#37352F] tracking-[-0.01em]">Record QA result</h3>
          <div>
            <label className="block text-[12px] font-medium text-[#787774] mb-1">Environment</label>
            <select
              value={environment}
              onChange={e => setEnvironment(e.target.value as any)}
              className="w-full bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] px-2.5 py-[6px] outline-none focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] cursor-pointer transition-colors duration-150"
            >
              {(['dev', 'staging', 'production', 'uat'] as const).map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#787774] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="QA notes…"
              className="w-full bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] px-2.5 py-[6px] min-h-[80px] outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] resize-none transition-colors duration-150"
            />
          </div>
          {workKind === 'task' && (
            <div>
              <label className="block text-[12px] font-medium text-[#787774] mb-1">Defects discovered</label>
              <input
                value={defectsDiscovered}
                onChange={e => setDefectsDiscovered(e.target.value)}
                placeholder="Comma separated, e.g. DEF-101"
                className="w-full bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] px-2.5 py-[6px] outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] transition-colors duration-150"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleRecord('pass')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-[6px] bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 cursor-pointer transition-colors duration-150"
            >
              {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Mark passed
            </button>
            <button
              onClick={() => handleRecord('fail')}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-[6px] bg-white border border-[#E9E9E7] text-[#37352F] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] hover:text-[#EB5757] hover:border-[#E9E9E7] disabled:opacity-50 cursor-pointer transition-colors duration-150"
            >
              <XCircle className="w-4 h-4" />
              Mark failed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
