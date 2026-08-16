import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, Upload, Paperclip, Loader } from 'lucide-react';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DefectIssueType, DefectSeverity, DefectPriority, DefectReproducibility, DefectFrequency, Defect } from '../types';

type DefectCreateModalProps = {
  onClose: () => void;
  appId?: string;
  editDefect?: Defect;
};

export function DefectCreateModal({ onClose, appId, editDefect }: DefectCreateModalProps) {
  const { addDefect, updateDefect, apps, employees, repositories, updateWorkGithub } = useApp();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isEditing = !!editDefect;
  const [formData, setFormData] = useState({
    title: editDefect?.title || '',
    description: editDefect?.description || '',
    applicationId: editDefect?.applicationId || appId || '',
    module: editDefect?.module || '',
    environment: editDefect?.environment || 'dev' as 'dev' | 'staging' | 'production' | 'uat',
    assignedTo: editDefect?.assignedTo || '',
    dueDate: editDefect?.dueDate ? (typeof editDefect.dueDate === 'string' ? editDefect.dueDate : editDefect.dueDate.toISOString().split('T')[0]) : '',
    issueType: editDefect?.issueType || 'bug' as DefectIssueType,
    severity: editDefect?.severity || 'major' as DefectSeverity,
    priority: editDefect?.priority || 'medium' as DefectPriority,
    reproducibility: editDefect?.reproducibility || 'always' as DefectReproducibility,
    frequency: editDefect?.frequency || '100' as DefectFrequency,
    stepsToReproduce: editDefect?.stepsToReproduce || '',
    expectedResult: editDefect?.expectedResult || '',
    actualResult: editDefect?.actualResult || '',
    qaComments: editDefect?.qaComments || '',
    developerNotes: editDefect?.developerNotes || '',
    testCycle: editDefect?.testCycle || ''
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    setUploadProgress(0);

    try {
      if (isEditing) {
        await updateDefect(editDefect.id, {
          title: formData.title,
          description: formData.description,
          module: formData.module,
          environment: formData.environment,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
          issueType: formData.issueType,
          severity: formData.severity,
          priority: formData.priority,
          reproducibility: formData.reproducibility,
          frequency: formData.frequency,
          stepsToReproduce: formData.stepsToReproduce,
          expectedResult: formData.expectedResult,
          actualResult: formData.actualResult,
          qaComments: formData.qaComments,
          developerNotes: formData.developerNotes,
          testCycle: formData.testCycle
        }, currentUser.id, currentUser.name);
        showToast({ type: 'info', title: 'Defect Updated', message: 'Defect updated successfully' });
        onClose();
        return;
      }

      let attachmentUrls: any[] = [];
      if (attachments.length > 0) {
        setUploadStatus(`Uploading ${attachments.length} file(s)...`);

        for (let i = 0; i < attachments.length; i++) {
          const file = attachments[i];
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          setUploadStatus(`Uploading ${file.name} (${i + 1}/${attachments.length})...`);
          setUploadProgress(Math.round(((i) / attachments.length) * 100));

          const fileRef = ref(storage, `defects/${Date.now()}_${safeName}`);
          await uploadBytes(fileRef, file);
          const downloadURL = await getDownloadURL(fileRef);

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

        setUploadProgress(100);
      }

      setUploadStatus('Creating defect...');
      const created = await addDefect({
        ...formData,
        reportedBy: currentUser.id,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        status: 'open',
        attachments: attachmentUrls
      });

      if (created) {
        const repo = repositories.find(r => r.appId === created.applicationId && (r.connectionStatus === 'connected' || r.integrationStatus === 'synced'));
        if (repo) {
          setUploadStatus('Creating GitHub issue...');
          try {
            const res = await fetch('/api/github/issues', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                owner: repo.owner,
                repo: repo.name,
                action: 'create',
                title: created.title,
                description: `Reported via Simpli for ${created.defectCode}.\n\n${formData.description || ''}`,
                labels: [created.severity, created.issueType].filter(Boolean)
              })
            });
            const data = await res.json();
            if (res.ok && data.issueNumber) {
              await updateWorkGithub('defect', created.id, {
                repositoryId: `${repo.owner}/${repo.name}`,
                issue: { issueNumber: data.issueNumber, url: data.url, state: 'open', title: data.title },
                status: 'not_started'
              });
            }
          } catch (e) {
            // Issue creation is best-effort; the defect still exists locally.
            console.warn('GitHub issue creation failed', e);
          }
        }
      }

      showToast({ type: 'success', title: 'Defect Created', message: `${formData.defectCode || formData.title} has been reported.` });
      onClose();
    } catch (error: any) {
      console.error('Error creating defect:', error);
      showToast({ type: 'error', title: 'Failed to Create Defect', message: error?.message || 'An unexpected error occurred.' });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
      setUploadStatus('');
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
      <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(34,197,94,0.1)] sticky top-0 bg-[#0F172A] z-10">
          <h2 className="text-xl font-bold text-[#F8FAFC]">Report New Defect</h2>
          <button onClick={onClose} className="p-2 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Application</label>
              <select
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              >
                {apps.map(app => (
                  <option key={app.id} value={app.id}>{app.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Module</label>
              <input
                type="text"
                value={formData.module}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
                placeholder="e.g. Authentication, Payments"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Issue Type</label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value as DefectIssueType })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
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
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as DefectSeverity })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              >
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as DefectPriority })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Reproducibility</label>
              <select
                value={formData.reproducibility}
                onChange={(e) => setFormData({ ...formData, reproducibility: e.target.value as DefectReproducibility })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              >
                <option value="always">Always</option>
                <option value="sometimes">Sometimes</option>
                <option value="rare">Rare</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as DefectFrequency })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              >
                <option value="100">100%</option>
                <option value="intermittent">Intermittent</option>
                <option value="one_time">One-time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Assign To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              >
                <option value="">Select developer</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] h-20 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Steps to Reproduce</label>
              <textarea
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] h-20 resize-none"
                placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Expected Result</label>
              <textarea
                value={formData.expectedResult}
                onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] h-20 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Actual Result</label>
              <textarea
                value={formData.actualResult}
                onChange={(e) => setFormData({ ...formData, actualResult: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] h-20 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">QA Comments</label>
              <textarea
                value={formData.qaComments}
                onChange={(e) => setFormData({ ...formData, qaComments: e.target.value })}
                className="w-full px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] h-16 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Attachments</label>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] cursor-pointer hover:bg-[rgba(34,197,94,0.05)]">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Files</span>
                  <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                </label>
                {attachments.length > 0 && (
                  <span className="text-sm text-[#94A3B8]">{attachments.length} file(s) selected</span>
                )}
              </div>
              {attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[#22C55E]" />
                        <span className="text-sm text-[#F8FAFC]">{file.name}</span>
                        <span className="text-xs text-[#94A3B8]">({formatFileSize(file.size)})</span>
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

          <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(34,197,94,0.1)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E293B] text-[#F8FAFC] border border-[rgba(34,197,94,0.1)] hover:bg-[rgba(255,255,255,0.05)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.title}
              className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader className="w-4 h-4 animate-spin" /> {uploadStatus || (isEditing ? 'Updating...' : 'Creating...')}</>
              ) : (isEditing ? 'Update Defect' : 'Create Defect')}
            </button>
          </div>
          {submitting && uploadProgress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#22C55E] rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">{uploadProgress}% complete</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
