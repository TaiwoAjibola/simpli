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
    <div className="p-6 max-w-6xl mx-auto bg-white min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#37352F] tracking-[-0.01em] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#787774]" />
            Repositories
          </h1>
          <p className="text-sm text-[#787774] mt-1">GitHub repositories linked to Simpli applications.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#2383E2] text-white font-medium hover:bg-[#1A6FC0] transition duration-150 rounded-[6px] text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Repository
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-5 mb-6 space-y-4">
          <div>
            <h3 className="font-semibold text-[#37352F] mb-1 text-sm">Link a GitHub repository</h3>
            <p className="text-xs text-[#787774]">
              Connect an existing GitHub repository to an application so Simpli can track branches, commits, pull requests, and reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-1.5">Application</label>
              <select
                value={form.appId}
                onChange={e => setForm({ ...form, appId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] cursor-pointer"
              >
                <option value="">Select application...</option>
                {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <p className="text-xs text-[#787774] mt-1.5">Which application does this repo belong to? Work items from this app will link to it.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-1.5">Git Repository URL</label>
              <input
                value={form.repoUrl}
                onChange={e => setForm({ ...form, repoUrl: e.target.value })}
                placeholder="https://github.com/owner/name"
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] font-mono transition duration-150"
              />
              <p className="text-xs text-[#787774] mt-1.5 flex items-start gap-1">
                <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Paste the full repo URL — e.g. <span className="font-mono">https://github.com/acme/webapp</span>,{' '}
                <span className="font-mono">git@github.com:acme/webapp.git</span>, or just <span className="font-mono">acme/webapp</span>.
                The owner and repo name are read from the URL for you.
              </p>
              {parsed && (
                <div className="mt-2 px-3 py-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] text-sm flex items-center gap-2">
                  <Github className="w-4 h-4 text-[#787774]" />
                  <span className="text-[#37352F]">Owner: <span className="font-mono text-[#2383E2]">{parsed.owner}</span></span>
                  <span className="text-[#787774]">/</span>
                  <span className="text-[#37352F]">Repo: <span className="font-mono text-[#2383E2]">{parsed.name}</span></span>
                </div>
              )}
              {form.repoUrl && !parsed && (
                <div className="mt-2 px-3 py-2 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] text-sm text-[#EB5757]">
                  Couldn't parse that URL. Use a format like <span className="font-mono">https://github.com/owner/name</span>.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#37352F] mb-1.5">Default branch</label>
              <input
                value={form.defaultBranch}
                onChange={e => setForm({ ...form, defaultBranch: e.target.value })}
                placeholder="main"
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] text-sm rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] font-mono transition duration-150"
              />
              <p className="text-xs text-[#787774] mt-1.5">The branch Simpli treats as the default (usually <span className="font-mono">main</span>). Commits and PRs are based on it.</p>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={!form.appId || !parsed}
            className="px-4 py-2 bg-[#2383E2] text-white text-sm font-medium hover:bg-[#1A6FC0] rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
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
          <div className="bg-white border border-[#E9E9E7] rounded-[8px] p-12 text-center">
            <p className="text-sm text-[#787774]">No repositories yet. Add one to enable GitHub integration.</p>
          </div>
        )}
        {repositories.map(repo => {
          const appName = apps.find(a => a.id === repo.appId)?.name || 'Unknown app';
          const linked = linkedTasks(repo);
          return (
            <div key={repo.id} className={`bg-white border border-[#E9E9E7] rounded-[8px] p-5 hover:bg-[#F7F7F5] transition duration-150 ${browsing ? 'hidden' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#F7F7F5] border border-[#E9E9E7] rounded-[6px] flex items-center justify-center flex-shrink-0">
                    <Github className="w-5 h-5 text-[#787774]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-[#37352F] text-sm">{repo.owner}/{repo.name}</h3>
                      <span className="text-xs text-[#787774] font-mono truncate max-w-[220px]">{repo.url}</span>
                      <a
                        href={repo.url || `https://github.com/${repo.owner}/${repo.name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#787774] hover:text-[#2383E2] transition duration-150"
                        title={`Open ${repo.url || `https://github.com/${repo.owner}/${repo.name}`}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-[#787774] mt-0.5">
                      App: {appName} · Default branch: {repo.defaultBranch}
                    </p>
                    <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 text-xs rounded-[4px] border font-medium ${
                      repo.connectionStatus === 'connected'
                        ? 'bg-[rgba(15,123,108,0.08)] text-[#0F7B6C] border-[rgba(15,123,108,0.15)]'
                        : 'bg-[#F7F7F5] text-[#787774] border-[#E9E9E7]'
                    }`}>
                      <GitBranch className="w-3 h-3" />
                      {repo.connectionStatus === 'connected' ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setBrowsing({ repo })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition duration-150 cursor-pointer"
                    title="Browse branches, code and commits"
                  >
                    <FolderKanban className="w-4 h-4 text-[#787774]" />
                    Browse code
                  </button>
                  <button
                    onClick={() => handleSync(repo)}
                    disabled={busy === repo.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] disabled:opacity-50 transition duration-150 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#787774] ${busy === repo.id ? 'animate-spin' : ''}`} />
                    {busy === repo.id ? 'Syncing' : 'Sync'}
                  </button>
                  {canManage && (
                    <button onClick={() => deleteRepository(repo.id)} className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] transition duration-150 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-[#E9E9E7] pt-3">
                <p className="text-xs text-[#787774] mb-2">
                  Linked work: <span className="text-[#37352F] font-medium">{linked.length}</span> item{linked.length === 1 ? '' : 's'}
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {linked.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-[#37352F]">
                      <GitPullRequest className="w-3.5 h-3.5 text-[#787774] flex-shrink-0" />
                      <span className="truncate">{t.name}</span>
                      <span className="text-xs text-[#787774] capitalize">{t.github?.status?.replace(/_/g, ' ') || 'not_started'}</span>
                      {t.github?.branchName && <span className="text-xs text-[#2383E2] font-mono">{t.github.branchName}</span>}
                    </div>
                  ))}
                  {linked.length === 0 && <p className="text-xs text-[#787774]">No work items linked to this repository yet.</p>}
                </div>
              </div>

              {repo.lastSyncedAt && (
                <>
                  <div className="mt-3 border-t border-[#E9E9E7] pt-3">
                    <p className="text-xs text-[#787774] mb-2">
                      Branches: <span className="text-[#37352F]">{repo.branches?.length ?? 0}</span>
                      <span className="text-[#9B9A97]"> · Last synced {new Date(repo.lastSyncedAt).toLocaleString()}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(repo.branches ?? []).map(b => (
                        <button
                          key={b}
                          onClick={() => setBrowsing({ repo, branch: b })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-[#37352F] bg-white border border-[#E9E9E7] hover:bg-[#F7F7F5] rounded-[4px] transition duration-150 cursor-pointer"
                          title={`Browse ${b} branch code`}
                        >
                          <GitBranch className="w-3 h-3 text-[#787774]" />
                          {b}
                        </button>
                      ))}
                      {(repo.branches ?? []).length === 0 && <p className="text-xs text-[#787774]">No branches synced.</p>}
                    </div>
                  </div>
                  {(repo.commits?.length ?? 0) > 0 && (
                    <div className="mt-3 border-t border-[#E9E9E7] pt-3">
                      <p className="text-xs text-[#787774] mb-2">Recent commits on {repo.defaultBranch}</p>
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {(repo.commits ?? []).map(c => (
                          <button
                            key={c.sha}
                            onClick={() => setBrowsing({ repo })}
                            className="w-full flex items-center gap-2 text-sm text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[6px] px-2 py-1 transition duration-150 cursor-pointer text-left"
                            title={`Browse code (${repo.defaultBranch})`}
                          >
                            <GitPullRequest className="w-3.5 h-3.5 text-[#787774] flex-shrink-0" />
                            <span className="truncate flex-1">{c.message.split('\n')[0]}</span>
                            <span className="text-xs text-[#787774] truncate hidden sm:inline">{c.author}</span>
                            <span className="text-xs text-[#9B9A97] flex-shrink-0">{new Date(c.date).toLocaleDateString()}</span>
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
