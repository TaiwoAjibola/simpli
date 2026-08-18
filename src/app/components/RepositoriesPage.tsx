import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GitBranch, GitPullRequest, Layers, Plus, RefreshCw, Trash2, ExternalLink, Github, HelpCircle, FolderKanban } from 'lucide-react';
import { Repository } from '../types';
import { parseGithubUrl } from '../../utils/githubApiLogic';
import { RepositoryBrowser } from './RepositoryBrowser';

export function RepositoriesPage() {
  const { repositories, apps, addRepository, updateRepository, deleteRepository, tasks } = useApp();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission('manage_repositories') || hasPermission('view_all_apps');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ appId: '', repoUrl: '', defaultBranch: 'main' });
  const [busy, setBusy] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState<{ repo: Repository; branch?: string } | null>(null);

  const parsed = parseGithubUrl(form.repoUrl);
  const urlFromRepo = parsed?.url || form.repoUrl.trim();

  const handleAdd = async () => {
    if (!form.appId) {
      showToast({ type: 'error', title: 'Missing app', message: 'Choose the application this repository belongs to.' });
      return;
    }
    if (!parsed) {
      showToast({
        type: 'error',
        title: 'Invalid GitHub URL',
        message: 'Paste the full repo URL, e.g. https://github.com/owner/name or git@github.com:owner/name.git'
      });
      return;
    }
    const repoId = await addRepository({
      appId: form.appId,
      provider: 'github',
      owner: parsed.owner,
      name: parsed.name,
      url: urlFromRepo,
      defaultBranch: form.defaultBranch || 'main',
      connectionStatus: 'not_connected',
      integrationStatus: 'configured'
    });
    setForm({ appId: '', repoUrl: '', defaultBranch: 'main' });
    setShowForm(false);
    showToast({ type: 'success', title: 'Repository added', message: 'Repo saved. Syncing now...' });
    await handleSync({
      id: repoId,
      appId: form.appId,
      provider: 'github',
      owner: parsed.owner,
      name: parsed.name,
      url: urlFromRepo,
      defaultBranch: form.defaultBranch || 'main',
      connectionStatus: 'not_connected',
      integrationStatus: 'configured',
      createdAt: new Date()
    });
  };

  const handleSync = async (repo: Repository) => {
    setBusy(repo.id);
    try {
      const [commitsRes, branchesRes] = await Promise.all([
        fetch(`/api/github/commits?owner=${repo.owner}&repo=${repo.name}&branch=${repo.defaultBranch}&per_page=10`),
        fetch(`/api/github/branches?owner=${repo.owner}&repo=${repo.name}`)
      ]);
      const commitsData = await commitsRes.json();
      const branchesData = await branchesRes.json();
      if (!commitsRes.ok) throw new Error(commitsData.error || `Sync failed (${commitsRes.status})`);
      if (!branchesRes.ok) throw new Error(branchesData.error || `Sync failed (${branchesRes.status})`);
      const commits = (commitsData.commits || []).map((c: any) => ({
        sha: c.sha,
        message: c.message,
        author: c.author,
        date: c.date,
        url: c.url
      }));
      const branches = (branchesData.branches || []).map((b: any) => b.name);
      await updateRepository(repo.id, {
        connectionStatus: 'connected',
        lastSyncedAt: new Date(),
        integrationStatus: 'synced',
        branches,
        commits
      });
      showToast({ type: 'success', title: 'Sync complete', message: `Fetched ${commits.length} commits and ${branches.length} branches from ${repo.owner}/${repo.name}.` });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      showToast({
        type: 'error',
        title: 'Could not sync',
        message: `${repo.owner}/${repo.name} saved, but GitHub could not be reached. ${errMsg}`
      });
    } finally {
      setBusy(null);
    }
  };

  const linkedTasks = (repo: Repository) => tasks.filter(t => t.github?.repositoryId === `${repo.owner}/${repo.name}`);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#22C55E]" />
            Repositories
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">GitHub repositories linked to Simpli applications.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a]"
          >
            <Plus className="w-4 h-4" />
            Add Repository
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-5 rounded-lg mb-6 space-y-4">
          <div>
            <h3 className="font-semibold text-[#F8FAFC] mb-1">Link a GitHub repository</h3>
            <p className="text-xs text-[#94A3B8]">
              Connect an existing GitHub repository to an application so Simpli can track branches, commits, pull requests, and reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Application</label>
              <select
                value={form.appId}
                onChange={e => setForm({ ...form, appId: e.target.value })}
                className="w-full px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded"
              >
                <option value="">Select application...</option>
                {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <p className="text-xs text-[#94A3B8] mt-1">Which application does this repo belong to? Work items from this app will link to it.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Git Repository URL</label>
              <input
                value={form.repoUrl}
                onChange={e => setForm({ ...form, repoUrl: e.target.value })}
                placeholder="https://github.com/owner/name"
                className="w-full px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded font-mono"
              />
              <p className="text-xs text-[#94A3B8] mt-1 flex items-start gap-1">
                <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Paste the full repo URL — e.g. <span className="font-mono">https://github.com/acme/webapp</span>,{' '}
                <span className="font-mono">git@github.com:acme/webapp.git</span>, or just <span className="font-mono">acme/webapp</span>.
                The owner and repo name are read from the URL for you.
              </p>
              {parsed && (
                <div className="mt-2 px-3 py-2 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded text-sm flex items-center gap-2">
                  <Github className="w-4 h-4 text-[#22C55E]" />
                  <span className="text-[#F8FAFC]">Owner: <span className="font-mono text-[#22C55E]">{parsed.owner}</span></span>
                  <span className="text-[#94A3B8]">/</span>
                  <span className="text-[#F8FAFC]">Repo: <span className="font-mono text-[#22C55E]">{parsed.name}</span></span>
                </div>
              )}
              {form.repoUrl && !parsed && (
                <div className="mt-2 px-3 py-2 bg-[rgba(255,59,92,0.08)] border border-[rgba(255,59,92,0.2)] rounded text-sm text-[#ff3b5c]">
                  Couldn't parse that URL. Use a format like <span className="font-mono">https://github.com/owner/name</span>.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F8FAFC] mb-2">Default branch</label>
              <input
                value={form.defaultBranch}
                onChange={e => setForm({ ...form, defaultBranch: e.target.value })}
                placeholder="main"
                className="w-full px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm rounded font-mono"
              />
              <p className="text-xs text-[#94A3B8] mt-1">The branch Simpli treats as the default (usually <span className="font-mono">main</span>). Commits and PRs are based on it.</p>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={!form.appId || !parsed}
            className="px-4 py-2 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] rounded disabled:opacity-50"
          >
            Add Repository
          </button>
        </div>
      )}

      {browsing && (
        <RepositoryBrowser
          repo={browsing.repo}
          initialBranch={browsing.branch}
          onBack={() => setBrowsing(null)}
        />
      )}

      <div className="space-y-4">
        {!browsing && repositories.length === 0 && (
          <p className="text-sm text-[#94A3B8]">No repositories yet. Add one to enable GitHub integration.</p>
        )}
        {repositories.map(repo => {
          const appName = apps.find(a => a.id === repo.appId)?.name || 'Unknown app';
          const linked = linkedTasks(repo);
          return (
            <div key={repo.id} className={`bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-5 rounded-lg ${browsing ? 'hidden' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#020617] border border-[rgba(34,197,94,0.1)] rounded flex items-center justify-center">
                    <Github className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#F8FAFC]">{repo.owner}/{repo.name}</h3>
                      <span className="text-xs text-[#94A3B8] font-mono truncate max-w-[220px]">{repo.url}</span>
                      <a
                        href={repo.url || `https://github.com/${repo.owner}/${repo.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#94A3B8] hover:text-[#22C55E]"
                        title={`Open ${repo.url || `https://github.com/${repo.owner}/${repo.name}`}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      App: {appName} · Default branch: {repo.defaultBranch}
                    </p>
                    <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs rounded ${
                      repo.connectionStatus === 'connected'
                        ? 'bg-[rgba(16,185,129,0.12)] text-[#10b981]'
                        : 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b]'
                    }`}>
                      <GitBranch className="w-3 h-3" />
                      {repo.connectionStatus === 'connected' ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBrowsing({ repo })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)] rounded"
                    title="Browse branches, code and commits"
                  >
                    <FolderKanban className="w-4 h-4" />
                    Browse code
                  </button>
                  <button
                    onClick={() => handleSync(repo)}
                    disabled={busy === repo.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)] rounded disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busy === repo.id ? 'animate-spin' : ''}`} />
                    {busy === repo.id ? 'Syncing' : 'Sync'}
                  </button>
                  {canManage && (
                    <button onClick={() => deleteRepository(repo.id)} className="p-1.5 text-[#94A3B8] hover:text-[#ef4444]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-[rgba(34,197,94,0.1)] pt-3">
                <p className="text-xs text-[#94A3B8] mb-2">
                  Linked work: <span className="text-[#F8FAFC]">{linked.length}</span> item{linked.length === 1 ? '' : 's'}
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {linked.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                      <GitPullRequest className="w-3.5 h-3.5 text-[#8b5cf6]" />
                      <span>{t.name}</span>
                      <span className="text-xs text-[#94A3B8] capitalize">{t.github?.status?.replace(/_/g, ' ') || 'not_started'}</span>
                      {t.github?.branchName && <span className="text-xs text-[#22C55E]">{t.github.branchName}</span>}
                    </div>
                  ))}
                  {linked.length === 0 && <p className="text-xs text-[#94A3B8]">No work items linked to this repository yet.</p>}
                </div>
              </div>

              {repo.lastSyncedAt && (
                <>
                  <div className="mt-3 border-t border-[rgba(34,197,94,0.1)] pt-3">
                    <p className="text-xs text-[#94A3B8] mb-2">
                      Branches: <span className="text-[#F8FAFC]">{repo.branches?.length ?? 0}</span>
                      <span className="text-[#64748B]"> · Last synced {new Date(repo.lastSyncedAt).toLocaleString()}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(repo.branches ?? []).map(b => (
                        <button
                          key={b}
                          onClick={() => setBrowsing({ repo, branch: b })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-[#22C55E] bg-[rgba(34,197,94,0.1)] hover:bg-[rgba(34,197,94,0.2)] rounded"
                          title={`Browse ${b} branch code`}
                        >
                          <GitBranch className="w-3 h-3" />
                          {b}
                        </button>
                      ))}
                      {(repo.branches ?? []).length === 0 && <p className="text-xs text-[#94A3B8]">No branches synced.</p>}
                    </div>
                  </div>
                  {(repo.commits?.length ?? 0) > 0 && (
                    <div className="mt-3 border-t border-[rgba(34,197,94,0.1)] pt-3">
                      <p className="text-xs text-[#94A3B8] mb-2">Recent commits on {repo.defaultBranch}</p>
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {(repo.commits ?? []).map(c => (
                          <button
                            key={c.sha}
                            onClick={() => setBrowsing({ repo })}
                            className="w-full flex items-center gap-2 text-sm text-[#CBD5E1] hover:bg-[rgba(255,255,255,0.03)] rounded px-1"
                            title={`Browse code (${repo.defaultBranch})`}
                          >
                            <GitPullRequest className="w-3.5 h-3.5 text-[#22C55E]" />
                            <span className="truncate">{c.message.split('\n')[0]}</span>
                            <span className="ml-auto text-xs text-[#94A3B8] truncate">{c.author}</span>
                            <span className="text-xs text-[#64748B]">{new Date(c.date).toLocaleDateString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}