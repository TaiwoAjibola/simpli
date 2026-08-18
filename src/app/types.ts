export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'pending_qa' | 'completed' | 'approved';
export type WorkType = 'development' | 'non-development';

export type Repository = {
  id: string;
  appId: string;
  provider: 'github';
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  connectionStatus: 'connected' | 'not_connected';
  lastSyncedAt?: Date;
  integrationStatus?: string;
  branches?: string[];
  commits?: { sha: string; message: string; author: string; date: string; url?: string }[];
  createdAt: Date;
};

export type GithubCommit = {
  sha: string;
  message: string;
  author: string;
  date: Date;
  url?: string;
};

export type GithubPullRequest = {
  prNumber: number;
  url: string;
  state: 'open' | 'closed' | 'merged';
  title: string;
  reviewers: string[];
  reviewState?: 'approved' | 'changes_requested' | 'pending';
  checkStatus?: 'pending' | 'success' | 'failure';
};

export type GithubIssue = {
  issueNumber: number;
  url: string;
  state: 'open' | 'closed';
  title: string;
  labels?: string[];
  updatedAt?: Date;
};

export type GithubSubDoc = {
  repositoryId?: string;
  branchName?: string;
  branchUrl?: string;
  commits?: GithubCommit[];
  pullRequest?: GithubPullRequest;
  issue?: GithubIssue;
  status: 'not_started' | 'branch_created' | 'commits_pushed' | 'pr_open' | 'review' | 'qa' | 'approved' | 'merged' | 'closed';
};
export type DefectStatus = 'open' | 'in_progress' | 'pending_qa' | 'resolved' | 'closed' | 'reopened';
export type ExpectationStatus = 'pending' | 'achieved' | 'missed';

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
  | 'handle_defects'
  | 'verify_defects'
  | 'manage_action_points'
  | 'manage_modules'
  | 'manage_documents'
  | 'develop_work'
  | 'review_code'
  | 'run_qa'
  | 'manage_repositories'
  | 'manage_sprints'
  | 'manage_templates'
  | 'manage_automations'
  | 'manage_workflow'
  | 'view_portfolio';

export type Employee = {
  id: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
  avatar?: string;
  firebaseUid?: string;
};

export type Tag = {
  id: string;
  appId: string;
  name: string;
  color: string;
  createdAt: Date;
};

export type SprintStatus = 'planned' | 'active' | 'completed';

export type Sprint = {
  id: string;
  appId: string;
  name: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
  status: SprintStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type App = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  createdBy: string;
  status: 'active' | 'completed' | 'on_hold';
  currentStage: 'pre-development' | 'development' | 'post-development';
  color?: string;
  cardStyle?: 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal';
  planningNotes?: string;
  softwareEngineeringProfile?: SoftwareEngineeringProfile;
  operationsProfile?: OperationsProfile;
  productProfile?: ProductProfile;
};

export type AppDocument = {
  id: string;
  appId: string;
  name: string;
  version: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
};

export type Phase = {
  id: string;
  appId: string;
  name: string;
  details: string;
  notes: string;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  stage: 'pre-development' | 'development' | 'post-development';
  sprintCount?: number;
  techStack?: string;
  qaCriteria?: string;
  deploymentTarget?: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  createdBy: string;
};

export type Module = {
  id: string;
  appId: string;
  name: string;
  status: 'open' | 'closed';
  targetDate?: Date;
  createdAt: Date;
  createdBy: string;
};

export type ModuleExpectation = {
  id: string;
  moduleId?: string;
  goalId?: string;
  description: string;
  status: ExpectationStatus;
  taskId?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
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
  status?: 'pending' | 'in_progress' | 'completed' | 'on_hold';
};

export type TaskOrigin =
  | { source: 'manual' }
  | { source: 'action_point'; actionPointId: string }
  | { source: 'meeting' }
  | { source: 'review' }
  | { source: 'template'; templateId: string }
  | { source: 'recurrence'; parentTaskId?: string }
  | { source: 'form' };

