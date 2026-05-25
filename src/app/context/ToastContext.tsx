import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
};

type ToastContextType = {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    if (toast.duration !== 0) {
      setTimeout(() => removeToast(id), toast.duration || 5000);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 border shadow-lg animate-slide-in ${
              toast.type === 'success' ? 'bg-[#0a1a0a] border-[rgba(16,185,129,0.3)]' :
              toast.type === 'error' ? 'bg-[#1a0a0a] border-[rgba(255,59,92,0.3)]' :
              toast.type === 'warning' ? 'bg-[#1a140a] border-[rgba(245,158,11,0.3)]' :
              'bg-[#0a0a1a] border-[rgba(0,229,255,0.3)]'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-[#ff3b5c] flex-shrink-0 mt-0.5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[#00e5ff] flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  toast.type === 'success' ? 'text-[#10b981]' :
                  toast.type === 'error' ? 'text-[#ff3b5c]' :
                  toast.type === 'warning' ? 'text-[#f59e0b]' :
                  'text-[#00e5ff]'
                }`}>
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs text-[#6b6b80] mt-1">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 text-[#6b6b80] hover:text-[#f0f0f5] flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
