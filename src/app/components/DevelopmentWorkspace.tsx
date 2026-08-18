import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FileCode2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  GitCompareArrows,
  Rocket,
  Github
} from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { GithubSubDoc } from '../types';
import { QaWorkPanel } from './QaWorkPanel';
import javascriptLang from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import typescriptLang from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import jsxLang from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import tsxLang from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import jsonLang from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import cssLang from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markupLang from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import pythonLang from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import bashLang from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import yamlLang from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import goLang from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import rustLang from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import javaLang from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import sqlLang from 'react-syntax-highlighter/dist/esm/languages/prism/sql';

SyntaxHighlighter.registerLanguage('javascript', javascriptLang);
SyntaxHighlighter.registerLanguage('typescript', typescriptLang);
SyntaxHighlighter.registerLanguage('jsx', jsxLang);
SyntaxHighlighter.registerLanguage('tsx', tsxLang);
SyntaxHighlighter.registerLanguage('json', jsonLang);
SyntaxHighlighter.registerLanguage('css', cssLang);
SyntaxHighlighter.registerLanguage('scss', cssLang);
SyntaxHighlighter.registerLanguage('markup', markupLang);
SyntaxHighlighter.registerLanguage('html', markupLang);
SyntaxHighlighter.registerLanguage('xml', markupLang);
SyntaxHighlighter.registerLanguage('vue', markupLang);
SyntaxHighlighter.registerLanguage('python', pythonLang);
SyntaxHighlighter.registerLanguage('bash', bashLang);
SyntaxHighlighter.registerLanguage('yaml', yamlLang);
SyntaxHighlighter.registerLanguage('yml', yamlLang);
SyntaxHighlighter.registerLanguage('go', goLang);
SyntaxHighlighter.registerLanguage('rust', rustLang);
SyntaxHighlighter.registerLanguage('java', javaLang);
SyntaxHighlighter.registerLanguage('sql', sqlLang);

function languageFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', json: 'json',
    css: 'css', scss: 'scss', html: 'markup', md: 'markdown', py: 'python',
    go: 'go', rs: 'rust', java: 'java', rb: 'ruby', php: 'php', sh: 'bash',
    yml: 'yaml', yaml: 'yaml', xml: 'markup', sql: 'sql', swift: 'swift',
    kt: 'kotlin', c: 'c', cpp: 'cpp', h: 'c', cs: 'csharp', vue: 'markup'
  };
  return map[ext] || 'text';
}

type WorkspaceTab = 'code' | 'changes' | 'commits' | 'pr' | 'issue' | 'qa' | 'deploys';

type Props = {
  workKind: 'task' | 'defect';
  workId: string;
  github?: GithubSubDoc;
};

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
        node = { name: part, path: acc, type: isFile ? 'file' : 'dir', children: isFile ? undefined : [] };
        level.push(node);
      }
      if (!isFile && node.type === 'dir') level = node.children!;
    });
  }
  const recSort = (nodes: TreeNode[]) => {
    nodes.sort(sortFn);
    nodes.forEach(n => n.children && recSort(n.children));
    return nodes;
  };
  return recSort(root);
}

