import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GitBranch, GitPullRequest, GitCommit, CheckCircle, XCircle, RefreshCw, ExternalLink, Github } from 'lucide-react';
import { Repository, GithubSubDoc } from '../types';

type GitHubPanelProps = {
  workKind: 'task' | 'defect';
  workId: string;
  github?: GithubSubDoc;
};

const STATUS_ORDER: GithubSubDoc['status'][] = ['not_started', 'branch_created', 'commits_pushed', 'pr_open', 'review', 'qa', 'approved', 'merged', 'closed'];
const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-[#1E293B] border-[rgba(34,197,94,0.15)] text-[#94A3B8]',
  branch_created: 'bg-[#8b5cf6] text-white',
  commits_pushed: 'bg-[#3b82f6] text-white',
  pr_open: 'bg-[#10b981] text-white',
  review: 'bg-[#f59e0b] text-[#020617]',
  qa: 'bg-[#8b5cf6] text-white',
  approved: 'bg-[#22C55E] text-[#020617]',
  merged: 'bg-[#10b981] text-white',
  closed: 'bg-[#1E293B] text-[#94A3B8]'
};

export function GitHubPanel({ workKind, workId, github }: GitHubPanelProps) {
  const { repositories, getRepositoriesForApp, updateWorkGithub } = useApp();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [repoId, setRepoId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Scope repos by the app the work belongs to; fall back to all configured repos.
  const allRepos = repositories.filter(r => r.connectionStatus === 'connected' || r.integrationStatus === 'synced');
  const appRepos = allRepos.length ? allRepos : repositories;

  const canDev = hasPermission('develop_work') || hasPermission('manage_repositories') || hasPermission('manage_workflow');

  const currentRepo = github?.repositoryId ? repositories.find(r => r.id === github.repositoryId) : undefined;

  const stageOf = (s: string) => STATUS_ORDER.indexOf(s as GithubSubDoc['status']);

  const handleCreateBranch = async () => {
    if (!currentRepo || !branchName.trim()) return;
    setBusy('branch');
    try {
      const res = await fetch('/api/github/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: currentRepo.owner, repo: currentRepo.name, name: branchName.trim(), baseBranch: currentRepo.defaultBranch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Branch creation failed');
      await updateWorkGithub(workKind, workId, {
        ...(currentRepo ? { repositoryId: currentRepo.id } : {}),
        branchName: branchName.trim(),
        branchUrl: data.url || data.branch?._links?.html,
        status: 'branch_created'
      } as any);
      showToast({ type: 'success', title: 'Branch created', message: `Branch "${branchName}" created.` });
      setBranchName('');
    } catch (e) {
      showToast({ type: 'error', title: 'Branch creation failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  const handleOpenPr = async () => {
    if (!currentRepo || !github?.branchName) return;
    setBusy('pr');
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', owner: currentRepo.owner, repo: currentRepo.name, title: prTitle || `Work ${workId}`, head: github.branchName, base: currentRepo.defaultBranch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PR open failed');
      await updateWorkGithub(workKind, workId, {
        pullRequest: { prNumber: data.prNumber, url: data.url, state: 'open', title: data.title, reviewers: [], reviewState: 'pending', checkStatus: 'pending' },
        status: 'pr_open'
      });
      showToast({ type: 'success', title: 'PR opened', message: `PR #${data.prNumber} opened.` });
    } catch (e) {
      showToast({ type: 'error', title: 'PR open failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    if (!currentRepo || !github?.pullRequest?.prNumber) return;
    setBusy('sync');
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', owner: currentRepo.owner, repo: currentRepo.name, prNumber: github.pullRequest.prNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      const merged = data.state === 'merged';
      await updateWorkGithub(workKind, workId, {
        pullRequest: {
          prNumber: data.prNumber, url: data.url, state: data.state, title: data.title,
          reviewers: data.reviewers || [], reviewState: data.reviewState, checkStatus: data.checkStatus
        },
        ...(merged ? { status: 'merged' } : data.reviewState === 'changes_requested' ? { status: 'review' } : data.state === 'open' ? { status: 'pr_open' } : {})
      });
      showToast({ type: 'success', title: 'Synced', message: `PR #${data.prNumber} state: ${data.state}${data.reviewState ? `, review: ${data.reviewState}` : ''}${data.checkStatus ? `, checks: ${data.checkStatus}` : ''}.` });
    } catch (e) {
      showToast({ type: 'error', title: 'Sync failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  const repoOptions = currentRepo ? [currentRepo, ...appRepos.filter(r => r.id !== currentRepo.id)] : appRepos;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub Integration
        </h3>
        {repoOptions.length === 0 && <span className="text-xs text-[#94A3B8]">No repositories configured</span>}
      </div>

      {repoOptions.length > 0 && (
        <select
          value={currentRepo?.id || repoId}
          onChange={e => {
            setRepoId(e.target.value);
            updateWorkGithub(workKind, workId, { repositoryId: e.target.value } as any);
          }}
          className="w-full bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
        >
          <option value="">Select repository...</option>
          {repoOptions.map(r => (
            <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
          ))}
        </select>
      )}

      {/* Status stepper */}
      {github && (
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {STATUS_ORDER.map((s, i) => {
            const current = stageOf(github.status);
            const reached = i <= current;
            return (
              <React.Fragment key={s}>
                {i > 0 && <div className={`h-0.5 w-4 shrink-0 ${reached ? 'bg-[#22C55E]' : 'bg-[#334155]'}`} />}
                <span
                  className={`shrink-0 px-2 py-0.5 text-[10px] rounded-full border ${STATUS_COLORS[s]} ${reached ? '' : 'opacity-40'}`}
                >
                  {s.replace(/_/g, ' ')}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Branch & PR info */}
      {(currentRepo || github?.repositoryId) && github?.branchName && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3 rounded space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-[#F8FAFC]">
              <GitBranch className="w-4 h-4 text-[#22C55E]" />
              Branch: {github.branchName}
              {github.branchUrl && (
                <a href={github.branchUrl} target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-[#22C55E]">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </span>
          </div>
          {github.commits && github.commits.length > 0 && (
            <div className="space-y-1">
              {github.commits.slice(0, 5).map(c => (
                <div key={c.sha} className="flex items-center gap-2 text-xs text-[#94A3B8]">
                  <GitCommit className="w-3 h-3" />
                  <span className="truncate">{c.message}</span>
                  <span className="text-[#3a3a50]">{c.author}</span>
                </div>
              ))}
            </div>
          )}
          {github.pullRequest && (
            <div className="flex items-center justify-between border-t border-[rgba(34,197,94,0.1)] pt-2 text-sm">
              <span className="flex items-center gap-2 text-[#F8FAFC]">
                <GitPullRequest className="w-4 h-4 text-[#10b981]" />
                PR #{github.pullRequest.prNumber}: {github.pullRequest.title}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded ${
                  github.pullRequest.reviewState === 'approved' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                  : github.pullRequest.reviewState === 'changes_requested' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                  : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                }`}>
                  {github.pullRequest.reviewState || 'pending'}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${
                  github.pullRequest.checkStatus === 'success' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                  : github.pullRequest.checkStatus === 'failure' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                  : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                }`}>
                  {github.pullRequest.checkStatus || 'pending'}
                </span>
                {github.pullRequest.url && (
                  <a href={github.pullRequest.url} target="_blank" rel="noreferrer" className="text-[#22C55E] hover:opacity-80">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {canDev && currentRepo && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3 rounded space-y-2">
          {!github?.branchName && (
            <div className="flex gap-2">
              <input
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="New branch name (e.g. feature/simpl-142)"
                className="flex-1 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
              />
              <button
                onClick={handleCreateBranch}
                disabled={busy === 'branch' || !branchName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] rounded disabled:opacity-50"
              >
                {busy === 'branch' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                Create Branch
              </button>
            </div>
          )}
          {github?.branchName && !github.pullRequest?.prNumber && (
            <div className="flex gap-2">
              <input
                value={prTitle}
                onChange={e => setPrTitle(e.target.value)}
                placeholder="Pull request title"
                className="flex-1 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
              />
              <button
                onClick={handleOpenPr}
                disabled={busy === 'pr'}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#10b981] text-white text-sm font-medium hover:bg-[#059669] rounded disabled:opacity-50"
              >
                {busy === 'pr' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                Open PR
              </button>
            </div>
          )}
          {github?.pullRequest && (
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={busy === 'sync'}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)] rounded disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} />
                Sync PR Status
              </button>
            </div>
          )}
        </div>
      )}

      {!canDev && (
        <p className="text-xs text-[#94A3B8]">You need develop_work or manage_repositories permission to create branches/PRs.</p>
      )}

      <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
        {github?.status === 'approved' && <CheckCircle className="w-3 h-3 text-[#10b981]" />}
        {github?.status === 'closed' && <XCircle className="w-3 h-3 text-[#94A3B8]" />}
        <span className="capitalize">Status: {github?.status?.replace(/_/g, ' ') || 'not_started'}</span>
      </div>
    </div>
  );
}