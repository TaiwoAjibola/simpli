import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  GitCompareArrows,
  Folder,
  FolderOpen,
  File,
  FileCode,
  Braces,
  FileText,
  FileImage,
  Settings,
  Terminal,
  Palette,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Github,
  FileSearch,
  GitPullRequest,
  MessageSquare,
  MessageSquarePlus,
  Send,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Repository } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

type BrowserTab = 'code' | 'commits' | 'changes';

type TreeNode = { name: string; path: string; type: 'dir' | 'file'; size?: number; children?: TreeNode[] };

const GUIDE_W = 15;

function fileMeta(node: TreeNode): { Icon: any; color: string } {
  if (node.type === 'dir') {
    return { Icon: Folder, color: '#fbbf24' };
  }
  const name = node.name.toLowerCase();
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return { Icon: FileCode, color: '#38bdf8' };
  if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.mjs') || name.endsWith('.cjs')) return { Icon: FileCode, color: '#eab308' };
  if (name.endsWith('.json') || name === '.env' || name.endsWith('.env')) return { Icon: Braces, color: '#f59e0b' };
  if (name.endsWith('.css') || name.endsWith('.scss') || name.endsWith('.sass') || name.endsWith('.less') || name.endsWith('.html')) return { Icon: Palette, color: '#f472b6' };
  if (name.endsWith('.md') || name.endsWith('.mdx') || name.endsWith('.txt')) return { Icon: FileText, color: '#94a3b8' };
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.svg') || name.endsWith('.webp') || name.endsWith('.ico')) return { Icon: FileImage, color: '#a78bfa' };
  if (name.endsWith('.yml') || name.endsWith('.yaml') || name.endsWith('.toml') || name.endsWith('.ini') || name.includes('lock')) return { Icon: Settings, color: '#fb923c' };
  if (name.endsWith('.sh') || name.endsWith('.bash') || name.endsWith('.zsh') || name.endsWith('.py')) return { Icon: Terminal, color: '#22c55e' };
  return { Icon: File, color: '#64748b' };
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** New-side (RIGHT) line numbers present in a unified diff patch. */
function diffNewLines(patch?: string): Set<number> {
  const set = new Set<number>();
  if (!patch) return set;
  let newLine = 0;
  for (const ln of patch.split('\n')) {
    const hunk = ln.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { newLine = Number(hunk[1]); continue; }
    if (ln.startsWith('+') || ln.startsWith(' ')) set.add(newLine);
    if (!ln.startsWith('-')) newLine += 1;
  }
  return set;
}

function buildTree(files: { path: string; size?: number }[]): TreeNode[] {
  const root: TreeNode[] = [];
  const sortFn = (a: TreeNode, b: TreeNode) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1);
  const sorted = [...files].sort((a, b) => {
    const aParts = a.path.split('/');
    const bParts = b.path.split('/');
    if (aParts[0] !== bParts[0]) return aParts[0].localeCompare(bParts[0]);
    const aDir = aParts.length > 1;
    const bDir = bParts.length > 1;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
  for (const f of sorted) {
    const parts = f.path.split('/');
    let level = root;
    let acc = '';
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      let node = level.find(n => n.name === part);
      if (!node) {
        node = {
          name: part,
          path: acc,
          type: isFile ? 'file' : 'dir',
          ...(isFile ? { size: f.size } : { children: [] })
        };
        level.push(node);
      }
      level = node.children || [];
    });
  }
  const recurse = (nodes: TreeNode[]) => nodes.sort(sortFn).forEach(n => n.children && recurse(n.children));
  recurse(root);
  return root;
}

function countFiles(nodes: TreeNode[], type: 'file' | 'dir'): number {
  if (!nodes) return 0;
  let n = 0;
  for (const node of nodes) {
    if (node.type === type) n += 1;
    if (node.children) n += countFiles(node.children, type);
  }
  return n;
}

type Props = {
  repo: Repository;
  initialBranch?: string;
  onBack: () => void;
};

