import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  File,
  FileText,
  Image,
  Search,
  ArrowLeft,
  ExternalLink,
  Check,
  X,
  Loader2,
  LogIn
} from 'lucide-react';

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
};

type GoogleDrivePickerProps = {
  onSelect: (files: DriveFile[]) => void;
  onClose: () => void;
};

const FILE_ICONS: Record<string, typeof File> = {
  'application/pdf': FileText,
  'image/': Image,
  'folder': Folder,
  'default': File
};

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') return Folder;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf')) return FileText;
  return File;
}

function formatSize(size?: string) {
  if (!size) return '';
  const bytes = parseInt(size, 10);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GoogleDrivePicker({ onSelect, onClose }: GoogleDrivePickerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Drive' }]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async (folderId: string | null, query?: string) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/drive?action=list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken, folder_id: folderId, query })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFiles(data.files || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles(currentFolder, searchQuery || undefined);
    }
  }, [isAuthenticated, currentFolder, searchQuery, fetchFiles]);

  const handleAuth = async () => {
    try {
      const res = await fetch('/api/drive?action=auth-url');
      const data = await res.json();
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleFolderOpen = (folder: DriveFile) => {
    setCurrentFolder(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  const handleFolderBack = () => {
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    setCurrentFolder(newPath[newPath.length - 1].id);
    setSearchQuery('');
  };

  const handleFolderNavigate = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolder(newPath[newPath.length - 1].id);
    setSearchQuery('');
  };

  const toggleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = files.filter(f => selectedFiles.has(f.id));
    onSelect(selected);
  };

  const handleDoubleClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      handleFolderOpen(file);
    } else {
      toggleFileSelect(file.id);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-[#F8FAFC]">Google Drive</h3>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-center py-8">
          <Folder className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <p className="text-[#94A3B8] mb-4">Connect your Google Drive to browse and attach files.</p>
          <button onClick={handleAuth} className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-[#020617] font-medium hover:bg-[#16a34a] mx-auto">
            <LogIn className="w-4 h-4" />
            Sign in with Google
          </button>
          {error && <p className="text-sm text-[#ff3b5c] mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A] border border-[rgba(34,197,94,0.1)] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {currentFolder && (
            <button onClick={handleFolderBack} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h3 className="text-sm font-medium text-[#F8FAFC]">Google Drive</h3>
        </div>
        <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 mb-3 text-xs text-[#94A3B8]">
        {folderPath.map((folder, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="mx-1">/</span>}
            <button
              onClick={() => handleFolderNavigate(i)}
              className={`hover:text-[#22C55E] ${i === folderPath.length - 1 ? 'text-[#F8FAFC] font-medium' : ''}`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full pl-9 pr-3 py-2 bg-[#1E293B] border border-[rgba(34,197,94,0.1)] text-[#F8FAFC] text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#22C55E] animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-[#ff3b5c]">{error}</p>
          <button onClick={() => fetchFiles(currentFolder)} className="text-sm text-[#22C55E] hover:underline mt-2">Retry</button>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8">
          <Folder className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
          <p className="text-sm text-[#94A3B8]">No files found</p>
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {files.map(file => {
            const Icon = getFileIcon(file.mimeType);
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const isSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                onDoubleClick={() => handleDoubleClick(file)}
                onClick={() => !isFolder && toggleFileSelect(file.id)}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  isSelected ? 'bg-[rgba(34,197,94,0.1)]' : 'hover:bg-[rgba(255,255,255,0.02)]'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isFolder ? 'text-[#f59e0b]' : 'text-[#94A3B8]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F8FAFC] truncate">{file.name}</p>
                  <p className="text-[10px] text-[#94A3B8]">{formatSize(file.size)}</p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#22C55E] flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {selectedFiles.size > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(34,197,94,0.1)]">
          <span className="text-xs text-[#94A3B8]">{selectedFiles.size} file(s) selected</span>
          <button onClick={handleConfirm} className="px-3 py-1.5 bg-[#22C55E] text-[#020617] text-sm font-medium hover:bg-[#16a34a]">
            Add to Project
          </button>
        </div>
      )}
    </div>
  );
}
