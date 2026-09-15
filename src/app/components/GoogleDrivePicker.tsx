import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  File,
  FileText,
  Image,
  Search,
  ArrowLeft,
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
      <div className="bg-[#FFFFFF] border border-[#E9E9E7] rounded-[8px] p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[#37352F]">Google Drive</h3>
          <button onClick={onClose} className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-center py-8">
          <span className="w-12 h-12 rounded-[8px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center mx-auto mb-3">
            <Folder className="w-6 h-6 text-[#787774]" />
          </span>
          <p className="text-[14px] text-[#787774] mb-4">Connect your Google Drive to browse and attach files.</p>
          <button onClick={handleAuth} className="inline-flex items-center gap-2 px-4 py-[6px] bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer">
            <LogIn className="w-4 h-4" />
            Sign in with Google
          </button>
          {error && <p className="text-[12px] text-[#EB5757] mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E9E9E7] rounded-[8px] p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {currentFolder && (
            <button onClick={handleFolderBack} className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h3 className="text-[14px] font-semibold text-[#37352F]">Google Drive</h3>
        </div>
        <button onClick={onClose} className="p-1 text-[#787774] hover:text-[#37352F] hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-1 mb-3 text-[12px] text-[#787774] flex-wrap">
        {folderPath.map((folder, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="mx-1 text-[#9B9A97]">/</span>}
            <button
              onClick={() => handleFolderNavigate(i)}
              className={`hover:text-[#37352F] hover:underline transition-colors duration-150 cursor-pointer ${i === folderPath.length - 1 ? 'text-[#37352F] font-medium' : 'text-[#787774]'}`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full pl-9 pr-3 py-[6px] bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-[14px] outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:shadow-[0_0_0_1px_#2383E2] transition-colors duration-150"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#2383E2] animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-[14px] text-[#EB5757]">{error}</p>
          <button onClick={() => fetchFiles(currentFolder)} className="text-[12px] text-[#2383E2] hover:underline mt-2 cursor-pointer">Retry</button>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8">
          <span className="w-10 h-10 rounded-[6px] bg-[#F7F7F5] border border-[#E9E9E7] flex items-center justify-center mx-auto mb-2">
            <Folder className="w-5 h-5 text-[#9B9A97]" />
          </span>
          <p className="text-[14px] text-[#787774]">No files found</p>
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
          {files.map(file => {
            const Icon = getFileIcon(file.mimeType);
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const isSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                onDoubleClick={() => handleDoubleClick(file)}
                onClick={() => {
                  if (isFolder) handleFolderOpen(file);
                  else toggleFileSelect(file.id);
                }}
                className={`flex items-center gap-3 p-2 rounded-[6px] cursor-pointer border transition-colors duration-150 ${isSelected ? 'bg-[#E8F0FE] border-[#2383E2]' : 'bg-white border-[#E9E9E7] hover:bg-[#F7F7F5]'}`}
              >
                <span className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 border ${isFolder ? 'bg-[#FFF8E6] border-[#F0D9A8]' : 'bg-[#F7F7F5] border-[#E9E9E7]'}`}>
                  <Icon className={`w-4 h-4 ${isFolder ? 'text-[#C9A045]' : 'text-[#787774]'}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[#37352F] truncate">{file.name}</p>
                  <p className="text-[11px] text-[#787774]">{formatSize(file.size)}</p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#2383E2] shrink-0" />}
              </div>
            );
          })}
        </div>
      )}

      {selectedFiles.size > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E9E9E7]">
          <span className="text-[12px] text-[#787774]">{selectedFiles.size} file(s) selected</span>
          <button onClick={handleConfirm} className="px-3 py-[6px] bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1A6FC0] transition-colors duration-150 cursor-pointer">
            Add to Project
          </button>
        </div>
      )}
    </div>
  );
}
