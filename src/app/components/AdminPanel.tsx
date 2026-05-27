import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Shield,
  Bell,
  Plus,
  Edit2,
  Trash2,
  Mail,
  UserCircle,
  Check,
  X,
  Eye,
  EyeOff,
  Copy,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Employee, Role, NotificationRule, Permission, NOTIFICATION_VARIABLES } from '../types';
import { syncEmployeesToFirebaseAuth } from '../../utils/syncEmployees';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'notifications'>('employees');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Admin Panel</h1>
        <p className="text-[#6b6b80]">Manage employees, roles, and system settings</p>
      </div>

      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
        <div className="border-b border-[rgba(0,229,255,0.1)]">
          <div className="flex gap-1 p-2">
            <TabButton
              active={activeTab === 'employees'}
              onClick={() => setActiveTab('employees')}
              icon={Users}
              label="Employees"
            />
            <TabButton
              active={activeTab === 'roles'}
              onClick={() => setActiveTab('roles')}
              icon={Shield}
              label="Roles & Permissions"
            />
            <TabButton
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
              icon={Bell}
              label="Notifications"
            />
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'employees' && <EmployeesTab />}
          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 transition ${
        active
          ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] font-medium'
          : 'text-[#6b6b80] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.02)]'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function EmployeesTab() {
  const { employees, roles, addEmployee, updateEmployee, deleteEmployee } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: { id: string; email: string; error: string }[] } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    const result = await syncEmployeesToFirebaseAuth();
    setSyncResult(result);
    setSyncing(false);
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await updateEmployee(editingId, formData);
        setEditingId(null);
      } else {
        await addEmployee(formData);
      }
      setFormData({ name: '', email: '', password: '', roleId: '' });
      setShowAddForm(false);
      setShowPassword(false);
    } catch (error: any) {
      setSubmitError(error?.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      password: employee.password,
      roleId: employee.roleId
    });
    setEditingId(employee.id);
    setShowAddForm(true);
    setShowPassword(false);
  };

  const handleDelete = (employeeId: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      deleteEmployee(employeeId);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#f0f0f5]">Team Members</h2>
          <p className="text-sm text-[#6b6b80] mt-1">
            {employees.filter(e => e.firebaseUid).length} of {employees.length} users have Firebase Auth accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] text-[#0a0a0f] font-medium hover:bg-[#7c4fe0] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Auth Accounts
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setShowPassword(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {syncResult && (
        <div className={`mb-6 p-4 border ${
          syncResult.failed.length > 0 ? 'bg-[rgba(245,158,11,0.05)] border-[rgba(245,158,11,0.2)]' : 'bg-[rgba(16,185,129,0.05)] border-[rgba(16,185,129,0.2)]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className={`w-5 h-5 ${syncResult.failed.length > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`} />
            <h3 className="font-semibold text-[#f0f0f5]">Sync Complete</h3>
          </div>
          <p className="text-sm text-[#f0f0f5]">
            ✓ {syncResult.success} account{syncResult.success !== 1 ? 's' : ''} created
            {syncResult.failed.length > 0 && ` · ✗ ${syncResult.failed.length} failed`}
          </p>
          {syncResult.failed.length > 0 && (
            <div className="mt-2 space-y-1">
              {syncResult.failed.map(f => (
                <p key={f.id} className="text-xs text-[#f59e0b]">
                  {f.email}: {f.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b80] hover:text-[#f0f0f5] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Role</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                required
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {submitError && (
            <p className="text-sm text-[#ff3b5c]">{submitError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (editingId ? 'Update' : 'Create') + ' Employee'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setShowPassword(false);
                setSubmitError(null);
                setFormData({ name: '', email: '', password: '', roleId: '' });
              }}
              className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {employees.map((employee) => {
          const role = roles.find((r) => r.id === employee.roleId);
          return (
            <div
              key={employee.id}
              className="flex items-center gap-4 p-4 border border-[rgba(0,229,255,0.1)] hover:border-[rgba(0,229,255,0.3)] transition"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#00e5ff] to-[#8b5cf6] flex items-center justify-center text-[#0a0a0f] font-bold text-lg">
                {employee.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#f0f0f5]">{employee.name}</h3>
                <p className="text-sm text-[#6b6b80]">{employee.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[rgba(0,229,255,0.1)] text-[#00e5ff] text-sm font-medium border border-[rgba(0,229,255,0.2)]">
                  {role?.name}
                </span>
                {employee.firebaseUid ? (
                  <span className="px-2 py-1 text-xs font-medium bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auth Ready
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]">
                    No Auth Account
                  </span>
                )}
                <button
                  onClick={() => handleEdit(employee)}
                  className="p-2 text-[#6b6b80] hover:bg-[rgba(255,255,255,0.02)] transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(employee.id)}
                  className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {employees.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-[#6b6b80] mx-auto mb-4" />
          <p className="text-[#6b6b80] mb-4">No team members yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
          >
            Add Your First Employee
          </button>
        </div>
      )}
    </div>
  );
}

function RolesTab() {
  const { roles, addRole, updateRole, deleteRole, employees } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as Permission[]
  });

  const allPermissions: Permission[] = [
    'create_app',
    'create_goal',
    'assign_tasks',
    'manage_users',
    'configure_notifications',
    'approve_tasks',
    'view_all_apps',
    'view_assigned_only',
    'report_defects',
    'manage_defects',
    'verify_defects',
    'manage_action_points'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateRole(editingId, formData);
      setEditingId(null);
    } else {
      addRole(formData);
    }
    setFormData({ name: '', permissions: [] });
    setShowAddForm(false);
  };

  const handleEdit = (role: Role) => {
    setFormData({
      name: role.name,
      permissions: [...role.permissions]
    });
    setEditingId(role.id);
    setShowAddForm(true);
  };

  const handleDelete = (roleId: string) => {
    const roleEmployees = employees.filter(e => {
      const role = roles.find(r => r.id === roleId);
      return role && e.roleId === role.id;
    });
    if (roleEmployees.length > 0) {
      if (!confirm(`This role is assigned to ${roleEmployees.length} employee(s). Deleting it will leave them without a role. Continue?`)) {
        return;
      }
    } else if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }
    deleteRole(roleId);
  };

  const togglePermission = (permission: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#f0f0f5]">Roles & Permissions</h2>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({ name: '', permissions: [] });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Role Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f0f0f5] mb-3">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {allPermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 p-3 border border-[rgba(0,229,255,0.1)] cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="w-4 h-4 accent-[#00e5ff]"
                  />
                  <span className="text-sm text-[#f0f0f5]">
                    {permission.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
            >
              {editingId ? 'Update' : 'Create'} Role
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({ name: '', permissions: [] });
              }}
              className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {roles.map((role) => {
          const employeeCount = employees.filter(e => e.roleId === role.id).length;
          return (
            <div key={role.id} className="p-5 border border-[rgba(0,229,255,0.1)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-[#f0f0f5]">{role.name}</h3>
                  {employeeCount > 0 && (
                    <span className="text-xs text-[#6b6b80] bg-[#1a1a2e] px-2 py-1 border border-[rgba(0,229,255,0.1)]">
                      {employeeCount} employee{employeeCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6b6b80] mr-2">{role.permissions.length} permissions</span>
                  <button
                    onClick={() => handleEdit(role)}
                    className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="px-3 py-1 bg-[rgba(16,185,129,0.1)] text-[#10b981] text-xs font-medium border border-[rgba(16,185,129,0.2)]"
                  >
                    {permission.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { notificationRules, addNotificationRule, updateNotificationRule, deleteNotificationRule, roles, employees } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    event: 'task_ready_for_testing' as NotificationRule['event'],
    subject: '',
    message: '',
    enabled: true,
    primaryRecipients: [] as NotificationRule['primaryRecipients'],
    ccRecipients: [] as NotificationRule['ccRecipients']
  });
  const [activeVariableCategory, setActiveVariableCategory] = useState<keyof typeof NOTIFICATION_VARIABLES>('task');
  const [activeField, setActiveField] = useState<'subject' | 'message'>('message');

  const primaryOptions: { type: NotificationRule['primaryRecipients'][number]['type']; label: string }[] = [
    { type: 'assigned_user', label: 'Assigned User (Auto)' },
    { type: 'approver', label: 'Approver (Auto)' },
    { type: 'creator', label: 'Task Creator (Auto)' },
    { type: 'role', label: 'Specific Role' },
    { type: 'user', label: 'Specific User' }
  ];

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      [activeField]: prev[activeField] + variable
    }));
  };

  const handleToggle = (ruleId: string, enabled: boolean) => {
    updateNotificationRule(ruleId, { enabled });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await updateNotificationRule(editingId, formData);
        setEditingId(null);
      } else {
        await addNotificationRule(formData);
      }
      setFormData({
        event: 'task_ready_for_testing',
        subject: '',
        message: '',
        enabled: true,
        primaryRecipients: [],
        ccRecipients: []
      });
      setShowForm(false);
    } catch (error: any) {
      setSubmitError(error?.message || 'Failed to save notification rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rule: NotificationRule) => {
    const safePrimary = rule.primaryRecipients || (rule as any).recipients?.map((r: any) => ({
      type: r.type === 'role' || r.type === 'user' ? 'role' : 'assigned_user',
      id: r.id
    })).filter((r: any) => r.id) || [];

    setFormData({
      event: rule.event || 'task_ready_for_testing',
      subject: rule.subject || '',
      message: rule.message || '',
      enabled: rule.enabled !== undefined ? rule.enabled : true,
      primaryRecipients: safePrimary,
      ccRecipients: rule.ccRecipients || []
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this notification rule?')) {
      deleteNotificationRule(ruleId);
    }
  };

  const togglePrimaryRecipient = (type: NotificationRule['primaryRecipients'][number]['type'], id?: string) => {
    setFormData(prev => {
      const exists = prev.primaryRecipients.some(r => r.type === type && r.id === id);
      if (exists) {
        return {
          ...prev,
          primaryRecipients: prev.primaryRecipients.filter(r => !(r.type === type && r.id === id))
        };
      } else {
        return {
          ...prev,
          primaryRecipients: [...prev.primaryRecipients, { type, id }]
        };
      }
    });
  };

  const toggleCcRecipient = (type: 'role' | 'user', id: string) => {
    setFormData(prev => {
      const exists = prev.ccRecipients.some(r => r.type === type && r.id === id);
      if (exists) {
        return {
          ...prev,
          ccRecipients: prev.ccRecipients.filter(r => !(r.type === type && r.id === id))
        };
      } else {
        return {
          ...prev,
          ccRecipients: [...prev.ccRecipients, { type, id }]
        };
      }
    });
  };

  const getPrimaryLabel = (type: string) => {
    const labels: Record<string, string> = {
      assigned_user: 'Assigned User',
      approver: 'Approver',
      creator: 'Task Creator',
      role: 'Role',
      user: 'User'
    };
    return labels[type] || type;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#f0f0f5] mb-2">Notification Settings</h2>
          <p className="text-sm text-[#6b6b80]">
            Configure notifications for system events
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              event: 'task_ready_for_testing',
              subject: '',
              message: '',
              enabled: true,
              primaryRecipients: [],
              ccRecipients: []
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
        >
          <Plus className="w-4 h-4" />
          New Notification Rule
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)]">
          <h3 className="font-semibold text-[#f0f0f5] mb-4">
            {editingId ? 'Edit' : 'Create'} Notification Rule
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">Event</label>
              <select
                value={formData.event}
                onChange={(e) =>
                  setFormData({ ...formData, event: e.target.value as NotificationRule['event'] })
                }
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                required
              >
                <option value="task_started">Task Started (In Progress)</option>
                <option value="task_ready_for_testing">Task Ready for Testing</option>
                <option value="task_sent_for_approval">Task Sent for Approval</option>
                <option value="task_approved">Task Approved</option>
                <option value="task_rejected">Task Rejected (Sent Back)</option>
                <option value="task_blocked">Task Blocked</option>
                <option value="subtask_completed">Subtask Completed</option>
                <option value="task_assigned">Task Assigned</option>
                <option value="subtask_assigned">Subtask Assigned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                onFocus={() => setActiveField('subject')}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                placeholder="e.g., Task Completed: {task_name}"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">
                Email Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                onFocus={() => setActiveField('message')}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                rows={4}
                placeholder="Enter the email message body..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-3">Variable Library</label>
              <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-4">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {(Object.keys(NOTIFICATION_VARIABLES) as Array<keyof typeof NOTIFICATION_VARIABLES>).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveVariableCategory(category)}
                      className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                        activeVariableCategory === category
                          ? 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.3)]'
                          : 'text-[#6b6b80] hover:text-[#f0f0f5] border border-transparent'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-[#00e5ff]" />
                    <p className="text-xs text-[#6b6b80]">
                      Click to insert into <span className="text-[#00e5ff] font-medium">{activeField === 'subject' ? 'Subject' : 'Message'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {NOTIFICATION_VARIABLES[activeVariableCategory].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(variable)}
                        className="group flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] hover:border-[#00e5ff] transition text-sm font-mono text-[#00e5ff]"
                        title={`Insert ${variable}`}
                      >
                        {variable}
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-3">Primary Recipients (To)</label>
              <div className="p-4 bg-[#12121a] border border-[rgba(0,229,255,0.1)] space-y-3">
                <p className="text-xs text-[#6b6b80]">Auto-filled recipients based on task context. At least one required.</p>
                <div className="flex flex-wrap gap-2">
                  {primaryOptions.map((option) => {
                    const isSelected = formData.primaryRecipients.some(r => r.type === option.type);
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => togglePrimaryRecipient(option.type)}
                        className={`px-3 py-1.5 text-sm border-2 transition ${
                          isSelected
                            ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff] font-medium'
                            : 'bg-[#1a1a2e] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {formData.primaryRecipients.some(r => r.type === 'role') && (
                  <div className="pt-2 border-t border-[rgba(0,229,255,0.1)]">
                    <p className="text-xs font-medium text-[#6b6b80] mb-2">Select Role</p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => {
                        const isSelected = formData.primaryRecipients.some(r => r.type === 'role' && r.id === role.id);
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => togglePrimaryRecipient('role', role.id)}
                            className={`px-3 py-1.5 text-sm border-2 transition ${
                              isSelected
                                ? 'bg-[rgba(139,92,246,0.1)] border-[#8b5cf6] text-[#8b5cf6] font-medium'
                                : 'bg-[#1a1a2e] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
                            }`}
                          >
                            {role.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.primaryRecipients.some(r => r.type === 'user') && (
                  <div className="pt-2 border-t border-[rgba(0,229,255,0.1)]">
                    <p className="text-xs font-medium text-[#6b6b80] mb-2">Select User</p>
                    <div className="flex flex-wrap gap-2">
                      {employees.map((employee) => {
                        const isSelected = formData.primaryRecipients.some(r => r.type === 'user' && r.id === employee.id);
                        return (
                          <button
                            key={employee.id}
                            type="button"
                            onClick={() => togglePrimaryRecipient('user', employee.id)}
                            className={`px-3 py-1.5 text-sm border-2 transition ${
                              isSelected
                                ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff] font-medium'
                                : 'bg-[#1a1a2e] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
                            }`}
                          >
                            {employee.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-3">CC Recipients</label>
              <div className="p-4 bg-[#12121a] border border-[rgba(0,229,255,0.1)] space-y-3">
                <p className="text-xs text-[#6b6b80]">Optional. Add users or roles for visibility.</p>
                <div>
                  <p className="text-xs font-medium text-[#6b6b80] mb-2">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const isSelected = formData.ccRecipients.some(r => r.type === 'role' && r.id === role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleCcRecipient('role', role.id)}
                          className={`px-3 py-1.5 text-sm border-2 transition ${
                            isSelected
                              ? 'bg-[rgba(139,92,246,0.1)] border-[#8b5cf6] text-[#8b5cf6] font-medium'
                              : 'bg-[#1a1a2e] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
                          }`}
                        >
                          {role.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#6b6b80] mb-2">Specific Users</p>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((employee) => {
                      const isSelected = formData.ccRecipients.some(r => r.type === 'user' && r.id === employee.id);
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => toggleCcRecipient('user', employee.id)}
                          className={`px-3 py-1.5 text-sm border-2 transition ${
                            isSelected
                              ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff] font-medium'
                              : 'bg-[#1a1a2e] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
                          }`}
                        >
                          {employee.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 accent-[#00e5ff]"
              />
              <label htmlFor="enabled" className="text-sm text-[#f0f0f5]">
                Enable this notification rule
              </label>
            </div>

            {submitError && (
              <p className="text-sm text-[#ff3b5c]">{submitError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (editingId ? 'Update' : 'Create') + ' Rule'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setSubmitError(null);
                  setFormData({
                    event: 'task_ready_for_testing',
                    subject: '',
                    message: '',
                    enabled: true,
                    primaryRecipients: [],
                    ccRecipients: []
                  });
                }}
                className="px-4 py-2 bg-[#1a1a2e] text-[#f0f0f5] border border-[rgba(0,229,255,0.1)] hover:bg-[#1e1e2a]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {notificationRules.map((rule) => {
          const primaryRecipients = rule.primaryRecipients || [];
          const ccRecipients = rule.ccRecipients || [];

          return (
            <div
              key={rule.id}
              className="p-5 border border-[rgba(0,229,255,0.1)] bg-[#12121a]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#f0f0f5]">
                      {rule.event.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => handleToggle(rule.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1e1e2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff]"></div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-[#6b6b80] mb-1">Subject:</p>
                      <p className="text-sm text-[#f0f0f5]">{rule.subject}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-[#6b6b80] mb-1">Message:</p>
                      <p className="text-sm text-[#f0f0f5] whitespace-pre-line">{rule.message}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-[#6b6b80] mb-2">To (Primary):</p>
                      <div className="flex flex-wrap gap-2">
                        {primaryRecipients.map((recipient, idx) => {
                          let label = getPrimaryLabel(recipient.type);
                          if (recipient.type === 'role' && recipient.id) {
                            label = roles.find(r => r.id === recipient.id)?.name || label;
                          } else if (recipient.type === 'user' && recipient.id) {
                            label = employees.find(e => e.id === recipient.id)?.name || label;
                          }
                          return (
                            <span
                              key={idx}
                              className="px-3 py-1 text-xs font-medium bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.2)]"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {ccRecipients.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[#6b6b80] mb-2">CC:</p>
                        <div className="flex flex-wrap gap-2">
                          {ccRecipients.map((recipient, idx) => {
                            const label =
                              recipient.type === 'role'
                                ? roles.find(r => r.id === recipient.id)?.name
                                : employees.find(e => e.id === recipient.id)?.name;
                            return (
                              <span
                                key={idx}
                                className="px-3 py-1 text-xs font-medium bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border border-[rgba(139,92,246,0.2)]"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 text-[#00e5ff] hover:bg-[rgba(0,229,255,0.1)] transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {notificationRules.length === 0 && !showForm && (
          <div className="text-center py-12 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
            <Bell className="w-12 h-12 text-[#6b6b80] mx-auto mb-3" />
            <p className="text-[#6b6b80] mb-4">No notification rules configured</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
            >
              Create Your First Rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
