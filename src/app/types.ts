export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'approved';

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type Permission =
  | 'create_app'
  | 'create_goal'
  | 'create_milestone'
  | 'assign_tasks'
  | 'manage_users'
  | 'configure_notifications'
  | 'approve_tasks'
  | 'view_all_apps'
  | 'view_assigned_only';

export type Employee = {
  id: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
  avatar?: string;
};

export type App = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'completed' | 'on_hold';
};

export type Goal = {
  id: string;
  appId: string;
  name: string;
  description: string;
  createdAt: Date;
};

export type Milestone = {
  id: string;
  goalId: string;
  name: string;
  description: string;
  dueDate: Date;
  status: 'not_started' | 'in_progress' | 'completed';
};

export type Task = {
  id: string;
  milestoneId: string;
  name: string;
  description: string;
  assignedTo: string[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
};

export type NotificationRule = {
  id: string;
  event: 'task_completed' | 'milestone_completed' | 'task_approved';
  recipients: {
    type: 'role' | 'user';
    id: string;
  }[];
  subject: string;
  message: string;
  enabled: boolean;
};

export type Notification = {
  id: string;
  type: 'task_completed' | 'milestone_completed' | 'task_approved' | 'task_assigned';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  relatedTo?: {
    type: 'task' | 'milestone' | 'app';
    id: string;
  };
};

export type Activity = {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_approved' | 'milestone_completed' | 'app_created' | 'goal_created' | 'milestone_created';
  userId: string;
  userName: string;
  description: string;
  timestamp: Date;
  relatedTo?: {
    type: 'task' | 'milestone' | 'app' | 'goal';
    id: string;
    name: string;
  };
};

export type Comment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
};
