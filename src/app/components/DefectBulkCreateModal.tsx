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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-[rgba(0,0,0,0.3)] overflow-y-auto p-4" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="w-full max-w-[900px] bg-white border border-[#E9E9E7] rounded-[8px] p-6 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#37352F]">Bulk Add Defects</h2>
            <p className="text-[14px] text-[#787774] mt-1">
              {app?.name || 'Unknown App'} — {validRows.length} defect(s) to create
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-6">
          <div className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px]">
            <h3 className="text-[14px] font-medium text-[#37352F] mb-3">Common Fields (applies to all)</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-[#37352F] mb-1.5">Environment</label>
                <select
                  value={common.environment}
                  onChange={(e) => setCommon({ ...common, environment: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
                >
                  <option value="dev">Dev</option>
                  <option value="staging">Staging</option>
                  <option value="uat">UAT</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#37352F] mb-1.5">Issue Type</label>
                <select
                  value={common.issueType}
                  onChange={(e) => setCommon({ ...common, issueType: e.target.value as DefectIssueType })}
                  className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
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
                <label className="block text-[12px] font-medium text-[#37352F] mb-1.5">Reproducibility</label>
                <select
                  value={common.reproducibility}
                  onChange={(e) => setCommon({ ...common, reproducibility: e.target.value as DefectReproducibility })}
                  className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
                >
                  <option value="always">Always</option>
                  <option value="sometimes">Sometimes</option>
                  <option value="rare">Rare</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#37352F] mb-1.5">Frequency</label>
                <select
                  value={common.frequency}
                  onChange={(e) => setCommon({ ...common, frequency: e.target.value as DefectFrequency })}
                  className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
                >
                  <option value="100">100%</option>
                  <option value="intermittent">Intermittent</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-[#37352F]">Defects</h3>
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E9E9E7] rounded-[6px] text-[14px] font-medium text-[#37352F] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#787774]" />
                Add Row
              </button>
            </div>

            <div className="overflow-x-auto border border-[#E9E9E7] rounded-[8px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[12px] text-[#787774] uppercase tracking-wide bg-[#F7F7F5] border-b border-[#E9E9E7]">
                    <th className="text-left py-2.5 px-3 font-medium w-[30%]">Title *</th>
                    <th className="text-left py-2.5 px-3 font-medium w-[13%]">Severity</th>
                    <th className="text-left py-2.5 px-3 font-medium w-[13%]">Priority</th>
                    <th className="text-left py-2.5 px-3 font-medium w-[17%]">Module</th>
                    <th className="text-left py-2.5 px-3 font-medium w-[22%]">Description</th>
                    <th className="text-right py-2.5 px-3 font-medium w-[5%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-b border-[#E9E9E7] last:border-b-0 hover:bg-[#F7F7F5] transition-colors duration-150">
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => updateRow(index, 'title', e.target.value)}
                          placeholder="e.g. Login button not working"
                          className="w-full px-2 py-1.5 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={row.severity}
                          onChange={(e) => updateRow(index, 'severity', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
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
                          className="w-full px-2 py-1.5 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
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
                          className="w-full px-2 py-1.5 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(index, 'description', e.target.value)}
                          placeholder="Brief description"
                          className="w-full px-2 py-1.5 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {rows.length > 1 && (
                          <button onClick={() => removeRow(index)} className="p-1 text-[#787774] hover:text-[#EB5757] hover:bg-white rounded-[6px] transition-colors duration-150 cursor-pointer">
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
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E9E9E7] mt-6 flex-shrink-0">
          <p className="text-[14px] text-[#787774]">
            {validRows.length} defect{validRows.length !== 1 ? 's' : ''} ready to submit
            {rows.some(r => !r.title.trim()) && (
              <span className="text-[#EB5757] ml-2">({rows.filter(r => !r.title.trim()).length} row(s) missing title will be skipped)</span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] rounded-[6px] text-[14px] font-medium hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allValid || submitting}
              className="flex items-center gap-2 px-6 py-2 bg-[#2383E2] text-white font-medium rounded-[6px] text-[14px] hover:bg-[#1A6FC0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
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
