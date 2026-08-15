import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GitBranch, GitPullRequest, Layers, Plus, RefreshCw, Trash2, ExternalLink, Github } from 'lucide-react';
import { Repository } from '../types';

export function RepositoriesPage() {
  const { repositories, apps, addRepository, updateRepository, deleteRepository, tasks } = useApp();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission('manage_repositories') || hasPermission('view_all_apps');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ appId: '', owner: '', name: '', defaultBranch: 'main', url: '' });
  const [busy, setBusy] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.appId || !form.owner || !form.name) {
      showToast({ type: 'error', title: 'Missing fields', message: 'App, owner, and repo name are required.' });
      return;
    }
    await addRepository({
      appId: form.appId,
      provider: 'github',
      owner: form.owner.trim(),
      name: form.name.trim(),
      url: form.url.trim() || `https://github.com/${form.owner.trim()}/${form.name.trim()}`,
      defaultBranch: form.defaultBranch || 'main',
      connectionStatus: 'not_connected',
      integrationStatus: 'configured'
    });
    setForm({ appId: '', owner: '', name: '', defaultBranch: 'main', url: '' });
    setShowForm(false);
    showToast({ type: 'success', title: 'Repository added', message: 'Repo saved. Connect on GitHub side to enable sync.' });
  };

  const handleSync = async (repo: Repository) => {
    setBusy(repo.id);
    try {
      const commits = await fetch(`/api/github/commits?owner=${repo.owner}&repo=${repo.name}&branch=${repo.defaultBranch}`).then(r => r.json());
      updateRepository(repo.id, { connectionStatus: 'connected', lastSyncedAt: new Date(), integrationStatus: 'synced' });
      showToast({ type: 'success', title: 'Sync complete', message: `Fetched ${commits.commits?.length || 0} commits from ${repo.owner}/${repo.name}.` });
    } catch (e) {
      showToast({ type: 'error', title: 'Sync failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  const linkedTasks = (repo: Repository) => tasks.filter(t => t.github?.repositoryId === `${repo.owner}/${repo.name}`);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f5] flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#00e5ff]" />
            Repositories
          </h1>
          <p className="text-sm text-[#6b6b80] mt-1">GitHub repositories linked to Simpli applications.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
          >
            <Plus className="w-4 h-4" />
            Add Repository
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-[#161b22] border border-[rgba(0,229,255,0.1)] p-5 rounded-lg mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.appId}
              onChange={e => setForm({ ...form, appId: e.target.value })}
              className="px-3 py-2 bg-[#0d1117] border border-[rgba(0,229,255,0.2)] text-[#f0f0f5] text-sm rounded"
            >
              <option value="">Select application...</option>
              {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input
              value={form.owner}
              onChange={e => setForm({ ...form, owner: e.target.value })}
              placeholder="GitHub owner/org"
              className="px-3 py-2 bg-[#0d1117] border border-[rgba(0,229,255,0.2)] text-[#f0f0f5] text-sm rounded"
            />
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Repo name"
              className="px-3 py-2 bg-[#0d1117] border border-[rgba(0,229,255,0.2)] text-[#f0f0f5] text-sm rounded"
            />
            <input
              value={form.defaultBranch}
              onChange={e => setForm({ ...form, defaultBranch: e.target.value })}
              placeholder="Default branch (main)"
              className="px-3 py-2 bg-[#0d1117] border border-[rgba(0,229,255,0.2)] text-[#f0f0f5] text-sm rounded"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.appId || !form.owner || !form.name}
            className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] text-sm font-medium hover:bg-[#00c4e0] rounded disabled:opacity-50"
          >
            Add Repository
          </button>
        </div>
      )}

      <div className="space-y-4">
        {repositories.length === 0 && (
          <p className="text-sm text-[#6b6b80]">No repositories yet. Add one to enable GitHub integration.</p>
        )}
        {repositories.map(repo => {
          const appName = apps.find(a => a.id === repo.appId)?.name || 'Unknown app';
          const linked = linkedTasks(repo);
          return (
            <div key={repo.id} className="bg-[#161b22] border border-[rgba(0,229,255,0.1)] p-5 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#0d1117] border border-[rgba(0,229,255,0.1)] rounded flex items-center justify-center">
                    <Github className="w-5 h-5 text-[#00e5ff]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#f0f0f5]">{repo.owner}/{repo.name}</h3>
                      <a href={repo.url} target="_blank" rel="noreferrer" className="text-[#6b6b80] hover:text-[#00e5ff]">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-[#6b6b80] mt-0.5">
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
                    onClick={() => handleSync(repo)}
                    disabled={busy === repo.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[rgba(0,229,255,0.1)] text-[#00e5ff] hover:bg-[rgba(0,229,255,0.2)] rounded disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busy === repo.id ? 'animate-spin' : ''}`} />
                    {busy === repo.id ? 'Syncing' : 'Sync'}
                  </button>
                  {canManage && (
                    <button onClick={() => deleteRepository(repo.id)} className="p-1.5 text-[#6b6b80] hover:text-[#ef4444]">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-[rgba(0,229,255,0.1)] pt-3">
                <p className="text-xs text-[#6b6b80] mb-2">
                  Linked work: <span className="text-[#f0f0f5]">{linked.length}</span> item{linked.length === 1 ? '' : 's'}
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {linked.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm text-[#c0c0d0]">
                      <GitPullRequest className="w-3.5 h-3.5 text-[#8b5cf6]" />
                      <span>{t.name}</span>
                      <span className="text-xs text-[#6b6b80] capitalize">{t.github?.status?.replace(/_/g, ' ') || 'not_started'}</span>
                      {t.github?.branchName && <span className="text-xs text-[#00e5ff]">{t.github.branchName}</span>}
                    </div>
                  ))}
                  {linked.length === 0 && <p className="text-xs text-[#6b6b80]">No work items linked to this repository yet.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}