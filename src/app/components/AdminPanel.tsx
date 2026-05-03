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
  EyeOff
} from 'lucide-react';
import { Employee, Role, NotificationRule, Permission } from '../types';

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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateEmployee(editingId, formData);
      setEditingId(null);
    } else {
      addEmployee(formData);
    }
    setFormData({ name: '', email: '', password: '', roleId: '' });
    setShowAddForm(false);
    setShowPassword(false);
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
        <h2 className="text-xl font-bold text-[#f0f0f5]">Team Members</h2>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setShowPassword(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0] transition"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

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
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
            >
              {editingId ? 'Update' : 'Create'} Employee
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingId(null);
                setShowPassword(false);
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
    'view_assigned_only'
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
    event: 'task_completed' as NotificationRule['event'],
    subject: '',
    message: '',
    enabled: true,
    recipients: [] as { type: 'role' | 'user'; id: string }[]
  });

  const handleToggle = (ruleId: string, enabled: boolean) => {
    updateNotificationRule(ruleId, { enabled });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateNotificationRule(editingId, formData);
      setEditingId(null);
    } else {
      addNotificationRule(formData);
    }
    setFormData({
      event: 'task_completed',
      subject: '',
      message: '',
      enabled: true,
      recipients: []
    });
    setShowForm(false);
  };

  const handleEdit = (rule: NotificationRule) => {
    setFormData({
      event: rule.event,
      subject: rule.subject,
      message: rule.message,
      enabled: rule.enabled,
      recipients: rule.recipients
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = (ruleId: string) => {
    if (confirm('Are you sure you want to delete this notification rule?')) {
      deleteNotificationRule(ruleId);
    }
  };

  const toggleRecipient = (type: 'role' | 'user', id: string) => {
    setFormData(prev => {
      const exists = prev.recipients.some(r => r.type === type && r.id === id);
      if (exists) {
        return {
          ...prev,
          recipients: prev.recipients.filter(r => !(r.type === type && r.id === id))
        };
      } else {
        return {
          ...prev,
          recipients: [...prev.recipients, { type, id }]
        };
      }
    });
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
              event: 'task_completed',
              subject: '',
              message: '',
              enabled: true,
              recipients: []
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
                <option value="task_completed">Task Completed</option>
                <option value="task_approved">Task Approved</option>
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
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                placeholder="e.g., Task Completed: {{taskName}}"
                required
              />
              <p className="text-xs text-[#6b6b80] mt-1">
                Variables: {`{{taskName}}, {{employeeName}}, {{approverName}}`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-2">
                Email Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 bg-[#12121a] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent outline-none"
                rows={4}
                placeholder="Enter the email message body..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-3">Recipients</label>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-[#6b6b80] mb-2">Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const isSelected = formData.recipients.some(
                        r => r.type === 'role' && r.id === role.id
                      );
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleRecipient('role', role.id)}
                          className={`px-3 py-1.5 text-sm border-2 transition ${
                            isSelected
                              ? 'bg-[rgba(139,92,246,0.1)] border-[#8b5cf6] text-[#8b5cf6] font-medium'
                              : 'bg-[#12121a] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
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
                      const isSelected = formData.recipients.some(
                        r => r.type === 'user' && r.id === employee.id
                      );
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => toggleRecipient('user', employee.id)}
                          className={`px-3 py-1.5 text-sm border-2 transition ${
                            isSelected
                              ? 'bg-[rgba(0,229,255,0.1)] border-[#00e5ff] text-[#00e5ff] font-medium'
                              : 'bg-[#12121a] border-[rgba(0,229,255,0.1)] text-[#f0f0f5] hover:border-[rgba(0,229,255,0.3)]'
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

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]"
              >
                {editingId ? 'Update' : 'Create'} Rule
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    event: 'task_completed',
                    subject: '',
                    message: '',
                    enabled: true,
                    recipients: []
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
        {notificationRules.map((rule) => (
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
                    <p className="text-xs font-medium text-[#6b6b80] mb-2">Recipients:</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.recipients.map((recipient, idx) => {
                        const label =
                          recipient.type === 'role'
                            ? roles.find((r) => r.id === recipient.id)?.name
                            : employees.find((e) => e.id === recipient.id)?.name;

                        return (
                          <span
                            key={idx}
                            className={`px-3 py-1 text-xs font-medium ${
                              recipient.type === 'role'
                                ? 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border border-[rgba(139,92,246,0.2)]'
                                : 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff] border border-[rgba(0,229,255,0.2)]'
                            }`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
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
        ))}

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
