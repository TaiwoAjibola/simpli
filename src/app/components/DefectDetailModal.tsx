import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Bug,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  User,
  Calendar,
  Paperclip,
  ExternalLink,
  Download,
  Send,
  Activity,
  ChevronDown,
  ChevronRight,
  Mail,
  Upload,
  Folder,
  Loader2,
  Trash2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Defect, DefectStatus, DefectResolution } from '../types';
import { getAllowedDefectStatuses } from '../../utils/defectPermissions';
import { QaWorkPanel } from './QaWorkPanel';
import { DependenciesPanel } from './DependenciesPanel';
import { DevelopmentWorkspace } from './DevelopmentWorkspace';
import { DEFECT_STATUS_COLORS, DEFECT_SEVERITY_COLORS } from '../../utils/colors';
import { GoogleDrivePicker } from './GoogleDrivePicker';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type DefectDetailModalProps = {
  defect: Defect;
  onClose: () => void;
};

export function DefectDetailModal({ defect, onClose }: DefectDetailModalProps) {
  const { employees, apps, defects, tasks, actionPoints, repositories, updateDefect, addDefectComment, sendDefectNotification, updateWorkGithub } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [syncingIssue, setSyncingIssue] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reproduction' | 'attachments' | 'activity' | 'qa' | 'deps' | 'github'>('overview');
  const [commentText, setCommentText] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
  const getAppName = (id: string) => apps.find(a => a.id === id)?.name || 'Unknown';

  const allowedStatuses = getAllowedDefectStatuses(hasPermission);

  const statusColors: Record<DefectStatus, string> = {
    open: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]',
    in_progress: 'bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7]',
    pending_qa: 'bg-[#F7F7F5] text-[#2383E2] border border-[#E9E9E7]',
    resolved: 'bg-[#EDF7ED] text-[#0F7B6C] border border-[#E9E9E7]',
    closed: 'bg-[#F7F7F5] text-[#9B9A97] border border-[#E9E9E7]',
    reopened: 'bg-[#FBE9E9] text-[#EB5757] border border-[#FBE9E9]'
  };

  const severityColors: Record<string, string> = {
    blocker: 'bg-[#FBE9E9] text-[#EB5757] border border-[#FBE9E9]',
    critical: 'bg-[#FBE9E9] text-[#EB5757] border border-[#FBE9E9]',
    major: 'bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7]',
    minor: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]'
  };

  const linkedIssue = defect.github?.issue;
  const linkedRepo = linkedIssue && defect.github?.repositoryId
    ? repositories.find(r => `${r.owner}/${r.name}` === defect.github?.repositoryId || r.id === defect.github?.repositoryId)
    : undefined;

  const syncIssueState = async (newStatus: DefectStatus) => {
    if (!currentUser || !linkedIssue || !linkedRepo) return;
    setSyncingIssue(true);
    try {
      const targetState = newStatus === 'closed' ? 'closed' : newStatus === 'reopened' ? 'open' : 'open';
      const res = await fetch('/api/github/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: linkedRepo.owner,
          repo: linkedRepo.name,
          action: 'set_state',
          issueNumber: linkedIssue.issueNumber,
          state: targetState
        })
      });
      const data = await res.json();
      if (res.ok && data.state) {
        await updateWorkGithub('defect', defect.id, { issue: { ...linkedIssue, state: data.state } });
      }
    } catch (e) {
      console.warn('GitHub issue state sync failed', e);
    } finally {
      setSyncingIssue(false);
    }
  };

  const handleStatusChange = async (newStatus: DefectStatus) => {
    if (!currentUser) return;
    await updateDefect(defect.id, { status: newStatus }, currentUser.id, currentUser.name);
    await syncIssueState(newStatus);
    setEditingField(null);
  };

  const handleVerifyFix = async () => {
    if (!currentUser) return;
    await updateDefect(defect.id, { fixVerified: true, status: 'closed' }, currentUser.id, currentUser.name);
    await syncIssueState('closed');
  };

  const handleReopen = async () => {
    if (!currentUser) return;
    await updateDefect(defect.id, { status: 'reopened' }, currentUser.id, currentUser.name);
    await syncIssueState('reopened');
  };

  const handleSendDefectEmail = async () => {
    setSendingEmail(true);
    await sendDefectNotification(defect.id);
    setSendingEmail(false);
    showToast({ type: 'success', title: 'Email Sent', message: `Notification sent for "${defect.defectCode}"` });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !commentText.trim()) return;
    await addDefectComment(defect.id, currentUser.id, currentUser.name, commentText);
    setCommentText('');
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDriveSelect = async (driveFiles: { id: string; name: string; mimeType: string; webViewLink?: string; size?: string }[]) => {
    if (!currentUser) return;
    const newAttachments = driveFiles.map(df => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${df.id}`,
      name: df.name,
      url: df.webViewLink || `https://drive.google.com/file/d/${df.id}/view`,
      size: df.size ? parseInt(df.size, 10) : 0,
      type: df.mimeType,
      uploadedAt: new Date(),
      uploadedBy: currentUser.id
    }));
    const updated = [...(defect.attachments || []), ...newAttachments];
    await updateDefect(defect.id, { attachments: updated }, currentUser.id, currentUser.name);
    setShowDrivePicker(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUser) return;
    setUploading(true);
    try {
      const uploaded: any[] = [];
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = ref(storage, `defects/${defect.id}/${Date.now()}_${safeName}`);
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        uploaded.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: downloadURL,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          uploadedBy: currentUser.id
        });
      }
      if (uploaded.length > 0) {
        await updateDefect(defect.id, { attachments: [...(defect.attachments || []), ...uploaded] }, currentUser.id, currentUser.name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (attId: string) => {
    if (!currentUser) return;
    const updated = (defect.attachments || []).filter(a => a.id !== attId);
    await updateDefect(defect.id, { attachments: updated }, currentUser.id, currentUser.name);
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] flex items-center justify-center z-50 p-4" style={{ fontFamily: 'Inter, ui-sans-system, sans-serif' }}>
      <div className="bg-white border border-[#E9E9E7] rounded-[8px] w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E9E7] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-[12px] px-2 py-0.5 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[4px] text-[#787774]">{defect.defectCode}</span>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[#37352F] truncate">{defect.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer flex-shrink-0 ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-[#E9E9E7] flex items-center gap-3 flex-wrap bg-white">
          <div className="flex items-center gap-2">
            <span className={`text-[12px] px-2 py-1 rounded-[4px] font-medium capitalize ${statusColors[defect.status]}`}>
              {defect.status.replace('_', ' ')}
            </span>
            <span className={`text-[12px] px-2 py-1 rounded-[4px] font-medium capitalize ${severityColors[defect.severity]}`}>
              {defect.severity}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-[#787774]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-[#9B9A97]" />
              {getEmployeeName(defect.assignedTo)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#9B9A97]" />
              Reported {formatDate(defect.dateReported)}
            </span>
            {defect.dueDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#9B9A97]" />
                Due {formatDate(defect.dueDate)}
              </span>
            )}
            {defect.reopenedCount > 0 && (
              <span className="text-[#EB5757] font-medium">Reopened {defect.reopenedCount}x</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {defect.status === 'pending_qa' && hasPermission('verify_defects') && (
              <button onClick={handleVerifyFix} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer">
                <CheckCircle className="w-4 h-4" />
                Verify Fix
              </button>
            )}
            {defect.status === 'closed' && hasPermission('manage_defects') && (
              <button onClick={handleReopen} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E9E9E7] text-[#37352F] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer">
                Reopen
              </button>
            )}
            <button
              onClick={handleSendDefectEmail}
              disabled={sendingEmail}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium rounded-[6px] border transition-colors duration-150 cursor-pointer ${
                defect.lastEmailSentAt ? 'bg-white border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F7F5]' : 'bg-white border-[#E9E9E7] text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F]'
              } ${sendingEmail ? 'opacity-50 cursor-wait' : ''}`}
            >
              <Mail className="w-3.5 h-3.5 text-[#787774]" />
              {sendingEmail ? 'Sending...' : defect.lastEmailSentAt ? 'Resend Mail' : 'Send Mail'}
            </button>
          </div>
        </div>

        <div className="flex border-b border-[#E9E9E7] px-6 gap-6 overflow-x-auto">
          {(['overview', 'reproduction', 'attachments', 'activity', 'qa', 'deps', 'github'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-1 py-3 text-[14px] font-medium capitalize border-b-2 -mb-px whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                activeTab === tab ? 'text-[#37352F] border-[#2383E2]' : 'text-[#787774] border-transparent hover:text-[#37352F]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Application</label>
                  <p className="text-[14px] text-[#37352F] mt-1">{getAppName(defect.applicationId)}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Module</label>
                  <p className="text-[14px] text-[#37352F] mt-1">{defect.module || '-'}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Environment</label>
                  <p className="text-[14px] text-[#37352F] mt-1 capitalize">{defect.environment}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Issue Type</label>
                  <p className="text-[14px] text-[#37352F] mt-1 capitalize">{defect.issueType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Priority</label>
                  <p className="text-[14px] text-[#37352F] mt-1 capitalize">{defect.priority}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Reproducibility</label>
                  <p className="text-[14px] text-[#37352F] mt-1 capitalize">{defect.reproducibility}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Frequency</label>
                  <p className="text-[14px] text-[#37352F] mt-1 capitalize">{defect.frequency}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Test Cycle</label>
                  <p className="text-[14px] text-[#37352F] mt-1">{defect.testCycle || '-'}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Followers</label>
                  <p className="text-[14px] text-[#37352F] mt-1">{(defect.followers || []).length > 0 ? defect.followers!.map(f => getEmployeeName(f)).join(', ') : '-'}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Reported By</label>
                  <p className="text-[14px] text-[#37352F] mt-1">{getEmployeeName(defect.reportedBy)}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Assigned To</label>
                  <p className="text-[14px] text-[#37352F] mt-1">{getEmployeeName(defect.assignedTo)}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">QA Tester</label>
                  <p className="text-[14px] text-[#37352F] mt-1">{defect.testedBy ? getEmployeeName(defect.testedBy) : '-'}</p>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Resolution</label>
                  <p className="text-[14px] text-[#37352F] mt-1 capitalize">{defect.resolutionStatus?.replace('_', ' ') || '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Description</label>
                <p className="text-[14px] text-[#37352F] mt-2 whitespace-pre-wrap leading-relaxed">{defect.description || 'No description provided'}</p>
              </div>

              {(defect.qaComments || defect.developerNotes) && (
                <div className="grid grid-cols-2 gap-4">
                  {defect.qaComments && (
                    <div className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px]">
                      <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">QA Comments</label>
                      <p className="text-[14px] text-[#37352F] mt-2 whitespace-pre-wrap leading-relaxed">{defect.qaComments}</p>
                    </div>
                  )}
                  {defect.developerNotes && (
                    <div className="p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px]">
                      <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Developer Notes</label>
                      <p className="text-[14px] text-[#37352F] mt-2 whitespace-pre-wrap leading-relaxed">{defect.developerNotes}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium mb-2 block">Change Status</label>
                <div className="flex flex-wrap gap-2">
                  {allowedStatuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={defect.status === status}
                      className={`px-3 py-1.5 text-[14px] font-medium rounded-[6px] border transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        defect.status === status ? 'bg-[#E9E9E7] text-[#37352F] border-[#E9E9E7]' : 'bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#F7F7F5] hover:text-[#37352F]'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium mb-2 block">GitHub Issue</label>
                {linkedIssue ? (
                  <div className="flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-[8px]">
                    <span className={`text-[12px] px-2 py-1 rounded-[4px] font-medium border ${linkedIssue.state === 'closed' ? 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]' : 'bg-[#EDF7ED] text-[#0F7B6C] border-[#E9E9E7]'}`}>
                      {linkedIssue.state}
                    </span>
                    <span className="text-[14px] text-[#787774] font-mono">#{linkedIssue.issueNumber}</span>
                    <span className="text-[14px] text-[#37352F] flex-1 truncate">{linkedIssue.title}</span>
                    {linkedRepo && (
                      <a href={linkedIssue.url} target="_blank" rel="noreferrer" className="text-[#2383E2] hover:text-[#1A6FC0] transition-colors duration-150">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {hasPermission('manage_defects') && (
                      <button
                        onClick={() => syncIssueState(defect.status === 'closed' ? 'reopened' : 'closed')}
                        disabled={syncingIssue}
                        className="text-[14px] px-3 py-1.5 bg-white border border-[#E9E9E7] rounded-[6px] text-[#787774] hover:bg-[#F7F7F5] hover:text-[#37352F] disabled:opacity-50 transition-colors duration-150 cursor-pointer"
                      >
                        {syncingIssue ? 'Syncing...' : linkedIssue.state === 'closed' ? 'Reopen issue' : 'Close issue'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[14px] text-[#787774]">No GitHub issue linked. Create the defect with a linked repository to sync an issue.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reproduction' && (
            <div className="space-y-6">
              <div>
                <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Steps to Reproduce</label>
                <div className="mt-2 p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] whitespace-pre-wrap text-[14px] text-[#37352F] leading-relaxed">
                  {defect.stepsToReproduce || 'No steps provided'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Expected Result</label>
                  <div className="mt-2 p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] whitespace-pre-wrap text-[14px] text-[#37352F] leading-relaxed">
                    {defect.expectedResult || 'Not specified'}
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-[#787774] uppercase tracking-wide font-medium">Actual Result</label>
                  <div className="mt-2 p-4 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[8px] whitespace-pre-wrap text-[14px] text-[#37352F] leading-relaxed">
                    {defect.actualResult || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <label className="flex items-center gap-2 px-3 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
                <button
                  onClick={() => setShowDrivePicker(!showDrivePicker)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] text-[#37352F] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-[#787774]" />
                  {showDrivePicker ? 'Close Drive' : 'Import from Drive'}
                </button>
              </div>
              {showDrivePicker && (
                <div className="mb-4">
                  <GoogleDrivePicker onSelect={handleDriveSelect} onClose={() => setShowDrivePicker(false)} />
                </div>
              )}
              {(!defect.attachments || defect.attachments.length === 0) ? (
                <div className="text-center py-12 bg-white border border-dashed border-[#E9E9E7] rounded-[8px]">
                  <Paperclip className="w-10 h-10 mx-auto mb-3 text-[#9B9A97]" />
                  <p className="text-[14px] text-[#787774]">No attachments</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {defect.attachments.map((att: any) => (
                    <div key={att.id} className="p-4 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-[#787774]" />
                        <span className="text-[14px] text-[#37352F] truncate font-medium">{att.name}</span>
                      </div>
                      <p className="text-[12px] text-[#9B9A97] mb-3">{formatFileSize(att.size)}</p>
                      <div className="flex gap-3">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] text-[#2383E2] hover:text-[#1A6FC0] transition-colors duration-150">
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                        <a href={att.url} download className="flex items-center gap-1 text-[12px] text-[#787774] hover:text-[#37352F] transition-colors duration-150">
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                        <button onClick={() => handleRemoveAttachment(att.id)} className="flex items-center gap-1 text-[12px] text-[#787774] hover:text-[#EB5757] transition-colors duration-150 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {(defect.activityLogs || []).slice().reverse().map((log: any) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-1 w-6 h-6 flex items-center justify-center">
                      {log.action === 'comment' ? <MessageSquare className="w-4 h-4 text-[#787774]" /> : <Activity className="w-4 h-4 text-[#9B9A97]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[#37352F]">{log.userName}</span>
                        <span className="text-[12px] text-[#9B9A97]">
                          {log.timestamp?.toLocaleDateString?.('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || ''}
                        </span>
                      </div>
                      {log.action === 'comment' ? (
                        <p className="text-[14px] text-[#37352F] mt-1 whitespace-pre-wrap leading-relaxed">{log.details}</p>
                      ) : (
                        <p className="text-[14px] text-[#787774] mt-1">{log.details || log.action}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="pt-4 border-t border-[#E9E9E7]">
                <label className="block text-[14px] font-medium text-[#37352F] mb-2">Add Comment</label>
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[14px] text-[#37352F] placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:outline-none focus:ring-1 focus:ring-[#2383E2] h-20 resize-none"
                    placeholder="Add a comment..."
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="self-end p-2.5 bg-[#2383E2] text-white rounded-[6px] hover:bg-[#1A6FC0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'qa' && (
            <QaWorkPanel workKind="defect" workId={defect.id} qualifies={['pending_qa', 'resolved', 'open', 'in_progress'].includes(defect.status)} />
          )}

          {activeTab === 'deps' && (
            <DependenciesPanel
              workKind="defect"
              workId={defect.id}
              workRefs={[
                ...defects.map(d => ({ kind: 'defect' as const, id: d.id, label: `${d.defectCode} - ${d.title}` })),
                ...tasks.map(t => ({ kind: 'task' as const, id: t.id, label: t.name })),
                ...actionPoints.map(a => ({ kind: 'action_point' as const, id: a.id, label: a.text }))
              ]}
            />
          )}

          {activeTab === 'github' && (
            <DevelopmentWorkspace workKind="defect" workId={defect.id} github={defect.github} />
          )}
        </div>
      </div>
    </div>
  );
}
