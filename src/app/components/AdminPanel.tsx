import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Shield,
  Bell,
  Plus,
  Edit2,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Copy,
  Info,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Employee, Role, NotificationRule, Permission, NOTIFICATION_VARIABLES } from '../types';
import { syncEmployeesToFirebaseAuth } from '../../utils/syncEmployees';
import { sendEmail } from '../../utils/sendEmail';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'employees' | 'roles' | 'notifications'>('employees');

  return (
    <div className="min-h-screen bg-[#FFFFFF] p-8" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="max-w-[900px] mx-auto">
        <div className="mb-6">
          <h1 className="text-[24px] font-semibold text-[#37352F] tracking-tight">Admin Panel</h1>
          <p className="text-[14px] text-[#787774] mt-1">Manage employees, roles, and system settings</p>
        </div>

        <div className="bg-white border border-[#E9E9E7] rounded-[8px]">
          <div className="border-b border-[#E9E9E7]">
            <div className="flex gap-0 px-2">
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
      className={`flex items-center gap-2 px-4 py-3 text-[14px] border-b-2 transition-colors duration-150 ${
        active
          ? 'border-[#2383E2] text-[#37352F] font-medium'
          : 'border-transparent text-[#787774] hover:text-[#37352F]'
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
          <h2 className="text-[16px] font-semibold text-[#37352F]">Team Members</h2>
          <p className="text-[13px] text-[#787774] mt-1">
            {employees.filter(e => e.firebaseUid).length} of {employees.length} users have Firebase Auth accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] text-[#37352F] text-[13px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Auth Accounts
          </button>
          <button
            onClick={() => { setShowAddForm(!showAddForm); setShowPassword(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#1a6fc0] transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {syncResult && (
        <div className={`mb-6 p-4 border rounded-[8px] ${
          syncResult.failed.length > 0 ? 'bg-[#FBE9E9] border-[#E9E9E7]' : 'bg-[#F7F7F5] border-[#E9E9E7]'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className={`w-5 h-5 ${syncResult.failed.length > 0 ? 'text-[#EB5757]' : 'text-[#2383E2]'}`} />
            <h3 className="font-semibold text-[#37352F] text-[14px]">Sync Complete</h3>
          </div>
          <p className="text-[13px] text-[#37352F]">
            ✓ {syncResult.success} account{syncResult.success !== 1 ? 's' : ''} created
            {syncResult.failed.length > 0 && ` · ✗ ${syncResult.failed.length} failed`}
          </p>
          {syncResult.failed.length > 0 && (
            <div className="mt-2 space-y-1">
              {syncResult.failed.map(f => (
                <p key={f.id} className="text-[12px] text-[#EB5757]">
                  {f.email}: {f.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
                required
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
                required
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787774] hover:text-[#37352F] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Role</label>
              <select
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
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
            <p className="text-[13px] text-[#EB5757]">{submitError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1a6fc0] disabled:opacity-50 transition-colors duration-150"
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
              className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150"
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
              className="flex items-center gap-4 p-4 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150"
            >
              <div className="w-10 h-10 bg-[#E9E9E7] flex items-center justify-center text-[#37352F] font-semibold text-[14px] rounded-[6px]">
                {employee.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-semibold text-[#37352F]">{employee.name}</h3>
                <p className="text-[13px] text-[#787774]">{employee.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#F7F7F5] text-[#37352F] text-[12px] font-medium border border-[#E9E9E7] rounded-[4px]">
                  {role?.name}
                </span>
                {employee.firebaseUid ? (
                  <span className="px-2 py-1 text-[11px] font-medium bg-white text-[#37352F] border border-[#E9E9E7] rounded-[4px] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auth Ready
                  </span>
                ) : (
                  <span className="px-2 py-1 text-[11px] font-medium bg-[#FBE9E9] text-[#EB5757] border border-[#E9E9E7] rounded-[4px]">
                    No Auth Account
                  </span>
                )}
                <button
                  onClick={() => handleEdit(employee)}
                  className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(employee.id)}
                  className="p-2 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {employees.length === 0 && !showAddForm && (
        <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
          <Users className="w-12 h-12 text-[#787774] mx-auto mb-4" />
          <p className="text-[14px] text-[#787774] mb-4">No team members yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1a6fc0]"
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
    'handle_defects',
    'verify_defects',
    'manage_action_points',
    'manage_modules',
    'manage_documents',
    'develop_work',
    'review_code',
    'merge_code',
    'run_qa',
    'manage_repositories',
    'manage_sprints',
    'manage_templates',
    'manage_automations',
    'manage_workflow',
    'view_portfolio'
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
        <h2 className="text-[16px] font-semibold text-[#37352F]">Roles & Permissions</h2>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({ name: '', permissions: [] });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#1a6fc0] transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px] space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Role Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#37352F] mb-3">Permissions</label>
            <div className="grid grid-cols-2 gap-2">
              {allPermissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-center gap-2 p-3 bg-white border border-[#E9E9E7] rounded-[6px] cursor-pointer hover:bg-[#F7F7F5] transition-colors duration-150"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="w-4 h-4 accent-[#2383E2]"
                  />
                  <span className="text-[13px] text-[#37352F]">
                    {permission.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1a6fc0] transition-colors duration-150"
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
              className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {roles.map((role) => {
          const employeeCount = employees.filter(e => e.roleId === role.id).length;
          return (
            <div key={role.id} className="p-5 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-[14px] font-semibold text-[#37352F]">{role.name}</h3>
                  {employeeCount > 0 && (
                    <span className="text-[11px] text-[#787774] bg-[#F7F7F5] px-2 py-1 border border-[#E9E9E7] rounded-[4px]">
                      {employeeCount} employee{employeeCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#787774] mr-2">{role.permissions.length} permissions</span>
                  <button
                    onClick={() => handleEdit(role)}
                    className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"
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
                    className="px-2.5 py-1 bg-[#F7F7F5] text-[#37352F] text-[11px] font-medium border border-[#E9E9E7] rounded-[4px]"
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
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setTestSending(true);
    setTestResult(null);
    const ok = await sendEmail({ to: [testEmail] }, 'Simpli Test Email', '<h1>Test</h1><p>If you see this, email is working.</p>');
    setTestResult(ok ? 'Email sent successfully!' : 'Failed to send email. Check console for details.');
    setTestSending(false);
  };

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
          <h2 className="text-[16px] font-semibold text-[#37352F] mb-1">Notification Settings</h2>
          <p className="text-[13px] text-[#787774]">
            Configure notifications for system events
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {testResult && (
            <span className={`text-[12px] ${testResult.includes('successfully') ? 'text-[#2383E2]' : 'text-[#EB5757]'}`}>
              {testResult}
            </span>
          )}
          <div className="flex items-center gap-2 bg-white border border-[#E9E9E7] rounded-[6px] px-3 py-1.5">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-transparent text-[13px] text-[#37352F] outline-none w-32 lg:w-40 placeholder:text-[#787774]"
            />
            <button
              onClick={handleTestEmail}
              disabled={testSending || !testEmail}
              className="text-[12px] text-[#2383E2] hover:text-[#1a6fc0] disabled:text-[#787774] disabled:cursor-not-allowed transition whitespace-nowrap font-medium"
            >
              {testSending ? 'Sending...' : 'Test Email'}
            </button>
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
          className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[13px] font-medium rounded-[6px] hover:bg-[#1a6fc0] transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
          New Notification Rule
        </button>
      </div>
    </div>

      {showForm && (
        <div className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px]">
          <h3 className="font-semibold text-[#37352F] text-[14px] mb-4">
            {editingId ? 'Edit' : 'Create'} Notification Rule
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Event</label>
              <select
                value={formData.event}
                onChange={(e) =>
                  setFormData({ ...formData, event: e.target.value as NotificationRule['event'] })
                }
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
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
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                onFocus={() => setActiveField('subject')}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
                placeholder="e.g., Task Completed: {task_name}"
                required
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">
                Email Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                onFocus={() => setActiveField('message')}
                className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]"
                rows={4}
                placeholder="Enter the email message body..."
                required
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#37352F] mb-3">Variable Library</label>
              <div className="bg-[#FBFBFA] border border-[#E9E9E7] rounded-[8px] p-4">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {(Object.keys(NOTIFICATION_VARIABLES) as Array<keyof typeof NOTIFICATION_VARIABLES>).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveVariableCategory(category)}
                      className={`px-3 py-1.5 text-[13px] font-medium whitespace-nowrap rounded-[6px] transition-colors duration-150 ${
                        activeVariableCategory === category
                          ? 'bg-[#2383E2] text-white'
                          : 'text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-[#787774]" />
                    <p className="text-[12px] text-[#787774]">
                      Click to insert into <span className="text-[#2383E2] font-medium">{activeField === 'subject' ? 'Subject' : 'Message'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {NOTIFICATION_VARIABLES[activeVariableCategory].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(variable)}
                        className="group flex items-center gap-2 px-3 py-2 bg-white border border-[#E9E9E7] rounded-[6px] hover:border-[#2383E2] hover:bg-[#F7F7F5] transition text-[12px] font-mono text-[#37352F]"
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
              <label className="block text-[14px] font-medium text-[#37352F] mb-3">Primary Recipients (To)</label>
              <div className="p-4 bg-[#FBFBFA] border border-[#E9E9E7] rounded-[8px] space-y-3">
                <p className="text-[12px] text-[#787774]">Auto-filled recipients based on task context. At least one required.</p>
                <div className="flex flex-wrap gap-2">
                  {primaryOptions.map((option) => {
                    const isSelected = formData.primaryRecipients.some(r => r.type === option.type);
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => togglePrimaryRecipient(option.type)}
                        className={`px-3 py-1.5 text-[13px] rounded-[6px] border transition-colors duration-150 ${
                          isSelected
                            ? 'bg-[#2383E2] border-[#2383E2] text-white font-medium'
                            : 'bg-white border-[#E9E9E7] text-[#37352F] hover:border-[#E0E0DE] hover:bg-[#F7F7F5]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {formData.primaryRecipients.some(r => r.type === 'role') && (
                  <div className="pt-2 border-t border-[#E9E9E7]">
                    <p className="text-[12px] font-medium text-[#787774] mb-2">Select Role</p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => {
                        const isSelected = formData.primaryRecipients.some(r => r.type === 'role' && r.id === role.id);
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => togglePrimaryRecipient('role', role.id)}
                            className={`px-3 py-1.5 text-[13px] rounded-[6px] border transition-colors duration-150 ${
                              isSelected
                                ? 'bg-[#2383E2] border-[#2383E2] text-white font-medium'
                                : 'bg-white border-[#E9E9E7] text-[#37352F] hover:border-[#E0E0DE]'
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
                  <div className="pt-2 border-t border-[#E9E9E7]">
                    <p className="text-[12px] font-medium text-[#787774] mb-2">Select User</p>
                    <div className="flex flex-wrap gap-2">
                      {employees.map((employee) => {
                        const isSelected = formData.primaryRecipients.some(r => r.type === 'user' && r.id === employee.id);
                        return (
                          <button
                            key={employee.id}
                            type="button"
                            onClick={() => togglePrimaryRecipient('user', employee.id)}
                            className={`px-3 py-1.5 text-[13px] rounded-[6px] border transition-colors duration-150 ${
                              isSelected
                                ? 'bg-[#2383E2] border-[#2383E2] text-white font-medium'
                                : 'bg-white border-[#E9E9E7] text-[#37352F] hover:border-[#E0E0DE]'
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
              <label className="block text-[14px] font-medium text-[#37352F] mb-3">CC Recipients</label>
              <div className="p-4 bg-[#FBFBFA] border border-[#E9E9E7] rounded-[8px] space-y-3">
                <p className="text-[12px] text-[#787774]">Optional. Add users or roles for visibility.</p>
                <div>
                  <p className="text-[12px] font-medium text-[#787774] mb-2">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const isSelected = formData.ccRecipients.some(r => r.type === 'role' && r.id === role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleCcRecipient('role', role.id)}
                          className={`px-3 py-1.5 text-[13px] rounded-[6px] border transition-colors duration-150 ${
                            isSelected
                              ? 'bg-[#37352F] border-[#37352F] text-white font-medium'
                              : 'bg-white border-[#E9E9E7] text-[#37352F] hover:border-[#E0E0DE]'
                          }`}
                        >
                          {role.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#787774] mb-2">Specific Users</p>
                  <div className="flex flex-wrap gap-2">
                    {employees.map((employee) => {
                      const isSelected = formData.ccRecipients.some(r => r.type === 'user' && r.id === employee.id);
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => toggleCcRecipient('user', employee.id)}
                          className={`px-3 py-1.5 text-[13px] rounded-[6px] border transition-colors duration-150 ${
                            isSelected
                              ? 'bg-[#2383E2] border-[#2383E2] text-white font-medium'
                              : 'bg-white border-[#E9E9E7] text-[#37352F] hover:border-[#E0E0DE]'
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
                className="w-4 h-4 accent-[#2383E2]"
              />
              <label htmlFor="enabled" className="text-[14px] text-[#37352F]">
                Enable this notification rule
              </label>
            </div>

            {submitError && (
              <p className="text-[13px] text-[#EB5757]">{submitError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1a6fc0] disabled:opacity-50 transition-colors duration-150"
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
                className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {notificationRules.map((rule) => {
          const primaryRecipients = rule.primaryRecipients || [];
          const ccRecipients = rule.ccRecipients || [];

          return (
            <div
              key={rule.id}
              className="p-5 bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-colors duration-150"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#37352F] text-[14px]">
                      {rule.event.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => handleToggle(rule.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#E9E9E7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-[#E0E0DE] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2383E2]"></div>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-medium text-[#787774] mb-1 uppercase tracking-wide">Subject:</p>
                      <p className="text-[13px] text-[#37352F]">{rule.subject}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-[#787774] mb-1 uppercase tracking-wide">Message:</p>
                      <p className="text-[13px] text-[#37352F] whitespace-pre-line">{rule.message}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-[#787774] mb-2 uppercase tracking-wide">To (Primary):</p>
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
                              className="px-2.5 py-1 text-[11px] font-medium bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7] rounded-[4px]"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {ccRecipients.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-[#787774] mb-2 uppercase tracking-wide">CC:</p>
                        <div className="flex flex-wrap gap-2">
                          {ccRecipients.map((recipient, idx) => {
                            const label =
                              recipient.type === 'role'
                                ? roles.find(r => r.id === recipient.id)?.name
                                : employees.find(e => e.id === recipient.id)?.name;
                            return (
                              <span
                                key={idx}
                                className="px-2.5 py-1 text-[11px] font-medium bg-white text-[#787774] border border-[#E9E9E7] rounded-[4px]"
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
                    className="p-2 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"
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
          <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
            <Bell className="w-10 h-10 text-[#787774] mx-auto mb-3" />
            <p className="text-[14px] text-[#787774] mb-4">No notification rules configured</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1a6fc0] transition-colors duration-150"
            >
              Create Your First Rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}