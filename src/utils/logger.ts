import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
export type LogSource =
  | 'email'
  | 'github'
  | 'firestore'
  | 'auth'
  | 'ui'
  | 'api'
  | 'workflow'
  | 'report'
  | 'system'
  | 'action-point'
  | 'defect'
  | 'task'
  | 'general';

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: string;
  stack?: string;
  route?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  createdAt: any;
  resolved?: boolean;
}

function getRoute(): string {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return '';
  }
}

function getUserMeta(): { userId?: string; userName?: string; userEmail?: string } {
  try {
    const raw = localStorage.getItem('simpli_current_user');
    if (raw) {
      const u = JSON.parse(raw);
      return { userId: u.id, userName: u.name, userEmail: u.email };
    }
  } catch {}
  return {};
}

function safeStringify(v: any, max = 4000): string | undefined {
  if (v == null) return undefined;
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    return s.length > max ? s.slice(0, max) + ' …(truncated)' : s;
  } catch {
    return String(v).slice(0, max);
  }
}

let lastLogKey = '';
let lastLogTime = 0;
let isLogging = false;

export async function log(
  level: LogLevel,
  source: LogSource,
  message: string,
  opts?: { details?: any; stack?: string; route?: string }
): Promise<void> {
  if (isLogging) return; // prevent recursion when logger itself triggers console.error
  const key = `${level}:${source}:${message}`;
  const now = Date.now();
  // dedupe spam: same message within 3s
  if (key === lastLogKey && now - lastLogTime < 3000) return;
  lastLogKey = key;
  lastLogTime = now;

  isLogging = true;
  const consoleFn =
    level === 'error' || level === 'critical'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'debug'
          ? console.debug
          : console.log;
  try {
    consoleFn(`[${level.toUpperCase()}][${source}] ${message}`, opts?.details ?? '');
  } catch {}
  isLogging = false;

  const { userId, userName, userEmail } = getUserMeta();
  const detailsStr = safeStringify(opts?.details);
  const stackStr = opts?.stack?.slice(0, 4000);
  const routeStr = opts?.route ?? getRoute();
  // Firestore rejects undefined — build payload without undefined fields
  const payload: Record<string, any> = {
    level,
    source,
    message: message.slice(0, 800),
    route: routeStr,
    createdAt: serverTimestamp(),
    resolved: false
  };
  if (detailsStr !== undefined) payload.details = detailsStr;
  if (stackStr !== undefined) payload.stack = stackStr;
  if (userId) payload.userId = userId;
  if (userName) payload.userName = userName;
  if (userEmail) payload.userEmail = userEmail;

  try {
    await addDoc(collection(db, 'systemLogs'), payload);
  } catch (e: any) {
    // never throw — logging must not break the app; use warn without re-entering logger
    try { console.warn('[logger] Failed to persist log', e?.message); } catch {}
  }
}

export const logger = {
  debug: (source: LogSource, msg: string, details?: any) => log('debug', source, msg, { details }),
  info: (source: LogSource, msg: string, details?: any) => log('info', source, msg, { details }),
  warn: (source: LogSource, msg: string, details?: any) => log('warn', source, msg, { details }),
  error: (source: LogSource, msg: string, details?: any, stack?: string) => log('error', source, msg, { details, stack }),
  critical: (source: LogSource, msg: string, details?: any, stack?: string) => log('critical', source, msg, { details, stack })
};

// Attach global handlers once — call from App root
export function attachGlobalLogHandlers(): () => void {
  const onError = (event: ErrorEvent) => {
    log('error', 'ui', event.message || 'Unhandled error', {
      details: { filename: event.filename, lineno: event.lineno, colno: event.colno },
      stack: event.error?.stack
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason: any = event.reason;
    const msg = reason?.message || String(reason) || 'Unhandled promise rejection';
    log('error', 'ui', msg, { details: reason, stack: reason?.stack });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // wrap console.error to also log — guarded against recursion and internal logger messages
  const origError = console.error;
  let wrapping = false;
  console.error = (...args: any[]) => {
    origError(...args);
    if (wrapping || isLogging) return;
    wrapping = true;
    try {
      const msg = args.map(a => (typeof a === 'string' ? a : a?.message || JSON.stringify(a))).join(' ').slice(0, 500);
      if (msg.includes('[logger]') || msg.includes('[Email] API error')) {
        wrapping = false;
        return;
      }
      // only log unexpected UI errors, not every console.error
      if (msg.startsWith('[ERROR]') || msg.startsWith('[WARN]')) {
        wrapping = false;
        return;
      }
      log('error', 'ui', msg, { details: args[1], stack: args[0]?.stack });
    } catch {}
    wrapping = false;
  };

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    console.error = origError;
  };
}
