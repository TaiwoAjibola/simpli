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
  Mail
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Defect, DefectStatus, DefectResolution } from '../types';
import { getAllowedDefectStatuses } from '../../utils/defectPermissions';
import { QaWorkPanel } from './QaWorkPanel';
import { DependenciesPanel } from './DependenciesPanel';
import { GitHubPanel } from './GitHubPanel';

type DefectDetailModalProps = {
  defect: Defect;
  onClose: () => void;
};

export function DefectDetailModal({ defect, onClose }: DefectDetailModalProps) {
  const { employees, apps, defects, tasks, actionPoints, updateDefect, addDefectComment, sendDefectNotification } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reproduction' | 'attachments' | 'activity' | 'qa' | 'deps' | 'github'>('overview');
  const [commentText, setCommentText] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
  const getAppName = (id: string) => apps.find(a => a.id === id)?.name || 'Unknown';

  const allowedStatuses = getAllowedDefectStatuses(hasPermission);

  const statusColors: Record<DefectStatus, string> = {
    open: 'bg-[#dc2626]',
    in_progress: 'bg-[#f97316]',
    pending_qa: 'bg-[#8b5cf6]',
    resolved: 'bg-[#3b82f6]',
    closed: 'bg-[#10b981]',
    reopened: 'bg-[#7f1d1d]'
  };

  const severityColors: Record<string, string> = {
    blocker: 'bg-[#991b1b]',
    critical: 'bg-[#dc2626]',
    major: 'bg-[#f59e0b]',
    minor: 'bg-[#eab308]'
  };

  const handleStatusChange = async (newStatus: DefectStatus) => {
    if (!currentUser) return;
    await updateDefect(defect.id, { status: newStatus }, currentUser.id, currentUser.name);
    setEditingField(null);
  };

  const handleVerifyFix = async () => {
    if (!currentUser) return;
    await updateDefect(defect.id, { fixVerified: true, status: 'closed' }, currentUser.id, currentUser.name);
  };

  const handleReopen = async () => {
    if (!currentUser) return;
    await updateDefect(defect.id, { status: 'reopened' }, currentUser.id, currentUser.name);
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[rgba(34,197,94,0.1)] sticky top-0 bg-[#0F172A] z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-[#22C55E]">{defect.defectCode}</span>
            <h2 className="text-xl font-bold text-[#F8FAFC]">{defect.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[rgba(34,197,94,0.1)] flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 ${statusColors[defect.status]} text-white`}>
              {defect.status.replace('_', ' ')}
            </span>
            <span className={`text-xs px-2 py-1 ${severityColors[defect.severity]} text-white`}>
              {defect.severity}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {getEmployeeName(defect.assignedTo)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Reported {formatDate(defect.dateReported)}
            </span>
            {defect.dueDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due {formatDate(defect.dueDate)}
              </span>
            )}
            {defect.reopenedCount > 0 && (
              <span className="text-[#ef4444]">Reopened {defect.reopenedCount}x</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {defect.status === 'pending_qa' && hasPermission('verify_defects') && (
              <button
                onClick={handleVerifyFix}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#10b981] text-white text-sm hover:bg-[#059669]"
              >
                <CheckCircle className="w-4 h-4" />
                Verify Fix
              </button>
            )}
            {defect.status === 'closed' && hasPermission('manage_defects') && (
              <button
                onClick={handleReopen}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#dc2626] text-white text-sm hover:bg-[#b91c1c]"
              >
                Reopen
              </button>
            )}
            <button
              onClick={handleSendDefectEmail}
              disabled={sendingEmail}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                defect.lastEmailSentAt
                  ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)]'
                  : 'bg-[rgba(16,185,129,0.1)] text-[#10b981] hover:bg-[rgba(16,185,129,0.2)]'
              } ${sendingEmail ? 'opacity-50 cursor-wait' : ''}`}
            >
              <Mail className="w-3.5 h-3.5" />
              {sendingEmail ? 'Sending...' : defect.lastEmailSentAt ? 'Resend Mail' : 'Send Mail'}
            </button>
          </div>
        </div>

        <div className="flex border-b border-[rgba(34,197,94,0.1)]">
          {(['overview', 'reproduction', 'attachments', 'activity', 'qa', 'deps', 'github'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'text-[#22C55E] border-b-2 border-[#22C55E]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Application</label>
                  <p className="text-[#F8FAFC] mt-1">{getAppName(defect.applicationId)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Module</label>
                  <p className="text-[#F8FAFC] mt-1">{defect.module || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Environment</label>
                  <p className="text-[#F8FAFC] mt-1 capitalize">{defect.environment}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Issue Type</label>
                  <p className="text-[#F8FAFC] mt-1 capitalize">{defect.issueType.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Priority</label>
                  <p className="text-[#F8FAFC] mt-1 capitalize">{defect.priority}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Reproducibility</label>
                  <p className="text-[#F8FAFC] mt-1 capitalize">{defect.reproducibility}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Frequency</label>
                  <p className="text-[#F8FAFC] mt-1 capitalize">{defect.frequency}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Test Cycle</label>
                  <p className="text-[#F8FAFC] mt-1">{defect.testCycle || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Followers</label>
                  <p className="text-[#F8FAFC] mt-1">
                    {(defect.followers || []).length > 0
                      ? defect.followers!.map(f => getEmployeeName(f)).join(', ')
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Reported By</label>
                  <p className="text-[#F8FAFC] mt-1">{getEmployeeName(defect.reportedBy)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Assigned To</label>
                  <p className="text-[#F8FAFC] mt-1">{getEmployeeName(defect.assignedTo)}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">QA Tester</label>
                  <p className="text-[#F8FAFC] mt-1">{defect.testedBy ? getEmployeeName(defect.testedBy) : '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Resolution</label>
                  <p className="text-[#F8FAFC] mt-1 capitalize">{defect.resolutionStatus?.replace('_', ' ') || '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Description</label>
                <p className="text-[#F8FAFC] mt-2 whitespace-pre-wrap">{defect.description || 'No description provided'}</p>
              </div>

              {(defect.qaComments || defect.developerNotes) && (
                <div className="grid grid-cols-2 gap-4">
                  {defect.qaComments && (
                    <div>
                      <label className="text-xs text-[#94A3B8] uppercase tracking-wider">QA Comments</label>
                      <p className="text-[#F8FAFC] mt-2 whitespace-pre-wrap">{defect.qaComments}</p>
                    </div>
                  )}
                  {defect.developerNotes && (
                    <div>
                      <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Developer Notes</label>
                      <p className="text-[#F8FAFC] mt-2 whitespace-pre-wrap">{defect.developerNotes}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2 block">Change Status</label>
                <div className="flex flex-wrap gap-2">
                  {allowedStatuses.map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={defect.status === status}
                      className={`px-3 py-1.5 text-sm ${statusColors[status]} text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reproduction' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Steps to Reproduce</label>
                <div className="mt-2 p-4 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] whitespace-pre-wrap text-[#F8FAFC]">
                  {defect.stepsToReproduce || 'No steps provided'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Expected Result</label>
                  <div className="mt-2 p-4 bg-[#1E293B] border border-[rgba(16,185,129,0.1)] whitespace-pre-wrap text-[#F8FAFC]">
                    {defect.expectedResult || 'Not specified'}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#94A3B8] uppercase tracking-wider">Actual Result</label>
                  <div className="mt-2 p-4 bg-[#1E293B] border border-[rgba(220,38,38,0.1)] whitespace-pre-wrap text-[#F8FAFC]">
                    {defect.actualResult || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div>
              {(!defect.attachments || defect.attachments.length === 0) ? (
                <div className="text-center py-8 text-[#94A3B8]">
                  <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No attachments</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {defect.attachments.map((att: any) => (
                    <div key={att.id} className="p-4 bg-[#1E293B] border border-[rgba(34,197,94,0.1)]">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-[#22C55E]" />
                        <span className="text-sm text-[#F8FAFC] truncate">{att.name}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mb-3">{formatFileSize(att.size)}</p>
                      <div className="flex gap-2">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#22C55E] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                        <a
                          href={att.url}
                          download
                          className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
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
                    <div className="flex-shrink-0 mt-1">
                      {log.action === 'comment' ? (
                        <MessageSquare className="w-4 h-4 text-[#22C55E]" />
                      ) : (
                        <Activity className="w-4 h-4 text-[#94A3B8]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#F8FAFC]">{log.userName}</span>
                        <span className="text-xs text-[#94A3B8]">
                          {log.timestamp?.toLocaleDateString?.('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || ''}
                        </span>
                      </div>
                      {log.action === 'comment' ? (
                        <p className="text-sm text-[#F8FAFC] mt-1 whitespace-pre-wrap">{log.details}</p>
                      ) : (
                        <p className="text-sm text-[#94A3B8] mt-1">{log.details || log.action}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="pt-4 border-t border-[rgba(34,197,94,0.1)]">
                <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Add Comment</label>
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] h-20 resize-none"
                    placeholder="Add a comment..."
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="self-end px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'qa' && (
            <QaWorkPanel
              workKind="defect"
              workId={defect.id}
              qualifies={['pending_qa', 'resolved', 'open', 'in_progress'].includes(defect.status)}
            />
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
            <GitHubPanel workKind="defect" workId={defect.id} github={defect.github} />
          )}
        </div>
      </div>
    </div>
  );
}
