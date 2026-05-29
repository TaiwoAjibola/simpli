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
  | 'view_assigned_only'
  | 'report_defects'
  | 'manage_defects'
  | 'verify_defects'
  | 'manage_action_points';

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
  color?: string;
  cardStyle?: 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal';
};

export type Phase = {
  id: string;
  appId: string;
  name: string;
  details: string;
  notes: string;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  createdBy: string;
};

export type Goal = {
  id: string;
  appId: string;
  phaseId?: string;
  name: string;
  description: string;
  createdAt: Date;
  startDate?: Date;
  endDate?: Date;
};

export type Task = {
  id: string;
  goalId?: string;
  name: string;
  description: string;
  assignedTo: string[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  startDate?: Date;
  dueDate?: Date;
  endDate?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  lastEmailSentAt?: Date;
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: string;
  }[];
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
  startDate?: Date;
  endDate?: Date;
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
  primaryRecipients: {
    type: 'assigned_user' | 'approver' | 'creator' | 'role' | 'user';
    id?: string;
  }[];
  ccRecipients: {
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

export type ActionPointStatus = 'pending' | 'completed' | 'carried_over';

export type ActionPoint = {
  id: string;
  title: string;
  description?: string;
  goalId?: string;
  assignedTo: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: ActionPointStatus;
  weekStart: Date;
  date: Date;
  taskId?: string;
  completedAt?: Date;
  completedBy?: string;
  createdBy: string;
  createdAt: Date;
  notes?: string;
  lastEmailSentAt?: Date;
};
export type DefectSeverity = 'blocker' | 'critical' | 'major' | 'minor';
export type DefectPriority = 'high' | 'medium' | 'low';
export type DefectIssueType = 'bug' | 'ui_issue' | 'performance' | 'security' | 'crash' | 'enhancement';
export type DefectReproducibility = 'always' | 'sometimes' | 'rare';
export type DefectFrequency = '100' | 'intermittent' | 'one_time';
export type DefectResolution = 'fixed' | 'cannot_reproduce' | 'duplicate' | 'wont_fix' | 'deferred';
export type DefectRootCause = 'backend' | 'frontend' | 'database' | 'infrastructure' | 'ui_ux' | 'api' | 'security' | 'other';

export type Defect = {
  id: string;
  defectCode: string;
  title: string;
  description: string;
  applicationId: string;
  module: string;
  environment: 'dev' | 'staging' | 'production' | 'uat';
  reportedBy: string;
  assignedTo: string;
  dateReported: Date;
  dueDate?: Date;
  issueType: DefectIssueType;
  severity: DefectSeverity;
  priority: DefectPriority;
  reproducibility: DefectReproducibility;
  frequency: DefectFrequency;
  status: DefectStatus;
  resolutionStatus?: DefectResolution;
  fixVerified: boolean;
  verificationDate?: Date;
  reopenedCount: number;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  qaComments: string;
  developerNotes: string;
  testedBy?: string;
  testCycle?: string;
  rootCause?: DefectRootCause;
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: Date;
    uploadedBy: string;
  }[];
  activityLogs: {
    id: string;
    action: string;
    userId: string;
    userName: string;
    timestamp: Date;
    details?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
};
