import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { X, Upload, Paperclip, Loader, Folder } from 'lucide-react';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DefectIssueType, DefectSeverity, DefectPriority, DefectReproducibility, DefectFrequency, Defect } from '../types';
import { GoogleDrivePicker } from './GoogleDrivePicker';

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
  const [driveAttachments, setDriveAttachments] = useState<any[]>([]);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const centralFileRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const uploadCentral = async (file: File, appId: string, appName: string): Promise<string> => {
    const contentBase64 = await fileToBase64(file);
    const res = await fetch('/api/drive?action=upload-central', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appName, fileName: file.name, mimeType: file.type || 'application/octet-stream', contentBase64 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Central upload failed');
    return data.file?.webViewLink || data.webViewLink || `https://drive.google.com/file/d/${data.file?.id}/view`;
  };

  const handleDriveSelect = (driveFiles: { id: string; name: string; mimeType: string; webViewLink?: string; size?: string }[]) => {
    if (!currentUser) return;
    const newAtts = driveFiles.map(df => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${df.id}`,
      name: df.name,
      url: df.webViewLink || `https://drive.google.com/file/d/${df.id}/view`,
      size: df.size ? parseInt(df.size, 10) : 0,
      type: df.mimeType,
      uploadedAt: new Date(),
      uploadedBy: currentUser.id
    }));
    setDriveAttachments(prev => [...prev, ...newAtts]);
    setShowDrivePicker(false);
  };

  const removeDriveAttachment = (index: number) => {
    setDriveAttachments(prev => prev.filter((_, i) => i !== index));
  };

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
        const appName = apps.find(a => a.id === formData.applicationId)?.name || formData.applicationId;
        for (let i = 0; i < attachments.length; i++) {
          const file = attachments[i];
          setUploadStatus(`Uploading ${file.name} (${i + 1}/${attachments.length})...`);
          setUploadProgress(Math.round(((i) / attachments.length) * 100));
          let driveUrl: string | null = null;
          try {
            if (formData.applicationId) driveUrl = await uploadCentral(file, formData.applicationId, appName);
          } catch (centralErr: any) {
            const msg = centralErr?.message || '';
            if (msg.includes('Central Drive not configured')) {
              showToast({ type: 'error', title: 'Central Drive not configured', message: 'Use Import from my Drive or configure GOOGLE_DRIVE_REFRESH_TOKEN.' });
            }
          }
          if (driveUrl) {
            attachmentUrls.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              url: driveUrl,
              size: file.size,
              type: file.type,
              uploadedAt: new Date(),
              uploadedBy: currentUser.id
            });
          } else {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
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
        }
        setUploadProgress(100);
      }

      const allAttachments = [...attachmentUrls, ...driveAttachments];
      setUploadStatus('Creating defect...');
      const created = await addDefect({
        ...formData,
        reportedBy: currentUser.id,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        status: 'open',
        attachments: allAttachments
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
            console.warn('GitHub issue creation failed', e);
          }
        }
      }

      showToast({ type: 'success', title: 'Defect Created', message: `${formData.title} has been reported.` });
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
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] flex items-center justify-center z-50 p-4" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="bg-white border border-[#E9E9E7] rounded-[8px] w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E9E7] flex-shrink-0">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#37352F]">{isEditing ? 'Edit Defect' : 'Report New Defect'}</h2>
          <button onClick={onClose} className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                placeholder="Brief summary of the defect"
                required
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Application</label>
              <select
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                {apps.map(app => (
                  <option key={app.id} value={app.id}>{app.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Module</label>
              <input
                type="text"
                value={formData.module}
                onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
                placeholder="e.g. Authentication, Payments"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Issue Type</label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData({ ...formData, issueType: e.target.value as DefectIssueType })}
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
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Severity *</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as DefectSeverity })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as DefectPriority })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Reproducibility</label>
              <select
                value={formData.reproducibility}
                onChange={(e) => setFormData({ ...formData, reproducibility: e.target.value as DefectReproducibility })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="always">Always</option>
                <option value="sometimes">Sometimes</option>
                <option value="rare">Rare</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as DefectFrequency })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="100">100%</option>
                <option value="intermittent">Intermittent</option>
                <option value="one_time">One-time</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Assign To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="">Select developer</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] h-20 resize-none"
                placeholder="Detailed description"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Steps to Reproduce</label>
              <textarea
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] h-20 resize-none"
                placeholder={"1. Go to...\n2. Click on...\n3. Observe..."}
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Expected Result</label>
              <textarea
                value={formData.expectedResult}
                onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] h-20 resize-none"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Actual Result</label>
              <textarea
                value={formData.actualResult}
                onChange={(e) => setFormData({ ...formData, actualResult: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] h-20 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">QA Comments</label>
              <textarea
                value={formData.qaComments}
                onChange={(e) => setFormData({ ...formData, qaComments: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] h-16 resize-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Attachments</label>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer border border-[#2383E2]">
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                  <input ref={centralFileRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                </label>
                <button
                  type="button"
                  onClick={() => setShowDrivePicker(!showDrivePicker)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] text-[#37352F] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-[#787774]" />
                  {showDrivePicker ? 'Close Drive' : 'Import from my Drive'}
                </button>
                {attachments.length > 0 && (
                  <span className="text-[14px] text-[#787774]">{attachments.length} file(s) selected</span>
                )}
                {driveAttachments.length > 0 && (
                  <span className="text-[14px] text-[#787774]">{driveAttachments.length} from Drive</span>
                )}
              </div>
              {showDrivePicker && (
                <div className="mb-3">
                  <GoogleDrivePicker onSelect={handleDriveSelect} onClose={() => setShowDrivePicker(false)} />
                </div>
              )}
              {attachments.length > 0 && (
                <div className="space-y-2 mb-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-[#787774] flex-shrink-0" />
                        <span className="text-[14px] text-[#37352F] truncate">{file.name}</span>
                        <span className="text-[12px] text-[#9B9A97]">({formatFileSize(file.size)})</span>
                      </div>
                      <button type="button" onClick={() => removeAttachment(idx)} className="p-1 text-[#787774] hover:text-[#EB5757] hover:bg-white rounded-[6px] transition-colors duration-150 cursor-pointer ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {driveAttachments.length > 0 && (
                <div className="space-y-2">
                  {driveAttachments.map((att, idx) => (
                    <div key={att.id} className="flex items-center justify-between p-3 bg-white border border-[#E9E9E7] rounded-[8px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Folder className="w-4 h-4 text-[#787774] flex-shrink-0" />
                        <span className="text-[14px] text-[#37352F] truncate">{att.name}</span>
                        <span className="text-[12px] text-[#9B9A97]">({formatFileSize(att.size || 0)})</span>
                      </div>
                      <button type="button" onClick={() => removeDriveAttachment(idx)} className="p-1 text-[#787774] hover:text-[#EB5757] hover:bg-white rounded-[6px] transition-colors duration-150 cursor-pointer ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E9E9E7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] rounded-[6px] text-[14px] font-medium hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.title}
              className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium rounded-[6px] text-[14px] hover:bg-[#1A6FC0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> {uploadStatus || (isEditing ? 'Updating...' : 'Creating...')}
                </>
              ) : isEditing ? 'Update Defect' : 'Create Defect'}
            </button>
          </div>
          {submitting && uploadProgress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-full overflow-hidden">
                <div className="h-full bg-[#2383E2] rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-[12px] text-[#787774] mt-1">{uploadProgress}% complete</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
