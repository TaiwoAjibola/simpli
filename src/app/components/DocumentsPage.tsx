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
  const { apps, goals, tasks } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FileType>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('root');

  const allFiles = [
    { id: '1', name: 'project-plan.pdf', type: 'document', size: '2.4 MB', date: '2025-01-15', appId: apps[0]?.id },
    { id: '2', name: 'requirements.docx', type: 'document', size: '1.1 MB', date: '2025-01-10', appId: apps[0]?.id },
    { id: '3', name: 'design-mockups.fig', type: 'image', size: '15.7 MB', date: '2025-01-12', appId: apps[0]?.id },
    { id: '4', name: 'api-spec.yaml', type: 'code', size: '340 KB', date: '2025-01-08', appId: apps[0]?.id },
    { id: '5', name: 'database-schema.sql', type: 'code', size: '89 KB', date: '2025-01-05', appId: apps[0]?.id },
    { id: '6', name: 'sprint-report.xlsx', type: 'spreadsheet', size: '450 KB', date: '2025-01-20', appId: apps[0]?.id },
    { id: '7', name: 'meeting-notes.mp4', type: 'video', size: '230 MB', date: '2025-01-18', appId: apps[0]?.id },
    { id: '8', name: 'assets.zip', type: 'archive', size: '890 MB', date: '2025-01-01', appId: apps[0]?.id },
  ];

  const filteredFiles = allFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-5 h-5 text-[#DC2626]" />;
      case 'image': return <Image className="w-5 h-5 text-[#22C55E]" />;
      case 'code': return <Code className="w-5 h-5 text-[#3B82F6]" />;
      case 'spreadsheet': return <Table className="w-5 h-5 text-[#F59E0B]" />;
      case 'video': return <Video className="w-5 h-5 text-[#8b5cf6]" />;
      case 'archive': return <Archive className="w-5 h-5 text-[#6D28D9]" />;
      default: return <File className="w-5 h-5 text-[#6D28D9]" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#4C1D95]">Documents</h1>
          <p className="text-[#6D28D9] mt-1">{allFiles.length} files across {apps.length} projects</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium text-sm hover:bg-[#6D28D9] rounded-xl">
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as FileType)}
          className="px-4 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
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
            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-[#7C3AED] text-white' : 'text-[#6D28D9]'}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-[#7C3AED] text-white' : 'text-[#6D28D9]'}`}
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
                <button className="opacity-0 group-hover:opacity-100 transition p-1 text-[#6D28D9] hover:text-[#7C3AED]">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#4C1D95] truncate">{file.name}</p>
                <p className="text-xs text-[#94A3B8] mt-1">{file.size}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-[#94A3B8]">
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">File</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Size</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Actions</th>
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
                      <p className="font-medium text-[#4C1D95]">{file.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6D28D9] capitalize">{file.type}</td>
                  <td className="px-6 py-4 text-sm text-[#4C1D95]">{file.size}</td>
                  <td className="px-6 py-4 text-sm text-[#6D28D9]">{file.date}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-[#6D28D9] hover:text-[#7C3AED] transition">
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