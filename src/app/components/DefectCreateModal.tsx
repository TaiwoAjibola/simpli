import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { X, Upload, Paperclip } from 'lucide-react';
import { DefectIssueType, DefectSeverity, DefectPriority, DefectReproducibility, DefectFrequency } from '../types';

type DefectCreateModalProps = {
  onClose: () => void;
  appId: string;
};

export function DefectCreateModal({ onClose, appId }: DefectCreateModalProps) {
  const { addDefect, apps, employees } = useApp();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    applicationId: appId,
    module: '',
    environment: 'dev' as 'dev' | 'staging' | 'production' | 'uat',
    assignedTo: '',
    dueDate: '',
    issueType: 'bug' as DefectIssueType,
    severity: 'major' as DefectSeverity,
    priority: 'medium' as DefectPriority,
    reproducibility: 'always' as DefectReproducibility,
    frequency: '100' as DefectFrequency,
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    qaComments: '',
    developerNotes: '',
    testCycle: ''
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    try {
      let attachmentUrls: any[] = [];
      if (attachments.length > 0) {
        const { storage } = await import('../../firebase/config');
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

        for (const file of attachments) {
          const fileRef = ref(storage, `defects/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(fileRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          attachmentUrls.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: downloadURL,
            size: file.size,
            type: file.type,
            uploadedAt: new Date(),
            uploadedBy: currentUser.id
          });
        }
      }

      await addDefect({
        ...formData,
        reportedBy: currentUser.id,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        status: 'open',
        attachments: attachmentUrls
      });

      onClose();
    } catch (error) {
      console.error('Error creating defect:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,229,255,0.1)] sticky top-0 bg-[#12121a] z-10">
          <h2 className="text-xl font-bold text-[#f0f0f5]">Report New Defect</h2>
          <button onClick={onClose} className="p-2 text-[#6b6b80] hover:text-[#f0f0f5]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Application</label>
              <select
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                {apps.map(app => (
                  <option key={app.id} value={app.id}>{app.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Module</label>
              <input
                type="text"
                value={formData.module}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
                placeholder="e.g. Authentication, Payments"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Issue Type</label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value as DefectIssueType })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
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
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as DefectSeverity })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as DefectPriority })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Reproducibility</label>
              <select
                value={formData.reproducibility}
                onChange={(e) => setFormData({ ...formData, reproducibility: e.target.value as DefectReproducibility })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                <option value="always">Always</option>
                <option value="sometimes">Sometimes</option>
                <option value="rare">Rare</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as DefectFrequency })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                <option value="100">100%</option>
                <option value="intermittent">Intermittent</option>
                <option value="one_time">One-time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Assign To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              >
                <option value="">Select developer</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] h-20 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Steps to Reproduce</label>
              <textarea
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] h-20 resize-none"
                placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Expected Result</label>
              <textarea
                value={formData.expectedResult}
                onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] h-20 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Actual Result</label>
              <textarea
                value={formData.actualResult}
                onChange={(e) => setFormData({ ...formData, actualResult: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] h-20 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">QA Comments</label>
              <textarea
                value={formData.qaComments}
                onChange={(e) => setFormData({ ...formData, qaComments: e.target.value })}
                className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] h-16 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Attachments</label>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] cursor-pointer hover:bg-[rgba(0,229,255,0.05)]">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Files</span>
                  <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                </label>
                {attachments.length > 0 && (
                  <span className="text-sm text-[#6b6b80]">{attachments.length} file(s) selected</span>
                )}
              </div>
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[#00e5ff]" />
                        <span className="text-sm text-[#f0f0f5]">{file.name}</span>
                        <span className="text-xs text-[#6b6b80]">({formatFileSize(file.size)})</span>
                      </div>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-[#ff3b5c] hover:text-[#ff5c7a]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(0,229,255,0.1)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[rgba(255,255,255,0.05)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.title}
              className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Defect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
