import { Role, Employee, App, Goal, Milestone, Task, NotificationRule, Activity } from '../types';

export const roles: Role[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    permissions: [
      'create_app',
      'create_goal',
      'create_milestone',
      'assign_tasks',
      'manage_users',
      'configure_notifications',
      'approve_tasks',
      'view_all_apps'
    ]
  },
  {
    id: 'role-ceo',
    name: 'CEO',
    permissions: [
      'create_app',
      'create_goal',
      'create_milestone',
      'approve_tasks',
      'view_all_apps'
    ]
  },
  {
    id: 'role-manager',
    name: 'Manager',
    permissions: [
      'create_goal',
      'create_milestone',
      'assign_tasks',
      'approve_tasks',
      'view_all_apps'
    ]
  },
  {
    id: 'role-employee',
    name: 'Employee',
    permissions: ['view_assigned_only']
  }
];

export const employees: Employee[] = [];
export const apps: App[] = [];
export const goals: Goal[] = [];
export const milestones: Milestone[] = [];
export const tasks: Task[] = [];
export const notificationRules: NotificationRule[] = [];
export const activities: Activity[] = [];