function DiffLines({ patch }: { patch: string }) {
  const lines = useMemo(() => patch.split('\n'), [patch]);
  return (
    <div className="font-mono text-[12px] leading-5">
      {lines.map((line, i) => {
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
  );
}

export function DevelopmentWorkspace({ workKind, workId, github }: Props) {
  const { repositories, updateWorkGithub, getRepositoriesForApp, tasks, defects } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<WorkspaceTab>('code');
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [commits, setCommits] = useState<any[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [diff, setDiff] = useState<any[]>([]);
  const [diffMeta, setDiffMeta] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [prDetail, setPrDetail] = useState<any>(null);
  const [prLoading, setPrLoading] = useState(false);
  const [deployments, setDeployments] = useState<any[] | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployConfigured, setDeployConfigured] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [branchList, setBranchList] = useState<string[]>([]);
  const [viewBranch, setViewBranch] = useState('');
  const loadedRef = useRef<string | null>(null);

  const work = workKind === 'task' ? tasks.find(t => t.id === workId) : defects.find(d => d.id === workId);
  const g = work?.github || github;

  const allRepos = repositories;
  const appId = workKind === 'task' ? work?.appId : work?.applicationId;
  const appScoped = appId ? getRepositoriesForApp(appId) : [];
  const appRepos = appScoped.length
    ? [...appScoped, ...allRepos.filter(r => !appScoped.find(x => x.id === r.id))]
    : allRepos;
  const repo = g?.repositoryId
    ? repositories.find(r => `${r.owner}/${r.name}` === g.repositoryId || r.id === g.repositoryId)
    : undefined;

  const workBranch = g?.branchName;
  const defaultBranch = repo?.defaultBranch || 'main';
  const prNumber = g?.pullRequest?.prNumber;
  const branch = viewBranch || workBranch || (repo ? defaultBranch : '');

  const canReview = hasPermission('review_code') || hasPermission('manage_workflow') || hasPermission('manage_repositories');
  const canMerge = hasPermission('develop_work') || hasPermission('manage_repositories') || hasPermission('manage_workflow');
  const canDev = hasPermission('develop_work') || hasPermission('manage_repositories') || hasPermission('manage_workflow');

  const params = repo ? `owner=${repo.owner}&repo=${repo.name}` : '';

  const loadBranches = useCallback(async () => {
    if (!params) {
      setBranchList([]);
      return;
    }
    try {
      const res = await fetch(`/api/github/branches?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load branches');
      const names = (data.branches || []).map((b: any) => b.name);
      setBranchList(names);
      if (!viewBranch && workBranch && names.length && !names.includes(workBranch)) {
        setBranchList([workBranch, ...names]);
      }
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load branches', message: String(e) });
    }
  }, [params, viewBranch, workBranch, showToast]);

  useEffect(() => {
    setViewBranch('');
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo?.id]);

  const loadTree = useCallback(async () => {
    if (!params || !branch) return;
    setTreeLoading(true);
    try {
      const res = await fetch(`/api/github/contents?${params}&ref=${encodeURIComponent(branch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tree');
      const files = (data.files || []).map((f: any) => f.path);
      setTree(buildTree(files));
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load files', message: String(e) });
      setTree([]);
    } finally {
      setTreeLoading(false);
    }
  }, [params, branch, showToast]);

  const loadFile = useCallback(async (path: string) => {
    if (!params || !branch) return;
    setFileLoading(true);
    try {
      const res = await fetch(`/api/github/contents?${params}&ref=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load file');
      setFileContent(data.content);
    } catch (e) {
      setFileContent(`// Error loading ${path}: ${e}`);
    } finally {
      setFileLoading(false);
    }
  }, [params, branch]);

  const loadCommits = useCallback(async () => {
    if (!params || !branch) return;
    setCommitsLoading(true);
    try {
      const res = await fetch(`/api/github/commits?${params}&branch=${encodeURIComponent(branch)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load commits');
      setCommits(data.commits || []);
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load commits', message: String(e) });
    } finally {
      setCommitsLoading(false);
    }
  }, [params, branch, showToast]);

  const loadDiff = useCallback(async () => {
    if (!params || !branch) return;
    setDiffLoading(true);
    try {
      const head = prNumber ? '' : branch;
      const url = prNumber
        ? `/api/github/compare?${params}&prNumber=${prNumber}`
        : `/api/github/compare?${params}&base=${encodeURIComponent(defaultBranch)}&head=${encodeURIComponent(head)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load diff');
      setDiff(data.files || []);
      setDiffMeta({ status: data.status, ahead_by: data.ahead_by, total_commits: data.total_commits });
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load diff', message: String(e) });
    } finally {
      setDiffLoading(false);
    }
  }, [params, branch, prNumber, defaultBranch, showToast]);

  const loadPr = useCallback(async () => {
    if (!params || !prNumber) return;
    setPrLoading(true);
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', owner: repo?.owner, repo: repo?.name, prNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load PR');
      setPrDetail(data);
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load PR', message: String(e) });
    } finally {
      setPrLoading(false);
    }
  }, [params, prNumber, repo?.owner, repo?.name, showToast]);

  const loadDeployments = useCallback(async () => {
    setDeployLoading(true);
    try {
      const project = repo?.name || '';
      const res = await fetch(`/api/vercel/deployments?${project ? `project=${encodeURIComponent(project)}` : ''}&limit=10`);
      const data = await res.json();
      if (data.configured === false) {
        setDeployConfigured(false);
        setDeployments([]);
        return;
      }
      setDeployConfigured(true);
      setDeployments(res.ok ? data.deployments || [] : []);
    } catch {
      setDeployments([]);
    } finally {
      setDeployLoading(false);
    }
  }, [repo?.name]);

  // Load data when repo+branch are known.
  useEffect(() => {
    const key = `${params}|${branch}|${prNumber}`;
    if (!params || !branch || loadedRef.current === key) return;
    loadedRef.current = key;
    loadTree();
    loadCommits();
    loadDiff();
    if (prNumber) loadPr();
    loadDeployments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, branch, prNumber]);

  // Auto-sync: silently refresh live data (PR, commits, diff) while the
  // workspace is open so statuses picked up by webhooks appear without the
  // manual Refresh button. Tree + file content are only refreshed on demand.
  const refresh = useCallback(() => {
    loadCommits();
    loadDiff();
    if (prNumber) loadPr();
    loadDeployments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCommits, loadDiff, loadPr, loadDeployments, prNumber]);

  useEffect(() => {
    if (!params || !branch) return;
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [params, branch, refresh]);

  const handleRefresh = useCallback(() => {
    loadTree();
    loadCommits();
    loadDiff();
    if (prNumber) loadPr();
    loadDeployments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTree, loadCommits, loadDiff, loadPr, loadDeployments, prNumber]);

  const handleCreateBranch = async () => {
    if (!repo || !branchName.trim()) return;
    setBusy('branch');
    try {
      const res = await fetch('/api/github/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, repo: repo.name, name: branchName.trim(), baseBranch: repo.defaultBranch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Branch creation failed');
      await updateWorkGithub(workKind, workId, {
        repositoryId: `${repo.owner}/${repo.name}`,
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
    if (!repo || !g?.branchName) return;
    setBusy('pr');
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', owner: repo.owner, repo: repo.name, title: prTitle || `Work ${workId}`, head: g.branchName, base: repo.defaultBranch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PR open failed');
      await updateWorkGithub(workKind, workId, {
        pullRequest: { prNumber: data.prNumber, url: data.url, state: 'open', title: data.title, reviewers: [], reviewState: 'pending', checkStatus: 'pending' },
        status: 'pr_open'
      });
      showToast({ type: 'success', title: 'PR opened', message: `PR #${data.prNumber} opened.` });
      setPrTitle('');
    } catch (e) {
      showToast({ type: 'error', title: 'PR open failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile);
  }, [selectedFile, loadFile]);

  const toggleDir = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    const filterRec = (nodes: TreeNode[]): TreeNode[] => {
      const out: TreeNode[] = [];
      for (const n of nodes) {
        if (n.type === 'file' && n.path.toLowerCase().includes(q)) out.push(n);
        else if (n.type === 'dir') {
          const kids = filterRec(n.children || []);
          if (kids.length) out.push({ ...n, children: kids });
        }
      }
      return out;
    };
    return filterRec(tree);
  }, [tree, search]);

  const handleReview = async (event: string) => {
    if (!params || !prNumber) return;
    setBusy('review');
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', owner: repo?.owner, repo: repo?.name, prNumber, reviewEvent: event })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');
      await updateWorkGithub(workKind, workId, {
        pullRequest: {
          ...(g?.pullRequest || {}),
          reviewState: event === 'APPROVE' ? 'approved' : 'changes_requested'
        } as any,
        status: event === 'APPROVE' ? 'review' : 'review'
      });
      showToast({ type: 'success', title: event === 'APPROVE' ? 'Approved' : 'Changes requested', message: `PR #${prNumber} updated.` });
      loadPr();
    } catch (e) {
      showToast({ type: 'error', title: 'Review failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  const handleMerge = async () => {
    if (!params || !prNumber) return;
    setBusy('merge');
    try {
      const res = await fetch('/api/github/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo?.owner, repo: repo?.name, prNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed');
      await updateWorkGithub(workKind, workId, {
        pullRequest: { ...(g?.pullRequest || {}), state: 'merged' } as any,
        status: 'merged'
      });
      showToast({ type: 'success', title: 'Merged', message: `PR #${prNumber} merged.` });
      loadPr();
    } catch (e) {
      showToast({ type: 'error', title: 'Merge failed', message: String(e) });
    } finally {
      setBusy(null);
    }
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

  const tabs: { id: WorkspaceTab; label: string; icon: any }[] = [
    { id: 'code', label: 'Code', icon: FileCode2 },
    { id: 'changes', label: 'Changes', icon: GitCompareArrows },
    {id: 'commits', label: 'Commits', icon: GitCommit },
    { id: 'pr', label: 'Pull Request', icon: GitPullRequest },
    { id: 'issue', label: 'Issue', icon: Github },
    { id: 'qa', label: 'QA', icon: CheckCircle },
    { id: 'deploys', label: 'Deploys', icon: Rocket }
  ];

  return (
    <div className="space-y-4">
      {/* Integration status header */}
      <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-4 rounded">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2 text-[#22C55E]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            GitHub {repo ? 'Connected' : 'Not connected'}
          </span>
          {repo && (
            <>
              <span className="flex items-center gap-1.5 text-[#F8FAFC]">
                <GitBranch className="w-4 h-4 text-[#94A3B8]" />
                {repo.owner}/{repo.name}
              </span>
              {branch && (
                <span className="flex items-center gap-1.5 text-[#8b5cf6] font-mono">
                  <GitBranch className="w-4 h-4" />
                  {branch}
                </span>
              )}
              {prNumber && (
                <span className="flex items-center gap-1.5 text-[#10b981]">
                  <GitPullRequest className="w-4 h-4" />
                  PR #{prNumber}
                </span>
              )}
              {commits.length > 0 && (
                <span className="flex items-center gap-1.5 text-[#94A3B8]">
                  <GitCommit className="w-4 h-4" />
                  {commits.length} commits
                </span>
              )}
              {g?.pullRequest && (
                <span className={`px-2 py-0.5 rounded text-xs ${
                  g.pullRequest.checkStatus === 'success' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                  : g.pullRequest.checkStatus === 'failure' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                  : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                }`}>
                  CI: {g.pullRequest.checkStatus || 'pending'}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Workspace tabs */}
      <div className="flex gap-1 border-b border-[rgba(34,197,94,0.1)]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            disabled={!repo || (t.id !== 'deploys' && t.id !== 'issue' && !branch) || (t.id === 'pr' && !prNumber)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition disabled:opacity-40 ${
              tab === t.id ? 'border-[#22C55E] text-[#22C55E] font-medium' : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
        {canDev && (
          <button
            onClick={handleRefresh}
            className="ml-auto flex items-center gap-1 px-3 py-2 text-xs text-[#94A3B8] hover:text-[#22C55E]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Actions: repo select, create branch, open PR */}
      <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-3 rounded space-y-2">
        {appRepos.length > 0 && (
          <select
            value={repo?.id || (g?.repositoryId || '')}
            onChange={e => {
              const r = repositories.find(x => x.id === e.target.value);
              updateWorkGithub(workKind, workId, { repositoryId: r ? `${r.owner}/${r.name}` : e.target.value } as any);
            }}
            className="w-full bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-sm px-2 py-1.5 rounded"
          >
            <option value="">Select repository...</option>
            {appRepos.map(r => (
              <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
            ))}
          </select>
        )}
        {repo && (
          <div className="flex items-center gap-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] rounded px-2">
            <GitBranch className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
            <select
              value={branch}
              onChange={e => setViewBranch(e.target.value)}
              className="w-full bg-transparent text-[#F8FAFC] text-sm py-1.5 rounded outline-none"
              title="Switch branch"
            >
              <option value={branch}>{branch}</option>
              {branchList.filter(b => b !== branch).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        )}
        {canDev && repo && !g?.branchName && (
          <div className="flex gap-2">
            <input
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              placeholder="New branch name (e.g. feature/sim-142)"
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
        {canDev && repo && g?.branchName && !g?.pullRequest?.prNumber && (
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
      </div>

      {/* No repo/branch empty state */}
      {(!repo || !branch) && (
        <div className="text-center py-10 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] rounded">
          <GitBranch className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
          <p className="text-sm text-[#94A3B8]">
            {!repo ? 'Link a repository to this work item to open the workspace.' : 'Create a branch to start the development workspace.'}
          </p>
        </div>
      )}

      {/* CODE TAB */}
      {repo && branch && tab === 'code' && (
        <div className="grid grid-cols-[240px_1fr] h-[520px] border border-[rgba(34,197,94,0.1)] rounded overflow-hidden">
          <div className="bg-[#0F172A] border-r border-[rgba(34,197,94,0.1)] flex flex-col">
            <div className="p-2 border-b border-[rgba(34,197,94,0.1)] flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
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
                    <a href={`https://github.com/${repo.owner}/${repo.name}/blob/${branch}/${selectedFile}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#22C55E] hover:opacity-80">
                      <ExternalLink className="w-3 h-3" />
                      View on GitHub
                    </a>
                  </div>
                  <SyntaxHighlighter
                    language={languageFor(selectedFile)}
                    style={oneDark}
                    customStyle={{ margin: 0, background: 'transparent', fontSize: 12, padding: '12px 16px' }}
                    showLineNumbers
                    codeTagProps={{ style: { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" } }}
                  >
                    {fileContent || ''}
                  </SyntaxHighlighter>
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

      {/* CHANGES TAB */}
      {repo && branch && tab === 'changes' && (
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
                    <DiffLines patch={f.patch} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMITS TAB */}
      {repo && branch && tab === 'commits' && (
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
              {commits.map((c: any, i: number) => (
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

      {/* PR TAB */}
      {repo && branch && prNumber && tab === 'pr' && (
        <div className="space-y-4">
          <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-4 rounded">
            {prLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading PR...
              </div>
            ) : prDetail ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-[#F8FAFC] flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-[#10b981]" />
                    PR #{prDetail.prNumber}: {prDetail.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${
                      prDetail.reviewState === 'approved' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                      : prDetail.reviewState === 'changes_requested' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                      : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                    }`}>
                      Review: {prDetail.reviewState || 'pending'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${
                      prDetail.checkStatus === 'success' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                      : prDetail.checkStatus === 'failure' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                      : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                    }`}>
                      CI: {prDetail.checkStatus || 'pending'}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${
                      prDetail.state === 'merged' ? 'bg-[rgba(139,92,246,0.15)] text-[#8b5cf6]'
                      : prDetail.state === 'open' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]'
                      : 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]'
                    }`}>
                      {prDetail.state}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                  <span className="font-mono text-[#22C55E]">{prDetail.head || '?'}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="font-mono text-[#F8FAFC]">{prDetail.base || '?'}</span>
                  {prDetail.mergedAt && <span>Merged {new Date(prDetail.mergedAt).toLocaleString()}</span>}
                  {prDetail.url && (
                    <a href={prDetail.url} target="_blank" rel="noreferrer" className="text-[#22C55E] hover:opacity-80">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                {(canReview || canMerge) && prDetail.state === 'open' && (
                  <div className="flex gap-2 pt-2 border-t border-[rgba(34,197,94,0.1)]">
                    {canReview && (
                      <button
                        onClick={() => handleReview('APPROVE')}
                        disabled={busy === 'review'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a] rounded disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Review
                      </button>
                    )}
                    {canReview && (
                      <button
                        onClick={() => handleReview('REQUEST_CHANGES')}
                        disabled={busy === 'review'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444] text-white text-sm font-medium hover:bg-[#dc2626] rounded disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Request Changes
                      </button>
                    )}
                    {canMerge && prDetail.reviewState === 'approved' && (
                      <button
                        onClick={handleMerge}
                        disabled={busy === 'merge'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5cf6] text-white text-sm font-medium hover:bg-[#7c3aed] rounded disabled:opacity-50"
                      >
                        <GitPullRequest className="w-4 h-4" />
                        {busy === 'merge' ? 'Merging...' : 'Merge PR'}
                      </button>
                    )}
                  </div>
                )}

                {prDetail.description && (
                  <div className="pt-2 border-t border-[rgba(34,197,94,0.1)]">
                    <p className="text-xs font-semibold text-[#94A3B8] mb-1">Description</p>
                    <p className="text-sm text-[#F8FAFC] whitespace-pre-wrap">{prDetail.description}</p>
                  </div>
                )}

                {prDetail.reviewers && prDetail.reviewers.length > 0 && (
                  <div className="pt-2 border-t border-[rgba(34,197,94,0.1)]">
                    <p className="text-xs font-semibold text-[#94A3B8] mb-2">Reviews</p>
                    <div className="space-y-2">
                      {prDetail.reviewers.map((r: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-2 rounded">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            r.state === 'APPROVED' ? 'bg-[rgba(16,185,129,0.2)] text-[#10b981]'
                            : r.state === 'CHANGES_REQUESTED' ? 'bg-[rgba(239,68,68,0.2)] text-[#ef4444]'
                            : 'bg-[rgba(245,158,11,0.2)] text-[#f59e0b]'
                          }`}>
                            {r.login.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium text-[#F8FAFC]">{r.login}</span>
                              <span className={`px-1.5 py-0.5 rounded ${
                                r.state === 'APPROVED' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                                : r.state === 'CHANGES_REQUESTED' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                                : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                              }`}>
                                {r.state === 'APPROVED' ? 'Approved' : r.state === 'CHANGES_REQUESTED' ? 'Changes requested' : r.state}
                              </span>
                              {r.submittedAt && <span className="text-[#64748b]">{new Date(r.submittedAt).toLocaleString()}</span>}
                            </div>
                            {r.body && <p className="text-xs text-[#CBD5E1] mt-1 whitespace-pre-wrap">{r.body}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {prDetail.checks && prDetail.checks.length > 0 && (
                  <div className="pt-2 border-t border-[rgba(34,197,94,0.1)]">
                    <p className="text-xs font-semibold text-[#94A3B8] mb-2">Checks</p>
                    <div className="space-y-1.5">
                      {prDetail.checks.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            c.conclusion === 'success' ? 'bg-[rgba(16,185,129,0.2)] text-[#10b981]'
                            : c.conclusion === 'failure' || c.conclusion === 'action_required' || c.conclusion === 'timed_out' ? 'bg-[rgba(239,68,68,0.2)] text-[#ef4444]'
                            : 'bg-[rgba(245,158,11,0.2)] text-[#f59e0b]'
                          }`}>
                            {c.conclusion === 'success' ? '✓' : c.conclusion === 'failure' || c.conclusion === 'action_required' || c.conclusion === 'timed_out' ? '✗' : '…'}
                          </span>
                          <span className="text-[#CBD5E1]">{c.status === 'completed' ? c.name : `${c.name} (${c.status})`}</span>
                          <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${
                            c.conclusion === 'success' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                            : c.conclusion === 'failure' || c.conclusion === 'action_required' || c.conclusion === 'timed_out' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                            : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                          }`}>
                            {c.status === 'completed' ? (c.conclusion || 'completed') : (c.status || 'in_progress')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8]">{`PR #${prNumber} — use Refresh to load details.`}</p>
            )}
          </div>
        </div>
      )}

      {/* QA TAB */}
      {repo && branch && tab === 'qa' && (
        <QaWorkPanel
          workKind={workKind}
          workId={workId}
          qualifies={work?.status === 'pending_qa' || work?.status === 'in_progress' || work?.status === 'completed' || work?.status === 'resolved'}
        />
      )}

      {/* ISSUE TAB */}
      {repo && tab === 'issue' && (
        <div className="space-y-3">
          {g?.issue ? (
            <div className="bg-[#1E293B] border border-[rgba(34,197,94,0.1)] p-4 rounded">
              <div className="flex items-start gap-3">
                <Github className="w-5 h-5 text-[#22C55E] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${g.issue.state === 'closed' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#22C55E]/20 text-[#22C55E]'}`}>
                      {g.issue.state}
                    </span>
                    <span className="text-sm font-mono text-[#F8FAFC]">#{g.issue.issueNumber}</span>
                    <a href={g.issue.url} target="_blank" rel="noreferrer" className="text-[#22C55E] hover:opacity-80 ml-auto">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-sm text-[#F8FAFC] mt-2">{g.issue.title}</p>
                  {g.issue.labels && g.issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.issue.labels.map(lb => (
                        <span key={lb} className="px-2 py-0.5 text-xs bg-[#020617] border border-[rgba(34,197,94,0.15)] text-[#94A3B8] rounded">
                          {lb}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 border border-[rgba(34,197,94,0.1)] rounded bg-[#0F172A]">
              <Github className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">
                No GitHub issue linked. For defects, creating the defect with this repository linked opens an issue.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DEPLOYS TAB */}
      {repo && tab === 'deploys' && (
        <div className="h-[520px] overflow-auto border border-[rgba(34,197,94,0.1)] rounded bg-[#020617] p-2">
          {!deployConfigured ? (
            <div className="text-center py-10">
              <Rocket className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">Vercel tracking not configured.</p>
              <p className="text-xs text-[#64748b] mt-1">Set VERCEL_TOKEN (server-side) to see deployments.</p>
            </div>
          ) : deployLoading && deployments === null ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[#94A3B8]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading deployments...
            </div>
          ) : deployments && deployments.length === 0 ? (
            <div className="text-center py-10">
              <Rocket className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">No deployments found for {repo.owner}/{repo.name}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(deployments || []).map((d: any) => (
                <div key={d.id} className="flex gap-3 p-3 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] rounded items-center">
                  <Rocket className="w-4 h-4 text-[#22C55E] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F8FAFC] truncate">{d.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[#94A3B8]">
                      <span className="capitalize">{d.environment}</span>
                      {d.commitRef && <span>· {d.commitRef}</span>}
                      {d.commitSha && <span className="font-mono">{d.commitSha.slice(0, 7)}</span>}
                      {d.createdAt && <span>· {new Date(d.createdAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    d.state === 'READY' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                    : d.state === 'ERROR' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                    : d.state === 'CANCELED' ? 'bg-[rgba(107,107,128,0.1)] text-[#94A3B8]'
                    : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                  }`}>
                    {d.state}
                  </span>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-[#22C55E] hover:opacity-80 shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
