import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, Plus, Trash2, Loader } from 'lucide-react';
import { DefectIssueType, DefectSeverity, DefectPriority, DefectReproducibility, DefectFrequency } from '../types';

type DefectRow = {
  title: string;
  severity: DefectSeverity;
  priority: DefectPriority;
  module: string;
  description: string;
};

type DefectBulkCreateModalProps = {
  onClose: () => void;
  appId: string;
};

export function DefectBulkCreateModal({ onClose, appId }: DefectBulkCreateModalProps) {
  const { addDefect, apps } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();

  const app = apps.find(a => a.id === appId);

  const [common, setCommon] = useState({
    environment: 'dev' as 'dev' | 'staging' | 'production' | 'uat',
    issueType: 'bug' as DefectIssueType,
    reproducibility: 'always' as DefectReproducibility,
    frequency: '100' as DefectFrequency
  });

  const [rows, setRows] = useState<DefectRow[]>([
    { title: '', severity: 'major', priority: 'medium', module: '', description: '' }
  ]);

  const [submitting, setSubmitting] = useState(false);

  const updateRow = (index: number, field: keyof DefectRow, value: string) => {
    setRows(prev => prev.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => {
    setRows(prev => [...prev, { title: '', severity: 'major', priority: 'medium', module: '', description: '' }]);
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const validRows = rows.filter(r => r.title.trim());
  const allValid = validRows.length > 0;

  const handleSubmit = async () => {
    if (!currentUser || !allValid) return;
    setSubmitting(true);

    let created = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        await addDefect({
          title: row.title,
          description: row.description,
          applicationId: appId,
          module: row.module,
          environment: common.environment,
          reportedBy: currentUser.id,
          assignedTo: '',
          issueType: common.issueType,
          severity: row.severity,
          priority: row.priority,
          reproducibility: common.reproducibility,
          frequency: common.frequency,
          status: 'open',
          stepsToReproduce: '',
          expectedResult: '',
          actualResult: '',
          qaComments: '',
          developerNotes: '',
          testCycle: '',
          dateReported: new Date()
        });
        created++;
      } catch (error) {
        console.error(`Failed to create defect "${row.title}":`, error);
        failed++;
      }
    }

    setSubmitting(false);

    if (failed === 0) {
      showToast({ type: 'success', title: 'Defects Created', message: `${created} defect(s) reported successfully.` });
      onClose();
    } else {
      showToast({ type: 'warning', title: 'Partial Success', message: `${created} created, ${failed} failed.` });
      if (failed === 0 || created > 0) {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[rgba(0,0,0,0.7)] overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#020617] border border-[rgba(34,197,94,0.1)] p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#F8FAFC]">Bulk Add Defects</h2>
            <p className="text-sm text-[#94A3B8] mt-1">
              {app?.name || 'Unknown App'} — {validRows.length} defect(s) to create
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Common fields */}
        <div className="mb-6 p-4 bg-[#0F172A] border border-[rgba(34,197,94,0.1)]">
          <h3 className="text-sm font-medium text-[#F8FAFC] mb-3">Common Fields (applies to all)</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Environment</label>
              <select
                value={common.environment}
                onChange={(e) => setCommon({ ...common, environment: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
              >
                <option value="dev">Dev</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Issue Type</label>
              <select
                value={common.issueType}
                onChange={(e) => setCommon({ ...common, issueType: e.target.value as DefectIssueType })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
              >
                <option value="bug">Bug</option>
                <option value="ui_issue">UI Issue</option>
                <option value="performance">Performance</option>
                <option value="security">Security</option>
                <option value="crash">Crash</option>
                <option value="enhancement">Enhancement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Reproducibility</label>
              <select
                value={common.reproducibility}
                onChange={(e) => setCommon({ ...common, reproducibility: e.target.value as DefectReproducibility })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
              >
                <option value="always">Always</option>
                <option value="sometimes">Sometimes</option>
                <option value="rare">Rare</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Frequency</label>
              <select
                value={common.frequency}
                onChange={(e) => setCommon({ ...common, frequency: e.target.value as DefectFrequency })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
              >
                <option value="100">100%</option>
                <option value="intermittent">Intermittent</option>
                <option value="one_time">One Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Defect rows */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#F8FAFC]">Defects</h3>
            <button
              onClick={addRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#22C55E] text-sm hover:bg-[rgba(34,197,94,0.05)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-xs text-[#94A3B8] uppercase">
                  <th className="text-left py-2 pr-2 w-[30%]">Title *</th>
                  <th className="text-left py-2 px-2 w-[13%]">Severity</th>
                  <th className="text-left py-2 px-2 w-[13%]">Priority</th>
                  <th className="text-left py-2 px-2 w-[17%]">Module</th>
                  <th className="text-left py-2 px-2 w-[22%]">Description</th>
                  <th className="text-right py-2 pl-2 w-[5%]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => updateRow(index, 'title', e.target.value)}
                        placeholder="e.g. Login button not working"
                        className="w-full px-2 py-1.5 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={row.severity}
                        onChange={(e) => updateRow(index, 'severity', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
                      >
                        <option value="blocker">Blocker</option>
                        <option value="critical">Critical</option>
                        <option value="major">Major</option>
                        <option value="minor">Minor</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={row.priority}
                        onChange={(e) => updateRow(index, 'priority', e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.module}
                        onChange={(e) => updateRow(index, 'module', e.target.value)}
                        placeholder="Module"
                        className="w-full px-2 py-1.5 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(index, 'description', e.target.value)}
                        placeholder="Brief description"
                        className="w-full px-2 py-1.5 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm outline-none"
                      />
                    </td>
                    <td className="py-1.5 pl-2 text-right">
                      {rows.length > 1 && (
                        <button
                          onClick={() => removeRow(index)}
                          className="p-1 text-[#94A3B8] hover:text-[#ff3b5c]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(34,197,94,0.1)]">
          <p className="text-sm text-[#94A3B8]">
            {validRows.length} defect{validRows.length !== 1 ? 's' : ''} ready to submit
            {rows.some(r => !r.title.trim()) && (
              <span className="text-[#f59e0b] ml-2">({rows.filter(r => !r.title.trim()).length} row(s) missing title will be skipped)</span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0F172A] text-[#F8FAFC] border border-[rgba(34,197,94,0.1)] hover:bg-[#1E293B]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allValid || submitting}
              className="flex items-center gap-2 px-6 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] disabled:opacity-50"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating...' : `Submit All (${validRows.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}