export type Task = {
  id: string;
  goalId?: string;
  appId?: string;
  phaseId?: string;
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
  tags?: string[];
  attachments?: {
    id: string;
    name: string;
    url: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: string;
  }[];
  workType?: WorkType;
  code?: string;
  sprintId?: string;
  followers?: string[];
  effortHours?: number;
  approvedRequired?: boolean;
  origin?: TaskOrigin;
  recurrence?: { frequency: 'daily' | 'weekly' | 'monthly'; interval: number; endDate?: Date };
  github?: GithubSubDoc;
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
    | 'subtask_assigned'
    | 'work_assigned'
    | 'work_started'
    | 'work_ready_for_qa'
    | 'work_qa_failed'
    | 'work_qa_passed'
    | 'work_approved'
    | 'work_merged'
    | 'work_blocked'
    | 'branch_created'
    | 'pr_open'
    | 'review_approved'
    | 'review_changes_requested'
    | 'ci_failed'
    | 'ci_passed'
    | 'due_soon'
    | 'dependency_blocked'
    | 'expectation_linked'
    | 'action_point_assigned'
    | 'defect_assigned'
    | 'mention';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  recipientId?: string;
  relatedTo?: {
    type: 'task' | 'subtask' | 'app' | 'defect' | 'action_point' | 'work' | 'goal';
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
  defectId?: string;
  actionPointId?: string;
  qaCycleId?: string;
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
  appId?: string;
  phaseId?: string;
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
  carriedFrom?: Date;
  tags?: string[];
  workType?: WorkType;
  sprintId?: string;
  followers?: string[];
  source?: 'meeting' | 'review' | 'discussion' | 'activity' | 'manual';
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
  lastEmailSentAt?: Date;
  workType?: WorkType;
  phaseId?: string;
  goalId?: string;
  sprintId?: string;
  followers?: string[];
  tags?: string[];
  github?: GithubSubDoc;
};

export type QaCycleResult = 'pass' | 'fail';

export type QaCycle = {
  id: string;
  workKind: 'task' | 'defect' | 'action_point';
  workId: string;
  cycleNumber: number;
  testerId: string;
  testedAt: Date;
  environment: 'dev' | 'staging' | 'production' | 'uat';
  result: QaCycleResult;
  notes: string;
  defectsDiscovered: string[];
  createdAt: Date;
};

export type WorkDependencyType = 'blocks' | 'blocked_by' | 'related_to';

export type WorkDependency = {
  id: string;
  fromKind: 'task' | 'defect' | 'action_point';
  fromId: string;
  toKind: 'task' | 'defect' | 'action_point';
  toId: string;
  type: WorkDependencyType;
  createdBy: string;
  createdAt: Date;
};

export type WorkTemplate = {
  id: string;
  name: string;
  description?: string;
  appId?: string;
  workKind: 'task' | 'action_point' | 'defect';
  fields: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    workType?: WorkType;
    subtasks?: string[];
    expectations?: string[];
    severity?: DefectSeverity;
    issueType?: DefectIssueType;
  };
  createdBy: string;
  createdAt: Date;
};

export type AutomationTriggerEvent =
  | 'task_created'
  | 'task_status_changed'
  | 'defect_created'
  | 'defect_status_changed'
  | 'pr_opened'
  | 'review_approved'
  | 'review_changes_requested'
  | 'ci_failed'
  | 'ci_passed'
  | 'pr_merged';

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    event: AutomationTriggerEvent;
    filter?: { workKind?: 'task' | 'defect' | 'action_point'; status?: string; workType?: WorkType };
  };
  action: {
    setStatus?: string;
    notify?: { role?: string; userIds?: string[]; message?: string };
    addTag?: string;
  };
  runHistory: {
    runId: string;
    runAt: Date;
    workKind?: string;
    workId?: string;
    event: string;
    outcome: 'applied' | 'skipped';
    note?: string;
  }[];
  createdAt: Date;
  updatedAt?: Date;
};

export type AppReport = {
  id: string;
  appId: string;
  title: string;
  content: string;
  model?: string;
  generatedBy: string;
  createdAt: Date;
};

export type TechStackEntry = {
  language: string;
  version: string;
  runtime: string;
  framework: string;
  database: string;
  cache: string;
  queue: string;
};

