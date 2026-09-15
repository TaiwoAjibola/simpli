import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Folder,
  FolderOpen,
  Download,
  Upload,
  Search,
  Grid3X3,
  List,
  File,
  Image,
  Code,
  Table,
  Music,
  Video,
  Archive,
  Lock,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  Filter
} from 'lucide-react';

type FileType = 'all' | 'document' | 'image' | 'code' | 'spreadsheet' | 'archive' | 'other';
type ViewMode = 'grid' | 'list';

export function DocumentsPage() {
  const { apps, appDocuments } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileType>('all');

  const allFiles = appDocuments.map(doc => ({
    id: doc.id,
    name: doc.name || doc.fileName,
    type: doc.fileType?.includes('image') ? 'image' as const : doc.fileType?.includes('pdf') || doc.fileType?.includes('word') ? 'document' as const : doc.fileType?.includes('sheet') || doc.fileType?.includes('excel') ? 'spreadsheet' as const : 'document' as const,
    size: doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '-',
    date: doc.createdAt ? new Date(doc.createdAt).toISOString().split('T')[0] : '-',
    appId: doc.appId,
  }));

  const filteredFiles = allFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-5 h-5 text-[#7C3AED]" />;
      case 'image': return <Image className="w-5 h-5 text-[#7C3AED]" />;
      case 'code': return <Code className="w-5 h-5 text-[#3B82F6]" />;
      case 'spreadsheet': return <Table className="w-5 h-5 text-[#F59E0B]" />;
      case 'video': return <Video className="w-5 h-5 text-[#8b5cf6]" />;
      case 'archive': return <Archive className="w-5 h-5 text-foreground" />;
      default: return <File className="w-5 h-5 text-foreground" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents & Files</h1>
          <p className="text-muted-foreground mt-1">{allFiles.length} files across {apps.length} projects</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium text-sm hover:bg-[#6D28D9] rounded-xl">
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E9D5FF] text-foreground rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FileType)}
          className="px-4 py-2 bg-white border border-[#E9D5FF] text-foreground rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
        >
          <option value="all">All Types</option>
          <option value="document">Documents</option>
          <option value="image">Images</option>
          <option value="code">Code</option>
          <option value="spreadsheet">Spreadsheets</option>
          <option value="archive">Archives</option>
          <option value="video">Videos</option>
        </select>
        <div className="flex items-center bg-white border border-[#E9D5FF] rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-[#7C3AED] text-white' : 'text-foreground'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-[#7C3AED] text-white' : 'text-foreground'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map(file => (
            <div key={file.id} className="glass-card rounded-xl p-5 hover:border-[#7C3AED]/30 transition cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 bg-[rgba(124,58,237,0.08)] rounded-lg">
                  {getFileIcon(file.type)}
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition p-1 text-foreground hover:text-[#7C3AED]">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{file.size}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {file.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E9D5FF] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E9D5FF]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">File</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Size</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9D5FF]">
              {filteredFiles.map(file => (
                <tr key={file.id} className="hover:bg-[#F5F3FF] transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[rgba(124,58,237,0.08)] rounded-lg">
                        {getFileIcon(file.type)}
                      </div>
                      <p className="font-medium text-foreground">{file.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground capitalize">{file.type}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{file.size}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{file.date}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-foreground hover:text-[#7C3AED] transition">
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