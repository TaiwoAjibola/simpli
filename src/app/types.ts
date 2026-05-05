export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'approved';

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

export type Permission =
  | 'create_app'
  | 'create_goal'
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
  firebaseUid?: string;
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

export type Task = {
  id: string;
  goalId: string;
  name: string;
  description: string;
  assignedTo: string[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
};

export type SubtaskStatus = 'pending' | 'in_progress' | 'completed';

export type Subtask = {
  id: string;
  taskId: string;
  name: string;
  assignedTo: string[];
  status: SubtaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationRule = {
  id: string;
  event:
    | 'task_started'
    | 'task_ready_for_testing'
    | 'task_sent_for_approval'
    | 'task_approved'
    | 'task_rejected'
    | 'task_blocked'
    | 'subtask_completed'
    | 'task_assigned'
    | 'subtask_assigned';
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
  type:
    | 'task_started'
    | 'task_ready_for_testing'
    | 'task_sent_for_approval'
    | 'task_approved'
    | 'task_rejected'
    | 'task_blocked'
    | 'subtask_completed'
    | 'task_assigned'
    | 'subtask_assigned';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  relatedTo?: {
    type: 'task' | 'subtask' | 'app';
    id: string;
  };
};

export type Activity = {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_approved' | 'app_created' | 'goal_created';
  userId: string;
  userName: string;
  description: string;
  timestamp: Date;
  relatedTo?: {
    type: 'task' | 'app' | 'goal';
    id: string;
    name: string;
  };
};

export type Comment = {
  id: string;
  taskId?: string;
  subtaskId?: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
};

export const NOTIFICATION_VARIABLES = {
  task: ['{task_name}', '{task_description}', '{task_status}', '{task_priority}', '{task_due_date}', '{task_previous_status}', '{task_new_status}'],
  subtask: ['{subtask_name}', '{subtask_status}', '{subtask_priority}'],
  user: ['{user_name}', '{assigned_user}', '{created_by}', '{approver_name}', '{tester_name}'],
  app: ['{app_name}'],
  goal: ['{goal_name}']
} as const;