export function RepositoryBrowser({ repo, initialBranch, onBack }: Props) {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const canReview = hasPermission('review_code') || hasPermission('manage_workflow') || hasPermission('manage_repositories');
  const canMerge = hasPermission('merge_code') || hasPermission('develop_work') || hasPermission('manage_repositories') || hasPermission('manage_workflow');

  const [tab, setTab] = useState<BrowserTab>('code');
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
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

  const [prs, setPrs] = useState<any[]>([]);
  const [prNumber, setPrNumber] = useState<number | null>(null);
  const [prDetail, setPrDetail] = useState<any>(null);
  const [commentable, setCommentable] = useState<Set<number>>(new Set());
  const [pendingComments, setPendingComments] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState('');
  const [commentComposer, setCommentComposer] = useState<{ path: string; line: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const params = `owner=${repo.owner}&repo=${repo.name}`;

  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch(`/api/github/branches?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load branches');
      const names = (data.branches || []).map((b: any) => b.name);
      setBranchList(names);
      if (names.length && !names.includes(viewBranch)) {
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
      const files = (data.files || []).map((f: any) => ({ path: f.path, size: f.size }));
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
      setFileSize(data.size);
    } catch (e) {
      setFileContent(`// Error loading ${path}: ${e}`);
      setFileSize(undefined);
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

  // --- PR / CODE REVIEW flow (mirrors the development workspace) ---

  const loadPrs = useCallback(async () => {
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', owner: repo.owner, repo: repo.name, state: 'open' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list pull requests');
      const list = data.pullRequests || [];
      setPrs(list);
      const match = list.find((p: any) => p.head === viewBranch);
      if (match) setPrNumber(match.prNumber);
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to list pull requests', message: String(e) });
    }
  }, [repo.owner, repo.name, viewBranch, showToast]);

  const loadPr = useCallback(async () => {
    if (!prNumber) return;
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', owner: repo.owner, repo: repo.name, prNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load PR');
      setPrDetail(data);
      setPendingComments([]);
      const base = data.base || repo.defaultBranch || 'main';
      const cmp = await fetch(`/api/github/compare?${params}&base=${encodeURIComponent(base)}&head=${encodeURIComponent(data.head || viewBranch)}`);
      const cmpData = await cmp.json();
      if (cmp.ok) {
        const map: Record<string, Set<number>> = {};
        for (const f of (cmpData.files || [])) map[f.filename] = diffNewLines(f.patch);
        setCommentable(map[selectedFile || ''] || new Set());
      } else {
        setCommentable(new Set());
      }
    } catch (e) {
      showToast({ type: 'error', title: 'Failed to load PR', message: String(e) });
    }
  }, [prNumber, repo.owner, repo.name, repo.defaultBranch, params, viewBranch, selectedFile, showToast]);

  const openPr = async () => {
    if (!viewBranch) return;
    const base = repo.defaultBranch || 'main';
    if (viewBranch === base) {
      showToast({ type: 'error', title: 'Same branch', message: `Can't open a PR from '${viewBranch}' into itself.` });
      return;
    }
    if (diff.length === 0 && diffMeta && diffMeta.ahead_by === 0) {
      showToast({
        type: 'error',
        title: 'Nothing to merge',
        message: `No changes between '${base}' and '${viewBranch}' — '${viewBranch}' is already up to date with '${base}'. Push new commits to '${viewBranch}' first (check the Changes tab).`
      });
      return;
    }
    const title = window.prompt(`Open a pull request for ${viewBranch}?`, `Merge ${viewBranch} into ${base}`);
    if (!title) return;
    setBusy('openpr');
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', owner: repo.owner, repo: repo.name, title, head: viewBranch, base })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open PR');
      showToast({ type: 'success', title: 'PR opened', message: `PR #${data.prNumber} opened (${data.url})` });
      setPrNumber(data.prNumber);
      loadPrs();
    } catch (e: any) {
      showToast({ type: 'error', title: 'Open PR failed', message: String(e.message || e) });
    } finally {
      setBusy(null);
    }
  };

  const handleReview = async (event: string) => {
    if (!prNumber || !prDetail) return;
    const comments = pendingComments.filter(c => c.body.trim());
    const summary = reviewSummary.trim();
    if (event === 'REQUEST_CHANGES' && !summary) {
      showToast({ type: 'error', title: 'Comment required', message: 'Requesting changes requires a comment explaining what needs to be changed.' });
      return;
    }
    if (event === 'COMMENT' && !summary && comments.length === 0) {
      showToast({ type: 'error', title: 'Comment required', message: 'Add a comment body or an inline line comment.' });
      return;
    }
    setBusy('review');
    try {
      const res = await fetch('/api/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          owner: repo.owner,
          repo: repo.name,
          prNumber,
          reviewEvent: event,
          reviewComment: summary || (comments.length ? 'Inline comments' : undefined),
          commitId: prDetail.headSha,
          comments
        })
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Review failed';
        if (msg.includes('Can not approve your own pull request')) msg = "You can't approve your own PR — GitHub blocks self-approvals. Ask another reviewer to approve.";
        if (msg.includes('You need to leave a comment')) msg = 'Add a comment explaining the requested changes, then retry.';
        if (/422/.test(msg) && !msg.trim()) msg = 'GitHub rejected the review — add a comment body or inline comment.';
        throw new Error(msg);
      }
      setPendingComments([]);
      setReviewSummary('');
      showToast({
        type: 'success',
        title: event === 'APPROVE' ? 'Approved' : event === 'REQUEST_CHANGES' ? 'Changes requested' : 'Comment submitted',
        message: `PR #${prNumber} updated${comments.length ? ` with ${comments.length} inline comment${comments.length === 1 ? '' : 's'}` : ''}.`
      });
      loadPr();
      loadPrs();
    } catch (e: any) {
      showToast({ type: 'error', title: 'Review failed', message: String(e.message || e) });
    } finally {
      setBusy(null);
    }
  };

  const handleMerge = async () => {
    if (!prNumber) return;
    if (!window.confirm(`Merge PR #${prNumber} into ${prDetail?.base || repo.defaultBranch || 'base'}?`)) return;
    setBusy('merge');
    try {
      const res = await fetch('/api/github/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, repo: repo.name, prNumber, method: 'merge' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed');
      showToast({ type: 'success', title: 'Merged', message: `PR #${prNumber} merged into ${prDetail?.base || repo.defaultBranch}.` });
      loadPr();
      loadPrs();
    } catch (e) {
      showToast({ type: 'error', title: 'Merge failed', message: String(e) });
    } finally {
      setBusy(null);
    }
  };

  const existingComments = useMemo(
    () => (prDetail?.reviewComments || []).filter((c: any) => c.path === selectedFile),
    [prDetail?.reviewComments, selectedFile]
  );

  const startComment = (line: number) => {
    if (!selectedFile || !canReview || !prNumber || !prDetail || prDetail.state !== 'open') return;
    setCommentComposer({ path: selectedFile, line });
    setCommentText('');
  };

  const saveComment = (line: number) => {
    if (!selectedFile || !commentText.trim()) return;
    setPendingComments(prev => [...prev, { id: `draft-${Date.now()}`, path: selectedFile, line, body: commentText.trim() }]);
    setCommentComposer(null);
    setCommentText('');
  };

  const removeComment = (id: string) => {
    setPendingComments(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo.id]);

  useEffect(() => {
    if (!ready || !viewBranch) return;
    loadTree();
    loadCommits();
    loadDiff();
    loadPrs();
    setSelectedFile(null);
    setFileContent(null);
    setFileSize(undefined);
    setExpanded(new Set());
    setPrNumber(null);
    setPrDetail(null);
    setPendingComments([]);
    setCommentable(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewBranch, ready]);

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile);
  }, [selectedFile, loadFile]);

  useEffect(() => {
    if (prNumber) loadPr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prNumber, selectedFile]);

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

  const { fileCount, dirCount } = useMemo(() => {
    return tree ? { fileCount: countFiles(tree, 'file'), dirCount: countFiles(tree, 'dir') } : { fileCount: 0, dirCount: 0 };
  }, [tree]);

  const toggleDir = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const renderTree = (nodes: TreeNode[] | null, depth = 0, guides: boolean[] = []) => {
    if (!nodes || nodes.length === 0) {
      return <p className="px-3 py-3 text-xs text-[#64748b]">{treeLoading ? 'Loading files...' : 'No files'}</p>;
    }
    return nodes.map((node, i) => {
      const isLast = i === nodes.length - 1;
      const isDir = node.type === 'dir';
      const isOpen = isDir && expanded.has(node.path);
      const isActive = !isDir && selectedFile === node.path;
      const { Icon, color } = isDir ? { Icon: isOpen ? FolderOpen : Folder, color: '#fbbf24' } : fileMeta(node);

      return (
        <React.Fragment key={node.path}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => (isDir ? toggleDir(node.path) : (setSelectedFile(node.path), setTab('code')))}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isDir ? toggleDir(node.path) : (setSelectedFile(node.path), setTab('code')); } }}
            className={`group relative flex items-center h-[26px] cursor-pointer select-none transition-colors ${
              isActive ? 'bg-[rgba(34,197,94,0.12)]' : 'hover:bg-[rgba(255,255,255,0.04)]'
            }`}
          >
            {isActive && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#22C55E]" />}
            {guides.map((gd, k) => {
              const isCorner = k === guides.length - 1;
              const drawVertical = isCorner ? (gd || !isLast) : gd;
              return (
                <span
                  key={k}
                  className="relative shrink-0 self-stretch"
                  style={{ width: GUIDE_W }}
                >
                  {drawVertical && (
                    <span className="absolute left-0 top-0 bottom-0 w-px bg-[rgba(148,163,184,0.18)]" />
                  )}
                  {isCorner && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-[rgba(148,163,184,0.25)]" />
                  )}
                </span>
              );
            })}
            <span className="flex items-center gap-1.5 mr-2 min-w-0">
              {isDir ? (
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 text-[#64748b] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <Icon className="w-4 h-4 shrink-0" style={{ color }} />
              <span className={`truncate text-[13px] leading-none ${isActive ? 'text-[#22C55E] font-medium' : 'text-[#CBD5E1] group-hover:text-[#F8FAFC]'}`}>
                {node.name}
              </span>
            </span>
          </div>
          {isDir && isOpen && renderTree(node.children || [], depth + 1, [...guides, !isLast])}
        </React.Fragment>
      );
    });
  };

  const tabs: { id: BrowserTab; label: string; icon: any }[] = [
    { id: 'code', label: 'Code', icon: Github },
    { id: 'commits', label: 'Commits', icon: GitCommit },
    { id: 'changes', label: 'Changes', icon: GitCompareArrows }
  ];

  const reviewOpen = !!prNumber && prDetail?.state === 'open';
  const commentableLine = (n: number) => reviewOpen && canReview && commentable.has(n);

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

      {/* PR review bar */}
      {(canReview || canMerge) && (
        <div className="border border-[rgba(34,197,94,0.1)] rounded-lg bg-[#0F172A] p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[#8b5cf6]">
              <GitPullRequest className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">Code Review</span>
            </div>
            {prs.length > 0 ? (
              <select
                value={prNumber || ''}
                onChange={e => { setPrNumber(e.target.value ? Number(e.target.value) : null); setPrDetail(null); setPendingComments([]); }}
                className="flex-1 min-w-[220px] bg-[#020617] border border-[rgba(34,197,94,0.2)] text-[#F8FAFC] text-xs px-2 py-1.5 rounded outline-none"
              >
                <option value="">Select pull request…</option>
                {prs.map((p: any) => (
                  <option key={p.prNumber} value={p.prNumber}>#{p.prNumber} {p.title} ({p.head})</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[#94A3B8]">No open PRs. Open one to review code inline and merge from here.</span>
            )}
            {prNumber && prDetail && (
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                  prDetail.state === 'open' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]'
                  : prDetail.state === 'merged' ? 'bg-[rgba(139,92,246,0.15)] text-[#8b5cf6]'
                  : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                }`}>
                  {prDetail.state}
                </span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                  prDetail.reviewState === 'approved' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                  : prDetail.reviewState === 'changes_requested' ? 'bg-[rgba(239,68,68,0.15)] text-[#ef4444]'
                  : 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                }`}>
                  {prDetail.reviewState || 'pending'}
                </span>
                {prDetail.url && (
                  <a href={prDetail.url} target="_blank" rel="noreferrer" className="text-[#22C55E] hover:opacity-80 text-xs flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    View on GitHub
                  </a>
                )}
              </div>
            )}
            <button
              onClick={openPr}
              disabled={!viewBranch || busy === 'openpr'}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs bg-[rgba(34,197,94,0.12)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.2)] rounded cursor-pointer disabled:opacity-50"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              {busy === 'openpr' ? 'Opening…' : 'Open PR'}
            </button>
          </div>

          {reviewOpen && (canReview || canMerge) && (
            <div className="pt-2 border-t border-[rgba(34,197,94,0.1)] space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                {pendingComments.length > 0 ? (
                  <span className="text-[#22C55E]">
                    {pendingComments.length} inline comment{pendingComments.length === 1 ? '' : 's'} ready — submit with a review below
                  </span>
                ) : (
                  <span>Click a changed line in the viewer to add an inline comment.</span>
                )}
                {prDetail.headSha && <span className="ml-auto font-mono text-[#64748b]">{prDetail.headSha.slice(0, 7)}</span>}
              </div>
              <textarea
                value={reviewSummary}
                onChange={e => setReviewSummary(e.target.value)}
                placeholder="Review summary (optional)…"
                rows={2}
                className="w-full px-3 py-2 bg-[#020617] border border-[rgba(34,197,94,0.2)] text-xs text-[#F8FAFC] rounded resize-none outline-none placeholder:text-[#475569]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleReview('COMMENT')}
                  disabled={busy === 'review'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] border border-[#94A3B8]/30 text-[#CBD5E1] text-sm font-medium hover:bg-[#1E293B] rounded cursor-pointer disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  {busy === 'review' ? 'Submitting…' : 'Comment'}
                </button>
                {canReview && (
                  <button
                    onClick={() => handleReview('APPROVE')}
                    disabled={busy === 'review'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981] text-[#020617] text-sm font-medium hover:bg-[#059669] rounded cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Review
                  </button>
                )}
                {canReview && (
                  <button
                    onClick={() => handleReview('REQUEST_CHANGES')}
                    disabled={busy === 'review'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ef4444] text-white text-sm font-medium hover:bg-[#dc2626] rounded cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Request Changes
                  </button>
                )}
                {canMerge && (
                  <button
                    onClick={handleMerge}
                    disabled={busy === 'merge' || prDetail.state === 'merged'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5cf6] text-white text-sm font-medium hover:bg-[#7c3aed] rounded cursor-pointer disabled:opacity-50"
                    title={prDetail.reviewState === 'approved' ? 'Merge this PR' : `Review not yet approved (${prDetail.reviewState}) — merge anyway?`}
                  >
                    <GitPullRequest className="w-4 h-4" />
                    {busy === 'merge' ? 'Merging…' : prDetail.state === 'merged' ? 'Merged' : 'Merge PR'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded cursor-pointer transition-colors ${tab === t.id ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
        <button
          onClick={() => { loadTree(); loadCommits(); loadDiff(); loadPrs(); }}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-[#94A3B8] hover:text-[#22C55E] ml-auto cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CODE TAB */}
      {tab === 'code' && (
        <div className="grid grid-cols-[300px_1fr] border border-[rgba(34,197,94,0.1)] rounded-lg overflow-hidden bg-[#0F172A] h-[540px]">
          {/* Sidebar: file tree */}
          <div className="border-r border-[rgba(34,197,94,0.1)] flex flex-col min-h-0 overflow-hidden">
            <div className="px-2.5 pt-2 pb-1.5 space-y-1.5 border-b border-[rgba(34,197,94,0.1)]">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Explorer</span>
                <span className="text-[10px] text-[#64748b]">{fileCount} files · {dirCount} dirs</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#020617] border border-[rgba(34,197,94,0.15)] rounded">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search files..."
                  className="flex-1 bg-transparent text-xs text-[#F8FAFC] outline-none placeholder:text-[#475569]"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-[#64748b] hover:text-[#F8FAFC] cursor-pointer" title="Clear search">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1.5 overscroll-contain [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#475569]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
              {treeLoading && !tree ? (
                <div className="flex items-center gap-2 p-3 text-xs text-[#94A3B8]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />
                  Fetching repo tree...
                </div>
              ) : filteredTree === null ? (
                <p className="text-xs text-[#94A3B8] p-3">Loading...</p>
              ) : filteredTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
                  <Search className="w-8 h-8 text-[#334155]" />
                  <p className="text-xs text-[#64748b]">No files match "{search}"</p>
                </div>
              ) : (
                renderTree(filteredTree)
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[rgba(34,197,94,0.1)] text-[10px] text-[#64748b]">
              <GitBranch className="w-3 h-3 text-[#22C55E]" />
              <span className="font-mono truncate">{viewBranch}</span>
            </div>
          </div>

          {/* Viewer */}
          <div className="bg-[#020617] overflow-auto relative">
            {selectedFile ? (
              fileLoading ? (
                <div className="flex items-center gap-2 p-4 text-sm text-[#94A3B8]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />
                  Loading {selectedFile}...
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[rgba(34,197,94,0.1)] text-xs text-[#94A3B8] sticky top-0 bg-[#0F172A] z-10">
                    <span className="font-mono truncate">{selectedFile}</span>
                    <span className="text-[10px] text-[#475569] shrink-0">
                      {selectedFile.split('.').pop()?.toUpperCase()}{fileSize ? ` · ${formatBytes(fileSize)}` : ''}
                    </span>
                    {reviewOpen && canReview && (
                      <span className="flex items-center gap-1 text-[#22C55E] shrink-0">
                        <MessageSquarePlus className="w-3 h-3" />
                        Click a changed line to comment
                      </span>
                    )}
                    <a href={`https://github.com/${repo.owner}/${repo.name}/blob/${viewBranch}/${selectedFile}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#22C55E] hover:opacity-80 ml-auto shrink-0">
                      <ExternalLink className="w-3 h-3" />
                      View on GitHub
                    </a>
                  </div>
                  <div className="flex-1">
                    {(fileContent || '').split('\n').map((line, i) => {
                      const num = i + 1;
                      const existing = existingComments.filter((c: any) => c.line === num);
                      const pending = pendingComments.filter(c => c.path === selectedFile && c.line === num);
                      const composing = commentComposer?.path === selectedFile && commentComposer.line === num;
                      const clickable = commentableLine(num);
                      const hasComments = existing.length > 0 || pending.length > 0;
                      return (
                        <div key={num} className={hasComments ? 'bg-[rgba(250,204,21,0.04)]' : ''}>
                          <div
                            onClick={() => clickable && startComment(num)}
                            className={`group flex items-start hover:bg-[rgba(255,255,255,0.03)] ${clickable ? 'cursor-pointer' : ''}`}
                          >
                            <span className={`w-10 shrink-0 text-right pr-3 select-none py-px text-xs leading-5 font-mono ${hasComments ? 'text-[#facc15]' : 'text-[#334155]'} group-hover:text-[#94A3B8]`}>
                              {hasComments && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#facc15] mr-2 align-middle" />}
                              {num}
                            </span>
                            <span className="flex-1 whitespace-pre text-[12px] leading-5 py-px font-mono text-[#CBD5E1]" style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                              {line || '\u00A0'}
                            </span>
                            {clickable && !composing && (
                              <span className="opacity-0 group-hover:opacity-100 px-2 pt-px text-[#22C55E]">
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>

                          {existing.map((c: any) => (
                            <div key={c.id} className="ml-10 mr-4 mb-1 bg-[#0F172A] border border-[rgba(250,204,21,0.15)] rounded p-2 text-xs">
                              <div className="flex items-center gap-2 text-[#facc15]">
                                <MessageSquare className="w-3 h-3" />
                                <span className="font-medium">{c.author}</span>
                                <span className="text-[#64748b]">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                              </div>
                              <p className="text-[#CBD5E1] mt-1 whitespace-pre-wrap">{c.body}</p>
                            </div>
                          ))}

                          {pending.map(c => (
                            <div key={c.id} className="ml-10 mr-4 mb-1 bg-[#0F172A] border border-[rgba(34,197,94,0.25)] rounded p-2 text-xs">
                              <div className="flex items-center gap-2 text-[#22C55E]">
                                <MessageSquare className="w-3 h-3" />
                                <span className="font-medium">You</span>
                                <span className="text-[#64748b]">pending · line {c.line}</span>
                                <button onClick={() => removeComment(c.id)} className="ml-auto text-[#94A3B8] hover:text-[#ef4444] cursor-pointer">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[#CBD5E1] mt-1 whitespace-pre-wrap">{c.body}</p>
                            </div>
                          ))}

                          {composing && (
                            <div className="ml-10 mr-4 mb-1 bg-[#0F172A] border border-[rgba(34,197,94,0.4)] rounded p-2">
                              <textarea
                                autoFocus
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                rows={2}
                                placeholder={`Comment on line ${num}…`}
                                className="w-full bg-transparent text-xs text-[#F8FAFC] outline-none resize-none placeholder:text-[#475569]"
                              />
                              <div className="flex items-center justify-end gap-2 mt-1">
                                <button
                                  onClick={() => setCommentComposer(null)}
                                  className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveComment(num)}
                                  disabled={!commentText.trim()}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-[#22C55E] text-[#020617] font-medium rounded cursor-pointer disabled:opacity-40"
                                >
                                  <Send className="w-3 h-3" />
                                  Add to review
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[#475569]">
                <div className="w-14 h-14 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] rounded-lg flex items-center justify-center">
                  <FileSearch className="w-7 h-7 text-[#22C55E]" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#94A3B8] font-medium">Select a file</p>
                  <p className="text-xs text-[#64748b] mt-1">Pick a file from the explorer to view its source</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMITS TAB */}
      {tab === 'commits' && (
        <div className="h-[540px] overflow-auto border border-[rgba(34,197,94,0.1)] rounded-lg bg-[#020617] p-2">
          {commitsLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[#94A3B8]">
              <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />
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
                <div key={c.sha} className="flex gap-3 p-3 bg-[#0F172A] border border-[rgba(34,197,94,0.1)] rounded-lg">
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
        <div className="h-[540px] overflow-auto border border-[rgba(34,197,94,0.1)] rounded-lg bg-[#020617]">
          {diffLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[#94A3B8]">
              <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />
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
                <div key={f.filename} className="border border-[rgba(34,197,94,0.1)] rounded-lg overflow-hidden">
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
                        let bg = '';
                        if (line.startsWith('+')) bg = 'bg-[rgba(34,197,94,0.08)]';
                        else if (line.startsWith('-')) bg = 'bg-[rgba(255,59,92,0.08)]';
                        else if (line.startsWith('@@')) bg = 'bg-[rgba(139,92,246,0.08)]';
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