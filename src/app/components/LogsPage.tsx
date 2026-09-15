import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { LogLevel, LogSource } from '../../utils/logger';
import {
  AlertTriangle, AlertOctagon, Info, Bug, Search, Trash2, CheckCircle, Copy, RefreshCw, Download, Filter, ChevronDown, X, Clock
} from 'lucide-react';
import { format } from 'date-fns';

type LogDoc = {
  id: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: string;
  stack?: string;
  route?: string;
  userName?: string;
  userEmail?: string;
  createdAt?: Date;
  resolved?: boolean;
};

function safeDate(v: any): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

const levelMeta: Record<LogLevel, { label: string; icon: any; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', icon: AlertOctagon, bg: 'bg-[rgba(239,68,68,0.15)]', text: 'text-[#ef4444]', border: 'border-[#ef4444]/30' },
  error: { label: 'Error', icon: AlertTriangle, bg: 'bg-[rgba(255,59,92,0.12)]', text: 'text-[#7C3AED]', border: 'border-[#7C3AED]/25' },
  warn: { label: 'Warn', icon: AlertTriangle, bg: 'bg-[rgba(245,158,11,0.12)]', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/25' },
  info: { label: 'Info', icon: Info, bg: 'bg-[rgba(124,58,237,0.10)]', text: 'text-[#7C3AED]', border: 'border-[#7C3AED]/20' },
  debug: { label: 'Debug', icon: Bug, bg: 'bg-[rgba(100,116,139,0.12)]', text: 'text-muted-foreground', border: 'border-[#64748b]/20' }
};

export function LogsPage() {
  const [logs, setLogs] = useState<LogDoc[]>([]);
  const [live, setLive] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<LogSource | 'all'>('all');
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | '1h' | '24h' | '7d'>('all');
  const [showResolved, setShowResolved] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'systemLogs'), orderBy('createdAt', 'desc'), limit(500));
    const unsub = onSnapshot(q, snap => {
      const rows: LogDoc[] = snap.docs.map(d => {
        const data: any = d.data();
        return {
          id: d.id,
          level: data.level || 'info',
          source: data.source || 'general',
          message: data.message || '',
          details: data.details,
          stack: data.stack,
          route: data.route,
          userName: data.userName,
          userEmail: data.userEmail,
          createdAt: safeDate(data.createdAt),
          resolved: !!data.resolved
        };
      });
      setLogs(rows);
      setLoading(false);
    }, err => {
      console.warn('[LogsPage] snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return logs.filter(l => {
      if (!showResolved && l.resolved) return false;
      if (levelFilter !== 'all' && l.level !== levelFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (timeFilter !== 'all') {
        const t = l.createdAt?.getTime() || 0;
        const age = now - t;
        if (timeFilter === '1h' && age > 3600_000) return false;
        if (timeFilter === '24h' && age > 86400_000) return false;
        if (timeFilter === '7d' && age > 7 * 86400_000) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const hay = `${l.message} ${l.details || ''} ${l.stack || ''} ${l.route || ''} ${l.source}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [logs, levelFilter, sourceFilter, timeFilter, search, showResolved]);

  // stats
  const stats = useMemo(() => {
    const last24 = logs.filter(l => l.createdAt && Date.now() - l.createdAt.getTime() < 86400_000);
    return {
      total: logs.length,
      shown: filtered.length,
      errors24: last24.filter(l => l.level === 'error' || l.level === 'critical').length,
      warns24: last24.filter(l => l.level === 'warn').length,
      unresolved: logs.filter(l => !l.resolved && (l.level === 'error' || l.level === 'critical')).length
    };
  }, [logs, filtered]);

  const copyDetails = async (l: LogDoc) => {
    const text = JSON.stringify({ message: l.message, source: l.source, level: l.level, route: l.route, details: l.details, stack: l.stack, at: l.createdAt?.toISOString() }, null, 2);
    await navigator.clipboard.writeText(text);
  };

  const toggleResolved = async (l: LogDoc) => {
    await updateDoc(doc(db, 'systemLogs', l.id), { resolved: !l.resolved } as any);
  };

  const clearResolved = async () => {
    if (!confirm('Delete all resolved logs?')) return;
    const q = query(collection(db, 'systemLogs'), orderBy('createdAt', 'desc'), limit(500));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let n = 0;
    snap.forEach(d => {
      if (d.data().resolved) {
        batch.delete(d.ref);
        n++;
      }
    });
    if (n > 0) await batch.commit();
  };

  const clearAll = async () => {
    if (!confirm('Delete ALL logs? This cannot be undone.')) return;
    const snap = await getDocs(query(collection(db, 'systemLogs')));
    const batch = writeBatch(db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  const exportCsv = () => {
    const header = ['time','level','source','message','route','user','resolved'];
    const rows = filtered.map(l => [
      l.createdAt ? format(l.createdAt, 'yyyy-MM-dd HH:mm:ss') : '',
      l.level, l.source, `"${(l.message || '').replace(/"/g, '""')}"`, l.route || '', l.userEmail || l.userName || '', l.resolved ? 'yes' : 'no'
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `simpli-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
          <p className="text-muted-foreground mt-1">
            {stats.shown} of {stats.total} logs · {stats.errors24} errors (24h) · {stats.unresolved} unresolved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-[rgba(124,58,237,0.12)] text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} className="accent-[#7C3AED]" />
            <RefreshCw className={`w-4 h-4 ${live ? 'text-[#7C3AED] animate-spin' : 'text-muted-foreground'}`} />
            Live
          </label>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[rgba(124,58,237,0.12)] text-sm text-foreground hover:border-[#7C3AED]/30">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={clearResolved} className="px-3 py-2 bg-white border border-[rgba(124,58,237,0.12)] text-sm text-muted-foreground hover:text-foreground">
            Clear resolved
          </button>
          <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(255,59,92,0.12)] border border-[#7C3AED]/25 text-sm text-[#7C3AED]">
            <Trash2 className="w-4 h-4" /> Clear all
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, sub: `${filtered.length} shown` },
          { label: 'Errors (24h)', value: stats.errors24, sub: 'error + critical', tone: stats.errors24 > 0 ? 'text-[#7C3AED]' : 'text-[#7C3AED]' },
          { label: 'Warnings (24h)', value: stats.warns24, sub: 'warn', tone: stats.warns24 > 0 ? 'text-[#f59e0b]' : 'text-muted-foreground' },
          { label: 'Unresolved', value: stats.unresolved, sub: 'needs attention', tone: stats.unresolved > 0 ? 'text-[#ef4444]' : 'text-muted-foreground' }
        ].map(s => (
          <div key={s.label} className="bg-[#0F172A] border border-[rgba(124,58,237,0.1)] p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tone || 'text-foreground'}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-[#0F172A] border border-[rgba(124,58,237,0.1)]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as any)} className="bg-white border border-[rgba(124,58,237,0.12)] text-foreground text-sm px-3 py-2">
            <option value="all">All levels</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)} className="bg-white border border-[rgba(124,58,237,0.12)] text-foreground text-sm px-3 py-2">
            <option value="all">All sources</option>
            {(['email','github','api','firestore','auth','ui','workflow','report','system','task','defect','action-point','general'] as const).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={timeFilter} onChange={e => setTimeFilter(e.target.value as any)} className="bg-white border border-[rgba(124,58,237,0.12)] text-foreground text-sm px-3 py-2">
            <option value="all">All time</option>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground ml-2">
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="accent-[#7C3AED]" />
            Resolved
          </label>
        </div>
        <div className="flex-1 min-w-[220px] max-w-md ml-auto relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search message, details, route…"
            className="w-full pl-9 pr-9 py-2 bg-white border border-[rgba(124,58,237,0.12)] text-foreground text-sm placeholder:text-muted-foreground focus:border-[#7C3AED]/40 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && <div className="p-8 text-center text-muted-foreground">Loading logs…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center bg-[#0F172A] border border-[rgba(124,58,237,0.1)]">
            <p className="text-muted-foreground">No logs match your filters.</p>
            <p className="text-xs text-muted-foreground mt-2">Logs are written by the app on errors, email failures, GitHub/API issues, and unhandled exceptions.</p>
          </div>
        )}
        {filtered.map(l => {
          const meta = levelMeta[l.level] || levelMeta.info;
          const Icon = meta.icon;
          const isExpanded = expanded === l.id;
          return (
            <div key={l.id} className={`bg-[#0F172A] border ${l.resolved ? 'border-[rgba(124,58,237,0.15)] opacity-75' : meta.border} overflow-hidden`}>
              <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-[rgba(124,58,237,0.05)]"
                onClick={() => setExpanded(isExpanded ? null : l.id)}
              >
                <span className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${meta.bg} ${meta.text}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 ${meta.bg} ${meta.text}`}>{meta.label}</span>
                    <span className="text-xs px-2 py-0.5 bg-white text-muted-foreground border border-[rgba(124,58,237,0.08)]">{l.source}</span>
                    {l.route && <span className="text-xs text-muted-foreground truncate max-w-[220px]">{l.route}</span>}
                    {l.resolved && <span className="text-xs px-2 py-0.5 bg-[rgba(124,58,237,0.12)] text-[#7C3AED] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> resolved</span>}
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {l.createdAt ? format(l.createdAt, 'MMM d, HH:mm:ss') : '—'}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1.5 break-words">{l.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {l.userName || l.userEmail ? `${l.userName || ''}${l.userName && l.userEmail ? ' · ' : ''}${l.userEmail || ''} · ` : ''}
                    {l.details ? `${l.details.slice(0, 140)}${l.details.length > 140 ? '…' : ''}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => copyDetails(l)} title="Copy" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.06)]">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleResolved(l)} title={l.resolved ? 'Mark unresolved' : 'Mark resolved'} className={`p-1.5 ${l.resolved ? 'text-muted-foreground' : 'text-[#7C3AED]'} hover:bg-[rgba(255,255,255,0.06)]`}>
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteDoc(doc(db, 'systemLogs', l.id))} title="Delete" className="p-1.5 text-[#7C3AED] hover:bg-[rgba(124,58,237,0.1)]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-[rgba(124,58,237,0.06)] bg-[#020617]/40">
                  {l.details && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Details</p>
                      <pre className="text-xs text-[#CBD5E1] bg-white border border-[rgba(124,58,237,0.08)] p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">{l.details}</pre>
                    </div>
                  )}
                  {l.stack && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Stack</p>
                      <pre className="text-xs text-[#f59e0b] bg-white border border-[rgba(245,158,11,0.15)] p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">{l.stack}</pre>
                    </div>
                  )}
                  {!l.details && !l.stack && <p className="text-xs text-muted-foreground mt-3">No additional context.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[#475569] mt-4">
        Tip: The app logs email failures (Gmail 535), GitHub API errors, Firestore issues, and any unhandled UI exceptions here. Keep this page live while testing.
      </p>
    </div>
  );
}
