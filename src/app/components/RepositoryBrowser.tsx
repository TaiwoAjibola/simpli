import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  GitCompareArrows,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  RefreshCw,
  ExternalLink,
  Github
} from 'lucide-react';
import { Repository } from '../types';
import { useToast } from '../context/ToastContext';

type BrowserTab = 'code' | 'commits' | 'changes';

type TreeNode = { name: string; path: string; type: 'dir' | 'file'; children?: TreeNode[] };

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const sortFn = (a: TreeNode, b: TreeNode) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1);
  const sorted = [...paths].sort((a, b) => {
    const aParts = a.split('/');
    const bParts = b.split('/');
    if (aParts[0] !== bParts[0]) return aParts[0].localeCompare(bParts[0]);
    const aDir = aParts.length > 1;
    const bDir = bParts.length > 1;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.localeCompare(b);
  });
  for (const path of sorted) {
    const parts = path.split('/');
    let level = root;
    let acc = '';
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      let node = level.find(n => n.name === part);
      if (!node) {
        node = { name: part, path: acc, type: isFile ? 'file' : 'dir', ...(isFile ? {} : { children: [] }) };
        level.push(node);
      }
      level = node.children || [];
    });
  }
  const recurse = (nodes: TreeNode[]) => nodes.sort(sortFn).forEach(n => n.children && recurse(n.children));
  recurse(root);
  return root;
}

type Props = {
  repo: Repository;
  initialBranch?: string;
  onBack: () => void;
};

