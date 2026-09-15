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
  critical: { label: 'Critical', icon: AlertOctagon, bg: 'bg-[#FBE9E9]', text: 'text-[#EB5757]', border: 'border-[#E9E9E7]' },
  error: { label: 'Error', icon: AlertTriangle, bg: 'bg-[#FBE9E9]', text: 'text-[#EB5757]', border: 'border-[#E9E9E7]' },
  warn: { label: 'Warn', icon: AlertTriangle, bg: 'bg-[#F7F7F5]', text: 'text-[#787774]', border: 'border-[#E9E9E7]' },
  info: { label: 'Info', icon: Info, bg: 'bg-[#F7F7F5]', text: 'text-[#787774]', border: 'border-[#E9E9E7]' },
  debug: { label: 'Debug', icon: Bug, bg: 'bg-[#F7F7F5]', text: 'text-[#787774]', border: 'border-[#E9E9E7]' }
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
    <div className="min-h-screen bg-[#FFFFFF] p-8" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="max-w-[900px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-[#37352F] tracking-tight">System Logs</h1>
            <p className="text-[14px] text-[#787774] mt-1">
              {stats.shown} of {stats.total} logs · {stats.errors24} errors (24h) · {stats.unresolved} unresolved
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] rounded-[6px] text-[13px] text-[#37352F] cursor-pointer hover:bg-[#F7F7F5] transition-colors duration-150">
              <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} className="accent-[#2383E2]" />
              <RefreshCw className={`w-4 h-4 ${live ? 'text-[#2383E2] animate-spin' : 'text-[#787774]'}`} />
              Live
            </label>
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E9E9E7] rounded-[6px] text-[13px] text-[#37352F] hover:bg-[#F7F7F5] transition-colors duration-150">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={clearResolved} className="px-3 py-2 bg-white border border-[#E9E9E7] rounded-[6px] text-[13px] text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] transition-colors duration-150">
              Clear resolved
            </button>
            <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E9E9E7] rounded-[6px] text-[13px] text-[#EB5757] hover:bg-[#FBE9E9] transition-colors duration-150">
              <Trash2 className="w-4 h-4" /> Clear all
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, sub: `${filtered.length} shown` },
            { label: 'Errors (24h)', value: stats.errors24, sub: 'error + critical', tone: stats.errors24 > 0 ? 'text-[#EB5757]' : 'text-[#37352F]' },
            { label: 'Warnings (24h)', value: stats.warns24, sub: 'warn', tone: stats.warns24 > 0 ? 'text-[#787774]' : 'text-[#787774]' },
            { label: 'Unresolved', value: stats.unresolved, sub: 'needs attention', tone: stats.unresolved > 0 ? 'text-[#EB5757]' : 'text-[#787774]' }
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#E9E9E7] rounded-[8px] p-4">
              <p className="text-[11px] uppercase tracking-wider text-[#787774] font-medium">{s.label}</p>
              <p className={`text-[22px] font-semibold mt-1 ${s.tone || 'text-[#37352F]'}`}>{s.value}</p>
              <p className="text-[12px] text-[#787774] mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#787774]" />
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as any)} className="bg-white border border-[#E0E0DE] text-[#37352F] text-[13px] px-3 py-2 rounded-[6px] focus:outline-none focus:border-[#2383E2]">
              <option value="all">All levels</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)} className="bg-white border border-[#E0E0DE] text-[#37352F] text-[13px] px-3 py-2 rounded-[6px] focus:outline-none focus:border-[#2383E2]">
              <option value="all">All sources</option>
              {(['email','github','api','firestore','auth','ui','workflow','report','system','task','defect','action-point','general'] as const).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={timeFilter} onChange={e => setTimeFilter(e.target.value as any)} className="bg-white border border-[#E0E0DE] text-[#37352F] text-[13px] px-3 py-2 rounded-[6px] focus:outline-none focus:border-[#2383E2]">
              <option value="all">All time</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
            </select>
            <label className="flex items-center gap-1.5 text-[13px] text-[#787774] ml-2">
              <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} className="accent-[#2383E2]" />
              Resolved
            </label>
          </div>
          <div className="flex-1 min-w-[220px] max-w-md ml-auto relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#787774]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search message, details, route…"
              className="w-full pl-9 pr-9 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[13px] rounded-[6px] placeholder:text-[#787774] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#787774] hover:text-[#37352F]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {loading && <div className="p-8 text-center text-[14px] text-[#787774] bg-white border border-[#E9E9E7] rounded-[8px]">Loading logs…</div>}
          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center bg-white border border-[#E9E9E7] rounded-[8px]">
              <p className="text-[14px] text-[#787774]">No logs match your filters.</p>
              <p className="text-[12px] text-[#787774] mt-2">Logs are written by the app on errors, email failures, GitHub/API issues, and unhandled exceptions.</p>
            </div>
          )}
          {filtered.map(l => {
            const meta = levelMeta[l.level] || levelMeta.info;
            const Icon = meta.icon;
            const isExpanded = expanded === l.id;
            return (
              <div key={l.id} className={`bg-white border border-[#E9E9E7] rounded-[8px] overflow-hidden ${l.resolved ? 'opacity-60' : ''} hover:bg-[#F7F7F5] transition-colors duration-150`}>
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : l.id)}
                >
                  <span className={`w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-[6px] ${meta.bg} ${meta.text}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] border border-[#E9E9E7] ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7] rounded-[4px]">{l.source}</span>
                      {l.route && <span className="text-[12px] text-[#787774] truncate max-w-[220px]">{l.route}</span>}
                      {l.resolved && <span className="text-[11px] px-2 py-0.5 bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7] rounded-[4px] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> resolved</span>}
                      <span className="text-[12px] text-[#787774] ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {l.createdAt ? format(l.createdAt, 'MMM d, HH:mm:ss') : '—'}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#37352F] mt-1.5 break-words font-mono leading-relaxed">{l.message}</p>
                    <p className="text-[12px] text-[#787774] mt-1 font-mono">
                      {l.userName || l.userEmail ? `${l.userName || ''}${l.userName && l.userEmail ? ' · ' : ''}${l.userEmail || ''} · ` : ''}
                      {l.details ? `${l.details.slice(0, 140)}${l.details.length > 140 ? '…' : ''}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => copyDetails(l)} title="Copy" className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleResolved(l)} title={l.resolved ? 'Mark unresolved' : 'Mark resolved'} className={`p-1.5 rounded-[4px] border border-transparent hover:bg-white hover:border-[#E9E9E7] transition-colors duration-150 ${l.resolved ? 'text-[#787774]' : 'text-[#2383E2]'}`}>
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteDoc(doc(db, 'systemLogs', l.id))} title="Delete" className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronDown className={`w-4 h-4 text-[#787774] transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-[#E9E9E7] bg-[#FBFBFA]">
                    {l.details && (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-[#787774] mb-1 uppercase tracking-wide">Details</p>
                        <pre className="text-[13px] font-mono text-[#37352F] bg-white border border-[#E9E9E7] rounded-[6px] p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">{l.details}</pre>
                      </div>
                    )}
                    {l.stack && (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-[#787774] mb-1 uppercase tracking-wide">Stack</p>
                        <pre className="text-[13px] font-mono text-[#EB5757] bg-white border border-[#E9E9E7] rounded-[6px] p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">{l.stack}</pre>
                      </div>
                    )}
                    {!l.details && !l.stack && <p className="text-[12px] text-[#787774] mt-3">No additional context.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-[#787774] mt-4">
          Tip: The app logs email failures (Gmail 535), GitHub API errors, Firestore issues, and any unhandled UI exceptions here. Keep this page live while testing.
        </p>
      </div>
    </div>
  );
}