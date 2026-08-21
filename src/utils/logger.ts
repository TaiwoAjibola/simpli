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

export async function log(
  level: LogLevel,
  source: LogSource,
  message: string,
  opts?: { details?: any; stack?: string; route?: string }
): Promise<void> {
  const key = `${level}:${source}:${message}`;
  const now = Date.now();
  // dedupe spam: same message within 3s
  if (key === lastLogKey && now - lastLogTime < 3000) return;
  lastLogKey = key;
  lastLogTime = now;

  const consoleFn =
    level === 'error' || level === 'critical'
      ? console.error
      : level === 'warn'
        ? console.warn
        : level === 'debug'
          ? console.debug
          : console.log;
  consoleFn(`[${level.toUpperCase()}][${source}] ${message}`, opts?.details ?? '');

  const { userId, userName, userEmail } = getUserMeta();
  const payload: Omit<LogEntry, 'id'> = {
    level,
    source,
    message: message.slice(0, 800),
    details: safeStringify(opts?.details),
    stack: opts?.stack?.slice(0, 4000),
    route: opts?.route ?? getRoute(),
    userId,
    userName,
    userEmail,
    createdAt: serverTimestamp(),
    resolved: false
  };

  try {
    await addDoc(collection(db, 'systemLogs'), payload as any);
  } catch (e: any) {
    // never throw — logging must not break the app
    console.warn('[logger] Failed to persist log', e?.message);
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

  // wrap console.error to also log
  const origError = console.error;
  console.error = (...args: any[]) => {
    origError(...args);
    try {
      const msg = args.map(a => (typeof a === 'string' ? a : a?.message || JSON.stringify(a))).join(' ').slice(0, 500);
      if (!msg.includes('[logger]')) log('error', 'ui', msg, { details: args[1], stack: args[0]?.stack });
    } catch {}
  };

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    console.error = origError;
  };
}