export function RepositoryBrowser({ repo, initialBranch, onBack }: Props) {
  const { showToast } = useToast();

  const [tab, setTab] = useState<BrowserTab>('code');
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [branchList, setBranchList] = useState<string[]>([]);
  const [viewBranch, setViewBranch] = useState(initialBranch || repo.defaultBranch || 'main');
  const [ready, setReady] = useState(false);
  const [commits, setCommits] = useState<any[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [diff, setDiff] = useState<any[]>([]);
  const [diffMeta, setDiffMeta] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const params = `owner=${repo.owner}&repo=${repo.name}`;

  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/github/branches?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load branches');
      const names = (data.branches || []).map((b: any) => b.name);
      setBranchList(names);
      if (names.length && !names.includes(viewBranch)) {
        // The requested branch (e.g. from a stale card chip) no longer
        // exists on GitHub — fall back to a live branch instead of 404ing.
        const fallback = names.includes(repo.defaultBranch) ? repo.defaultBranch : names[0];
        setViewBranch(fallback);
      }
      setReady(names.length > 0);
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load branches', message: String(e) });
      setReady(true);
    }
  }, [params, viewBranch, repo.defaultBranch, showToast]);

  const loadTree = useCallback(async () => {
    if (!viewBranch) return;
    setTreeLoading(true);
    try {
      const res = await fetch(`/api/github/contents?${params}&ref=${encodeURIComponent(viewBranch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load files');
      const files = (data.files || []).map((f: any) => f.path);
      setTree(buildTree(files));
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load files', message: String(e) });
      setTree([]);
    } finally {
      setTreeLoading(false);
    }
  }, [params, viewBranch, showToast]);

  const loadFile = useCallback(async (path: string) => {
    if (!viewBranch) return;
    setFileLoading(true);
    try {
      const res = await fetch(`/api/github/contents?${params}&ref=${encodeURIComponent(viewBranch)}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load file');
      setFileContent(data.content);
    } catch (e) {
      setFileContent(`// Error loading ${path}: ${e}`);
    } finally {
      setFileLoading(false);
    }
  }, [params, viewBranch]);

  const loadCommits = useCallback(async () => {
    if (!viewBranch) return;
    setCommitsLoading(true);
    try {
      const res = await fetch(`/api/github/commits?${params}&branch=${encodeURIComponent(viewBranch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load commits');
      setCommits(data.commits || []);
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load commits', message: String(e) });
    } finally {
      setCommitsLoading(false);
    }
  }, [params, viewBranch, showToast]);

  const loadDiff = useCallback(async () => {
    if (!viewBranch) return;
    setDiffLoading(true);
    try {
      const base = repo.defaultBranch || 'main';
      const res = await fetch(`/api/github/compare?${params}&base=${encodeURIComponent(base)}&head=${encodeURIComponent(viewBranch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load changes');
      setDiff(data.files || []);
      setDiffMeta({ status: data.status, ahead_by: data.ahead_by, total_commits: data.total_commits });
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load changes', message: String(e) });
    } finally {
      setDiffLoading(false);
    }
  }, [params, viewBranch, repo.defaultBranch, showToast]);

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.id]);

  useEffect(() => {
    if (!ready || !viewBranch) return;
    loadTree();
    loadCommits();
    loadDiff();
    setSelectedFile(null);
    setFileContent(null);
    setExpanded(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewBranch, ready]);

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile);
  }, [selectedFile, loadFile]);

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    const filterRec = (nodes: TreeNode[]): TreeNode[] => {
      const out: TreeNode[] = [];
      for (const node of nodes) {
        if (node.type === 'file') {
          if (node.path.toLowerCase().includes(q)) out.push(node);
        } else {
          const children = filterRec(node.children || []);
          if (node.name.toLowerCase().includes(q) || children.length) out.push({ ...node, children });
        }
      }
      return out;
    };
    return filterRec(tree);
  }, [tree, search]);

  const toggleDir = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const renderTree = (nodes: TreeNode[] | null, depth = 0) => {
    if (!nodes || nodes.length === 0) {
      return <p className="text-xs text-[#94A3B8] p-2">{treeLoading ? 'Loading files...' : 'No files'}</p>;
    }
    return nodes.map(node => (
      <React.Fragment key={node.path}>
        <button
          onClick={() => node.type === 'dir' ? toggleDir(node.path) : (setSelectedFile(node.path), setTab('code'))}
          className="flex items-center gap-1 w-full text-left px-2 py-[3px] hover:bg-[rgba(255,255,255,0.03)] text-xs"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {node.type === 'dir' ? (
            <>
              {expanded.has(node.path) ? <ChevronDown className="w-3 h-3 text-[#94A3B8] shrink-0" /> : <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />}
              <Folder className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
            </>
          ) : (
            <>
              <span className="w-3" />
              <File className="w-3.5 h-3.5 text-[#8b5cf6] shrink-0" />
            </>
          )}
          <span className={`truncate ${selectedFile === node.path && node.type === 'file' ? 'text-[#22C55E]' : 'text-[#CBD5E1]'}`}>{node.name}</span>
        </button>
        {node.type === 'dir' && expanded.has(node.path) && renderTree(node.children || [], depth + 1)}
      </React.Fragment>
    ));
  };

  const tabs: { id: BrowserTab; label: string; icon: any }[] = [
    { id: 'code', label: 'Code', icon: Github },
    { id: 'commits', label: 'Commits', icon: GitCommit },
    { id: 'changes', label: 'Changes', icon: GitCompareArrows }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-medium text-[#F8FAFC]">{repo.owner}/{repo.name}</h3>
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-4 h-4 text-[#22C55E]" />
          <select
            value={viewBranch}
            onChange={e => setViewBranch(e.target.value)}
            className="bg-[#0F172A] border border-[rgba(34,197,94,0.2)] text-[#22C55E] text-xs px-2 py-1 rounded outline-none"
          >
            <option value={viewBranch}>{viewBranch}</option>
            {branchList.filter(b => b !== viewBranch).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <a href={repo.url || `https://github.com/${repo.owner}/${repo.name}`} target="_blank" rel="noreferrer" className="text-[#94A3B8] hover:text-[#22C55E] ml-auto">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="flex gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded ${tab === t.id ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
        <button
          onClick={() => { loadTree(); loadCommits(); loadDiff(); }}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-[#94A3B8] hover:text-[#22C55E] ml-auto"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CODE TAB */}
      {tab === 'code' && (
        <div className="grid grid-cols-[280px_1fr] border border-[rgba(34,197,94,0.1)] rounded bg-[#0F172A] h-[520px]">
          <div className="border-r border-[rgba(34,197,94,0.1)] flex flex-col">
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[rgba(34,197,94,0.1)]">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files..."
                className="flex-1 bg-transparent text-xs text-[#F8FAFC] outline-none placeholder:text-[#475569]"
              />
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {filteredTree === null ? (
                <p className="text-xs text-[#94A3B8] p-2">Loading...</p>
              ) : filteredTree.length === 0 ? (
                <p className="text-xs text-[#94A3B8] p-2">No matching files</p>
              ) : renderTree(filteredTree)}
            </div>
          </div>
          <div className="bg-[#020617] overflow-auto">
            {selectedFile ? (
              fileLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-[#94A3B8]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading {selectedFile}...
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(34,197,94,0.1)] text-xs text-[#94A3B8] sticky top-0 bg-[#0F172A]">
                    <span className="font-mono">{selectedFile}</span>
                    <a href={`https://github.com/${repo.owner}/${repo.name}/blob/${viewBranch}/${selectedFile}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#22C55E] hover:opacity-80">
                      <ExternalLink className="w-3 h-3" />
                      View on GitHub
                    </a>
                  </div>
                  {(fileContent || '').split('\n').map((line, i) => (
                    <div key={i} className="flex items-start hover:bg-[rgba(255,255,255,0.02)]">
                      <span className="w-10 shrink-0 text-right pr-3 select-none py-px text-xs leading-5 font-mono text-[#334155]">{i + 1}</span>
                      <span className="flex-1 whitespace-pre text-[12px] leading-5 py-px font-mono text-[#CBD5E1]" style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                        {line || '\u00A0'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-[#475569]">
                Select a file from the tree to view its source
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMITS TAB */}
      {tab === 'commits' && (
        <div className="h-[520px] overflow-auto border border-[rgba(34,197,94,0.1)] rounded bg-[#020617] p-2">
          {commitsLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[#94A3B8]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading commits...
            </div>
          ) : commits.length === 0 ? (
            <div className="text-center py-10">
              <GitCommit className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">No commits on this branch yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {commits.map((c: any) => (
                <div key={c.sha} className="flex gap-3 p-3 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] rounded">
                  <div className="w-8 h-8 rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center shrink-0">
                    <GitCommit className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F8FAFC] break-words">{c.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#94A3B8]">
                      <span>{c.author}</span>
                      <span>·</span>
                      <span className="font-mono">{c.sha?.slice(0, 7)}</span>
                      {c.date && <span>· {new Date(c.date).toLocaleString()}</span>}
                    </div>
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noreferrer" className="text-[#22C55E] hover:opacity-80 shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHANGES TAB */}
      {tab === 'changes' && (
        <div className="h-[520px] overflow-auto border border-[rgba(34,197,94,0.1)] rounded bg-[#020617]">
          {diffLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[#94A3B8]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading diff...
            </div>
          ) : diff.length === 0 ? (
            <div className="text-center py-10">
              <GitCompareArrows className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">
                {diffMeta ? `No changes between ${diffMeta.base || 'base'} and head.` : 'No diff available yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {diff.map((f: any) => (
                <div key={f.filename} className="border border-[rgba(34,197,94,0.1)] rounded overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F172A] text-xs">
                    <span className="font-mono text-[#F8FAFC]">{f.filename}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[#4ade80]">+{f.additions}</span>
                      <span className="text-[#f87171]">-{f.deletions}</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        f.status === 'added' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]'
                        : f.status === 'removed' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                        : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                      }`}>{f.status}</span>
                    </span>
                  </div>
                  <div className="max-h-[320px] overflow-auto">
                    <div className="font-mono text-[12px] leading-5">
                      {(f.patch || '').split('\n').map((line: string, i: number) => {
                        let cls = 'text-[#94A3B8]';
                        let bg = '';
                        if (line.startsWith('+')) { cls = 'text-[#4ade80]'; bg = 'bg-[rgba(34,197,94,0.08)]'; }
                        else if (line.startsWith('-')) { cls = 'text-[#f87171]'; bg = 'bg-[rgba(255,59,92,0.08)]'; }
                        else if (line.startsWith('@@')) { cls = 'text-[#8b5cf6]'; bg = 'bg-[rgba(139,92,246,0.08)]'; }
                        return (
                          <div key={i} className={`${bg} px-3 whitespace-pre`}>
                            <span className="select-none text-[#334155]">{line[0] === '+' ? '+' : line[0] === '-' ? '-' : ' '}</span>
                            {line.slice(1) || '\u00A0'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}