export type ArchitectureComponent = {
  component: string;
  responsibility: string;
  language: string;
};

export type EngineeringDecision = {
  decision: string;
  date: string;
  rationale: string;
};

export type KnownLimitation = {
  issue: string;
  impact: string;
  workaround: string;
  plannedFix: string;
};

export type SoftwareEngineeringProfile = {
  projectCode: string;
  repository: string;
  version: string;
  techStack: TechStackEntry[];
  architecturePattern: string;
  components: ArchitectureComponent[];
  designPatterns: string;
  apiType: string;
  apiProtocol: string;
  apiAuthMethod: string;
  apiDocLocation: string;
  cicdPlatform: string;
  pipelineStages: string;
  artifactRepo: string;
  deploymentStrategy: string;
  testing: { testType: string; tool: string; coverageTarget: string; ciStage: string }[];
  authProvider: string;
  secretsManager: string;
  scanningTools: string;
  complianceFrameworks: string;
  engineeringDecisions: EngineeringDecision[];
  knownLimitations: KnownLimitation[];
  owner: string;
  engineeringLead: string;
  reviewDate: string;
  approvedBy: string;
};

export type InfrastructureEntry = {
  resource: string;
  provider: string;
  spec: string;
  quantity: string;
  autoScaling: string;
};

export type MonitorEntry = {
  monitorType: string;
  tool: string;
  dashboard: string;
  alertChannel: string;
};

export type AccessEntry = {
  accessType: string;
  method: string;
  auth: string;
  reviewCycle: string;
};

export type RunbookEntry = {
  name: string;
  purpose: string;
  location: string;
};

export type OperationsProfile = {
  environment: string;
  region: string;
  deployedVersion: string;
  infrastructure: InfrastructureEntry[];
  deploymentMethod: string;
  cicdPlatform: string;
  rollbackStrategy: string;
  releaseCadence: string;
  configMgmtTool: string;
  secretsStorage: string;
  featureFlagSystem: string;
  envVarsLocation: string;
  monitoring: MonitorEntry[];
  logAggregationTool: string;
  logRetentionPeriod: string;
  auditLogging: string;
  backupMethod: string;
  backupSchedule: string;
  rto: string;
  rpo: string;
  drTestSchedule: string;
  onCallSchedule: string;
  severityLevels: string;
  incidentDocLink: string;
  pagerDuty: string;
  accessManagement: AccessEntry[];
  maintenanceWindow: string;
  upcomingMaintenance: string;
  certExpiryDates: string;
  runbooks: RunbookEntry[];
  operationsLead: string;
  reviewDate: string;
  approvedBy: string;
};

export type FeatureEntry = {
  feature: string;
  category: string;
  priority: string;
  status: string;
  users: string;
};

export type BusinessRule = {
  rule: string;
  domain: string;
  description: string;
  whereEnforced: string;
};

export type UserRoleEntry = {
  role: string;
  description: string;
  scope: string;
  permissions: string;
};

export type IntegrationEntry = {
  integration: string;
  direction: string;
  protocol: string;
  dataExchanged: string;
  slaDependency: string;
};

export type ThirdPartyService = {
  service: string;
  purpose: string;
  contractEnd: string;
  accountOwner: string;
};

export type KeyContact = {
  role: string;
  name: string;
  email: string;
  availability: string;
};

export type ProductProfile = {
  productOwner: string;
  targetAudience: string;
  launchDate: string;
  productVision: string;
  valueProposition: string;
  differentiators: string;
  targetMarket: string;
  features: FeatureEntry[];
  businessRules: BusinessRule[];
  userRoles: UserRoleEntry[];
  primaryFlows: string;
  workflowDiagramsLocation: string;
  integrations: IntegrationEntry[];
  thirdPartyServices: ThirdPartyService[];
  supportTierModel: string;
  commonIssuesKbLink: string;
  escalationPath: string;
  knownIssues: string;
  configChangeProcess: string;
  keyContacts: KeyContact[];
  outstandingItems: string;
  keyDocsLocation: string;
  trainingMaterials: string;
  productOwnerName: string;
  engineeringLeadName: string;
  reviewDate: string;
  approvedBy: string;
};
