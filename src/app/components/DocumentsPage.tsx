import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  Upload,
  Search,
  Grid3X3,
  List,
  File,
  Image,
  Code,
  Table,
  Video,
  Archive,
  Calendar,
  MoreHorizontal,
  Download,
  Folder,
  Loader,
} from 'lucide-react';
import { GoogleDrivePicker } from './GoogleDrivePicker';

type FileType = 'all' | 'document' | 'image' | 'code' | 'spreadsheet' | 'archive' | 'other';
type ViewMode = 'grid' | 'list';

export function DocumentsPage() {
  const { apps, appDocuments, addAppDocument } = useApp();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileType>('all');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string; mimeType: string; webViewLink?: string; size?: string; modifiedTime?: string }[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(apps[0]?.id || '');
  const [uploadingCentral, setUploadingCentral] = useState(false);
  const centralInputRef = useRef<HTMLInputElement>(null);

  const effectiveAppId = selectedAppId || apps[0]?.id || '';
  const effectiveAppName = apps.find(a => a.id === effectiveAppId)?.name || effectiveAppId;

  const driveMapped = driveFiles.map(df => ({
    id: df.id,
    name: df.name,
    type: df.mimeType?.includes('image') ? 'image' as const : df.mimeType?.includes('pdf') || df.mimeType?.includes('word') ? 'document' as const : df.mimeType?.includes('sheet') || df.mimeType?.includes('excel') ? 'spreadsheet' as const : 'document' as const,
    size: df.size ? `${(parseInt(df.size, 10) / 1024).toFixed(1)} KB` : '-',
    date: df.modifiedTime ? new Date(df.modifiedTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    appId: apps[0]?.id || 'drive',
    webViewLink: df.webViewLink || `https://drive.google.com/file/d/${df.id}/view`,
  }));

  const appMapped = appDocuments.map(doc => ({
    id: doc.id,
    name: doc.name || doc.fileName,
    type: doc.fileType?.includes('image') ? 'image' as const : doc.fileType?.includes('pdf') || doc.fileType?.includes('word') ? 'document' as const : doc.fileType?.includes('sheet') || doc.fileType?.includes('excel') ? 'spreadsheet' as const : 'document' as const,
    size: doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '-',
    date: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : '-',
    appId: doc.appId,
    webViewLink: (doc as any).fileUrl,
  }));

  const allFiles = [...appMapped, ...driveMapped];

  const handleDriveSelect = (files: { id: string; name: string; mimeType: string; webViewLink?: string; size?: string; modifiedTime?: string }[]) => {
    setDriveFiles(prev => {
      const existing = new Set(prev.map(f => f.id));
      const fresh = files.filter(f => !existing.has(f.id));
      return [...prev, ...fresh];
    });
    setShowDrivePicker(false);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const uploadCentral = async (file: File, appId: string, appName: string): Promise<string> => {
    const contentBase64 = await fileToBase64(file);
    const res = await fetch('/api/drive?action=upload-central', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appName, fileName: file.name, mimeType: file.type || 'application/octet-stream', contentBase64 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Central upload failed');
    return data.file?.webViewLink || data.webViewLink || `https://drive.google.com/file/d/${data.file?.id}/view`;
  };

  const handleCentralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!effectiveAppId) {
      showToast({ type: 'error', title: 'Select an app', message: 'Please select an application to upload to.' });
      return;
    }
    if (!currentUser) return;
    setUploadingCentral(true);
    try {
      const webViewLink = await uploadCentral(file, effectiveAppId, effectiveAppName);
      await addAppDocument({
        appId: effectiveAppId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        fileUrl: webViewLink,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name || 'Unknown',
        version: '1.0'
      });
      showToast({ type: 'success', title: 'Uploaded to Drive', message: `${file.name} uploaded to Simpli/${effectiveAppName}.` });
    } catch (err: any) {
      const msg = err?.message || 'Upload failed';
      if (msg.includes('Central Drive not configured')) {
        showToast({ type: 'error', title: 'Central Drive not configured', message: 'Configure GOOGLE_DRIVE_REFRESH_TOKEN or use Import from my Drive.' });
      } else {
        showToast({ type: 'error', title: 'Upload failed', message: msg });
      }
    } finally {
      setUploadingCentral(false);
      if (centralInputRef.current) centralInputRef.current.value = '';
    }
  };

  const filteredFiles = allFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-5 h-5 text-[#787774]" />;
      case 'image': return <Image className="w-5 h-5 text-[#787774]" />;
      case 'code': return <Code className="w-5 h-5 text-[#787774]" />;
      case 'spreadsheet': return <Table className="w-5 h-5 text-[#787774]" />;
      case 'video': return <Video className="w-5 h-5 text-[#787774]" />;
      case 'archive': return <Archive className="w-5 h-5 text-[#787774]" />;
      default: return <File className="w-5 h-5 text-[#787774]" />;
    }
  };

  return (
    <div className="bg-[#FFFFFF] max-w-[900px] mx-auto p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#37352F] leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Documents & Files</h1>
          <p className="text-sm text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{allFiles.length} files across {apps.length} projects</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={effectiveAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] text-sm focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] cursor-pointer transition-colors duration-150"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {apps.map(app => (
              <option key={app.id} value={app.id}>{app.name}</option>
            ))}
          </select>
          <input ref={centralInputRef} type="file" className="hidden" onChange={handleCentralUpload} />
          <button onClick={() => setShowDrivePicker(!showDrivePicker)} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E9E9E7] text-[#37352F] font-medium text-sm hover:bg-[#F7F7F5] rounded-[6px] transition-colors duration-150 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Folder className="w-4 h-4 text-[#787774]" />
            {showDrivePicker ? 'Close Drive' : 'Import from my Drive'}
          </button>
          <button onClick={() => centralInputRef.current?.click()} disabled={uploadingCentral} className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1a6fc7] disabled:opacity-50 rounded-[6px] transition-colors duration-150 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
            {uploadingCentral ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingCentral ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {showDrivePicker && (
        <div className="mb-6">
          <GoogleDrivePicker onSelect={handleDriveSelect} onClose={() => setShowDrivePicker(false)} />
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E0E0DE] text-[#37352F] placeholder:text-[#9B9A97] rounded-[6px] text-sm focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150"
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FileType)}
          className="px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] text-sm focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] cursor-pointer transition-colors duration-150"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <option value="all">All Types</option>
          <option value="document">Documents</option>
          <option value="image">Images</option>
          <option value="code">Code</option>
          <option value="spreadsheet">Spreadsheets</option>
          <option value="archive">Archives</option>
          <option value="video">Videos</option>
        </select>
        <div className="flex items-center bg-white border border-[#E9E9E7] rounded-[6px] p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-[6px] transition-colors duration-150 cursor-pointer ${viewMode === 'grid' ? 'bg-[#37352F] text-white' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[6px] transition-colors duration-150 cursor-pointer ${viewMode === 'list' ? 'bg-[#37352F] text-white' : 'text-[#787774] hover:bg-[#F7F7F5]'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="bg-white border border-[#E9E9E7] rounded-lg p-12 text-center">
          <FileText className="w-10 h-10 text-[#9B9A97] mx-auto mb-3" />
          <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No files found</p>
          <p className="text-xs text-[#9B9A97] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Try adjusting search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map(file => (
            <div key={file.id} onClick={() => (file as any).webViewLink && window.open((file as any).webViewLink, '_blank')} className="bg-white border border-[#E9E9E7] rounded-lg p-4 hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
                  {getFileIcon(file.type)}
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition p-1 text-[#787774] hover:text-[#37352F] rounded-md hover:bg-white border border-transparent hover:border-[#E9E9E7]">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#37352F] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{file.name}</p>
                <p className="text-xs text-[#9B9A97] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>{file.size}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <Calendar className="w-3 h-3" />
                  {file.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E9E9E7] bg-white">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#787774] uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>File</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#787774] uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#787774] uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>Size</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-[#787774] uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-[#787774] uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E9E7]">
              {filteredFiles.map(file => (
                <tr key={file.id} onClick={() => (file as any).webViewLink && window.open((file as any).webViewLink, '_blank')} className="hover:bg-[#F7F7F5] transition-colors duration-150 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-[#F7F7F5] rounded-md border border-[#E9E9E7]">
                        {getFileIcon(file.type)}
                      </div>
                      <p className="text-sm font-medium text-[#37352F] truncate max-w-[240px]" style={{ fontFamily: 'Inter, sans-serif' }}>{file.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#787774] capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>{file.type}</td>
                  <td className="px-4 py-3 text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{file.size}</td>
                  <td className="px-4 py-3 text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>{file.date}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-md transition-colors duration-150">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
