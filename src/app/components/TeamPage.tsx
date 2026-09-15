import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Search,
  Filter,
  Grid3X3,
  List,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  Award,
  UserCircle
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export function TeamPage() {
  const { employees, tasks } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || emp.roleId === filterRole;
    return matchesSearch && matchesRole;
  });

  const getTaskCount = (empId: string) => tasks.filter(t => t.assignedTo.includes(empId)).length;
  const getCompletedCount = (empId: string) => tasks.filter(t => t.assignedTo.includes(empId) && (t.status === 'approved' || t.status === 'completed')).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#4C1D95]">Team</h1>
          <p className="text-[#6D28D9] mt-1">{employees.length} team members</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 bg-white border border-[#E9D5FF] text-[#4C1D95] rounded-xl text-sm focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none"
        >
          <option value="all">All Roles</option>
          <option value="developer">Developer</option>
          <option value="designer">Designer</option>
          <option value="pm">Project Manager</option>
          <option value="qa">QA</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map(emp => {
            const taskCount = getTaskCount(emp.id);
            const completedCount = getCompletedCount(emp.id);
            const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
            return (
              <div key={emp.id} className="glass-card rounded-xl p-6 hover:border-[#7C3AED]/30 transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white font-bold rounded-full text-lg">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#4C1D95] truncate">{emp.name}</h3>
                    <p className="text-xs text-[#6D28D9] truncate">{emp.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6D28D9]">Tasks</span>
                    <span className="text-[#4C1D95] font-medium">{taskCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6D28D9]">Completed</span>
                    <span className="text-[#10b981] font-medium">{completedCount}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F5F3FF] rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#7C3AED] to-[#22C55E] rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#E9D5FF] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E9D5FF]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Member</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Tasks</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Completed</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#6D28D9] uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9D5FF]">
              {filteredEmployees.map(emp => {
                const taskCount = getTaskCount(emp.id);
                const completedCount = getCompletedCount(emp.id);
                const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
                return (
                  <tr key={emp.id} className="hover:bg-[#F5F3FF] transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white font-bold rounded-full">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#4C1D95]">{emp.name}</p>
                          <p className="text-xs text-[#6D28D9]">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#6D28D9]">{emp.roleId || 'Member'}</td>
                    <td className="px-6 py-4 text-sm text-[#4C1D95]">{taskCount}</td>
                    <td className="px-6 py-4 text-sm text-[#10b981]">{completedCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[#F5F3FF] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#7C3AED] to-[#22C55E] rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#6D28D9]">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}