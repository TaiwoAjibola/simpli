import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendEmail } from '../../utils/sendEmail';
import { useAuth } from './AuthContext';
import { canTransitionWork } from '../../utils/workflow';
import { getQaTransition, nextQaCycleNumber } from '../../utils/qa';
import { evaluateAutomation, nextRunId } from '../../utils/automations';
import { taskWorkType } from '../../utils/work';
import {
  createFirebaseUser,
  updateFirebaseUserPassword,
  updateFirebaseUserEmail,
  deleteFirebaseUser
} from '../../firebase/auth-utils';
import { findUserByEmail } from '../../firebase/auth-utils';
import {
  App,
  Goal,
  Task,
  Subtask,
  Employee,
  Role,
  NotificationRule,
  Notification,
  Activity,
  TaskStatus,
  Comment,
  Defect,
  Phase,
  ActionPoint,
  Tag,
  Module,
  ModuleExpectation,
  AppDocument,
  Sprint,
  QaCycle,
  WorkDependency,
  WorkTemplate,
  Automation,
  AutomationTriggerEvent,
  Repository,
  GithubSubDoc
} from '../types';

type AppContextType = {
  apps: App[];
  goals: Goal[];
  tasks: Task[];
  subtasks: Subtask[];
  employees: Employee[];
  roles: Role[];
  notificationRules: NotificationRule[];
  notifications: Notification[];
  activities: Activity[];
  comments: Comment[];
  defects: Defect[];
  phases: Phase[];
  modules: Module[];
  expectations: ModuleExpectation[];
  actionPoints: ActionPoint[];
  tags: Tag[];
  sprints: Sprint[];
  qaCycles: QaCycle[];
  workDependencies: WorkDependency[];
  loading: boolean;
  addApp: (app: Omit<App, 'id' | 'createdAt'>) => Promise<void>;
  updateApp: (appId: string, updates: Partial<App>) => Promise<void>;
  deleteApp: (appId: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => Promise<void>;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  approveTask: (taskId: string, approverId: string) => Promise<void>;
  addSubtask: (subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSubtask: (subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  addRole: (role: Omit<Role, 'id'>) => Promise<void>;
  updateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  addNotificationRule: (rule: Omit<NotificationRule, 'id'>) => Promise<void>;
  updateNotificationRule: (ruleId: string, updates: Partial<NotificationRule>) => Promise<void>;
  deleteNotificationRule: (ruleId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;
  notifyWork: (type: Notification['type'], title: string, message: string, recipientIds: string[], relatedTo?: Notification['relatedTo']) => Promise<void>;
  addComment: (params: { taskId?: string; subtaskId?: string; userId: string; content: string }) => Promise<void>;
  getCommentsForTask: (taskId: string) => Comment[];
  getCommentsForSubtask: (subtaskId: string) => Comment[];
  getSubtasksForTask: (taskId: string) => Subtask[];
  getTasksForEmployee: (employeeId: string) => Task[];
  getGoalsForApp: (appId: string) => Goal[];
  getTasksForGoal: (goalId: string) => Task[];
  getAppById: (appId: string) => App | undefined;
  getGoalById: (goalId: string) => Goal | undefined;
  getEmployeeById: (employeeId: string) => Employee | undefined;
  addDefect: (defect: Omit<Defect, 'id' | 'defectCode' | 'createdAt' | 'updatedAt' | 'activityLogs' | 'reopenedCount' | 'fixVerified'>) => Promise<Defect | undefined>;
  updateDefect: (defectId: string, updates: Partial<Defect>, userId?: string, userName?: string) => Promise<void>;
  deleteDefect: (defectId: string) => Promise<void>;
  sendDefectNotification: (defectId: string) => Promise<void>;
  addDefectComment: (defectId: string, userId: string, userName: string, content: string) => Promise<void>;
  getDefectsForApp: (appId: string) => Defect[];
  getDefectById: (defectId: string) => Defect | undefined;
  addPhase: (phase: Omit<Phase, 'id' | 'createdAt'>) => Promise<void>;
  updatePhase: (phaseId: string, updates: Partial<Phase>) => Promise<void>;
  deletePhase: (phaseId: string) => Promise<void>;
  getPhasesForApp: (appId: string) => Phase[];
  getPhaseById: (phaseId: string) => Phase | undefined;
  appDocuments: AppDocument[];
  addAppDocument: (doc: Omit<AppDocument, 'id' | 'createdAt'>) => Promise<void>;
  deleteAppDocument: (docId: string) => Promise<void>;
  getDocumentsForApp: (appId: string) => AppDocument[];
  modules: Module[];
  addModule: (m: Omit<Module, 'id' | 'createdAt'>) => Promise<void>;
  updateModule: (moduleId: string, updates: Partial<Module>) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  getModulesForApp: (appId: string) => Module[];
  addExpectation: (exp: Omit<ModuleExpectation, 'id' | 'createdAt'>) => Promise<void>;
  updateExpectation: (expId: string, updates: Partial<ModuleExpectation>) => Promise<void>;
  deleteExpectation: (expId: string) => Promise<void>;
  getExpectationsForModule: (moduleId: string) => ModuleExpectation[];
  addActionPoint: (ap: Omit<ActionPoint, 'id' | 'createdAt' | 'taskId'> & { taskId?: string }) => Promise<void>;
  updateActionPoint: (actionPointId: string, updates: Partial<ActionPoint>) => Promise<void>;
  deleteActionPoint: (actionPointId: string) => Promise<void>;
  sendTaskNotification: (taskId: string) => Promise<void>;
  sendActionPointNotification: (apId: string) => Promise<void>;
  addTag: (tag: Omit<Tag, 'id' | 'createdAt'>) => Promise<void>;
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  getTagsForApp: (appId: string) => Tag[];
  addSprint: (sprint: Omit<Sprint, 'id' | 'createdAt'>) => Promise<void>;
  updateSprint: (sprintId: string, updates: Partial<Sprint>) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  getSprintsForApp: (appId: string) => Sprint[];
  getSprintById: (sprintId: string) => Sprint | undefined;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function safeDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value.toDate && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  if (value.seconds) return new Date(value.seconds * 1000);
  return undefined;
}

function docToApp(doc: any): App {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToGoal(doc: any): Goal {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date(),
    startDate: safeDate(data.startDate),
    endDate: safeDate(data.endDate)
  };
}

function docToTask(doc: any): Task {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date(),
    startDate: safeDate(data.startDate),
    dueDate: safeDate(data.dueDate),
    endDate: safeDate(data.endDate),
    completedAt: safeDate(data.completedAt),
    approvedAt: safeDate(data.approvedAt),
    lastEmailSentAt: safeDate(data.lastEmailSentAt)
  };
}

function docToSubtask(doc: any): Subtask {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date(),
    updatedAt: safeDate(data.updatedAt) || new Date(),
    startDate: safeDate(data.startDate),
    endDate: safeDate(data.endDate)
  };
}

function docToEmployee(doc: any): Employee {
  const data = doc.data();
  return {
    id: doc.id,
    ...data
  };
}

function docToRole(doc: any): Role {
  const data = doc.data();
  return {
    id: doc.id,
    ...data
  };
}

function docToNotificationRule(doc: any): NotificationRule {
  const data = doc.data();
  return {
    id: doc.id,
    ...data
  };
}

function docToNotification(doc: any): Notification {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date(),
    read: data.read ?? false
  };
}

function docToActivity(doc: any): Activity {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: safeDate(data.timestamp) || new Date()
  };
}

function docToComment(doc: any): Comment {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: safeDate(data.timestamp) || new Date()
  };
}

function docToDefect(doc: any): Defect {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    dateReported: safeDate(data.dateReported) || new Date(),
    dueDate: safeDate(data.dueDate),
    verificationDate: safeDate(data.verificationDate),
    createdAt: safeDate(data.createdAt) || new Date(),
    updatedAt: safeDate(data.updatedAt) || new Date(),
    closedAt: safeDate(data.closedAt),
    activityLogs: (data.activityLogs || []).map((log: any) => ({
      ...log,
      timestamp: safeDate(log.timestamp) || new Date()
    })),
    attachments: data.attachments || [],
    reopenedCount: data.reopenedCount || 0,
    fixVerified: data.fixVerified || false,
    lastEmailSentAt: safeDate(data.lastEmailSentAt)
  };
}

function docToPhase(doc: any): Phase {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    startDate: safeDate(data.startDate),
    endDate: safeDate(data.endDate),
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToAppDocument(doc: any): AppDocument {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToModule(doc: any): Module {
  const data = doc.data() || doc;
  return {
    id: data.id || doc.id,
    appId: data.appId || '',
    name: data.name || '',
    status: data.status || 'open',
    targetDate: safeDate(data.targetDate),
    createdBy: data.createdBy || '',
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToModuleExpectation(doc: any): ModuleExpectation {
  const data = doc.data() || doc;
  return {
    id: data.id || doc.id,
    moduleId: data.moduleId || '',
    description: data.description || '',
    status: data.status || 'pending',
    taskId: data.taskId,
    notes: data.notes,
    createdBy: data.createdBy || '',
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToTag(doc: any): Tag {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToSprint(doc: any): Sprint {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    startDate: safeDate(data.startDate),
    endDate: safeDate(data.endDate),
    createdAt: safeDate(data.createdAt) || new Date(),
    updatedAt: safeDate(data.updatedAt)
  };
}

function docToQaCycle(doc: any): QaCycle {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    testedAt: safeDate(data.testedAt) || new Date(),
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToWorkDependency(doc: any): WorkDependency {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToWorkTemplate(doc: any): WorkTemplate {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToAutomation(doc: any): Automation {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    runHistory: Array.isArray(data.runHistory) ? data.runHistory.map((r: any) => ({ ...r, runAt: safeDate(r.runAt) || new Date() })) : [],
    createdAt: safeDate(data.createdAt) || new Date(),
    updatedAt: safeDate(data.updatedAt)
  };
}

function docToRepository(doc: any): Repository {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    lastSyncedAt: safeDate(data.lastSyncedAt),
    createdAt: safeDate(data.createdAt) || new Date()
  };
}

function docToActionPoint(doc: any): ActionPoint {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    weekStart: safeDate(data.weekStart) || new Date(),
    date: safeDate(data.date) || new Date(),
    createdAt: safeDate(data.createdAt) || new Date(),
    completedAt: safeDate(data.completedAt),
    lastEmailSentAt: safeDate(data.lastEmailSentAt),
    carriedFrom: safeDate(data.carriedFrom)
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { currentUser, hasPermission } = useAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [appDocuments, setAppDocuments] = useState<AppDocument[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [expectations, setExpectations] = useState<ModuleExpectation[]>([]);
  const [actionPoints, setActionPoints] = useState<ActionPoint[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [qaCycles, setQaCycles] = useState<QaCycle[]>([]);
  const [workDependencies, setWorkDependencies] = useState<WorkDependency[]>([]);
  const [workTemplates, setWorkTemplates] = useState<WorkTemplate[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const collections = [
      { ref: collection(db, 'apps'), setter: setApps, transformer: docToApp },
      { ref: collection(db, 'goals'), setter: setGoals, transformer: docToGoal },
      { ref: collection(db, 'tasks'), setter: setTasks, transformer: docToTask },
      { ref: collection(db, 'subtasks'), setter: setSubtasks, transformer: docToSubtask },
      { ref: collection(db, 'employees'), setter: setEmployees, transformer: docToEmployee },
      { ref: collection(db, 'roles'), setter: setRoles, transformer: docToRole },
      { ref: collection(db, 'notificationRules'), setter: setNotificationRules, transformer: docToNotificationRule },
      { ref: query(collection(db, 'activities'), orderBy('timestamp', 'desc')), setter: setActivities, transformer: docToActivity },
      { ref: query(collection(db, 'comments'), orderBy('timestamp', 'desc')), setter: setComments, transformer: docToComment },
      { ref: collection(db, 'defects'), setter: setDefects, transformer: docToDefect },
      { ref: collection(db, 'phases'), setter: setPhases, transformer: docToPhase },
      { ref: collection(db, 'modules'), setter: setModules, transformer: docToModule },
      { ref: collection(db, 'moduleExpectations'), setter: setExpectations, transformer: docToModuleExpectation },
      { ref: collection(db, 'tags'), setter: setTags, transformer: docToTag },
      { ref: collection(db, 'appDocuments'), setter: setAppDocuments, transformer: docToAppDocument },
      { ref: query(collection(db, 'actionPoints'), orderBy('weekStart', 'desc')), setter: setActionPoints, transformer: docToActionPoint },
      { ref: query(collection(db, 'notifications'), orderBy('createdAt', 'desc')), setter: setNotifications, transformer: docToNotification },
      { ref: collection(db, 'sprints'), setter: setSprints, transformer: docToSprint },
      { ref: query(collection(db, 'qaCycles'), orderBy('testedAt', 'desc')), setter: setQaCycles, transformer: docToQaCycle },
      { ref: collection(db, 'workDependencies'), setter: setWorkDependencies, transformer: docToWorkDependency },
      { ref: collection(db, 'workTemplates'), setter: setWorkTemplates, transformer: docToWorkTemplate },
      { ref: collection(db, 'automations'), setter: setAutomations, transformer: docToAutomation },
      { ref: collection(db, 'repositories'), setter: setRepositories, transformer: docToRepository }
    ];

    collections.forEach(({ ref, setter, transformer }) => {
      const unsub = onSnapshot(ref, (snapshot) => {
        setter(snapshot.docs.map(transformer));
        setLoading(false);
      }, (error) => {
        console.error(`Error loading ${ref.id}:`, error);
        setLoading(false);
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    await addDoc(collection(db, 'activities'), {
      ...activity,
      timestamp: serverTimestamp()
    });
  }, []);

  const resolveRelatedEmails = useCallback((
    relatedTo: Notification['relatedTo'],
    primaryRecipients: { type: string; id?: string }[],
    ccRecipients: { type: 'role' | 'user'; id: string }[]
  ): { toEmails: string[]; ccEmails: string[] } => {
    const toEmails: string[] = [];
    const ccEmails: string[] = [];

    const addTo = (id?: string) => {
      if (!id) return;
      const u = employees.find(e => e.id === id);
      if (u?.email && !toEmails.includes(u.email)) toEmails.push(u.email);
    };
    const addRole = (roleId?: string, to: string[] = toEmails) => {
      if (!roleId) return;
      employees.filter(e => e.roleId === roleId).forEach(u => {
        if (u.email && !to.includes(u.email)) to.push(u.email);
      });
    };

    switch (relatedTo?.type) {
      case 'task': {
        const task = tasks.find(t => t.id === relatedTo.id);
        if (task) {
          for (const r of primaryRecipients) {
            if (r.type === 'assigned_user') task.assignedTo.forEach(addTo);
            else if (r.type === 'approver' && task.approvedBy) addTo(task.approvedBy);
            else if (r.type === 'creator') addTo(task.assignedTo[0]);
            else if (r.type === 'role') addRole(r.id);
            else if (r.type === 'user') addTo(r.id);
          }
          for (const r of ccRecipients) {
            if (r.type === 'role') addRole(r.id, ccEmails);
            else if (r.type === 'user') {
              const u = employees.find(e => e.id === r.id);
              if (u?.email && !ccEmails.includes(u.email)) ccEmails.push(u.email);
            }
          }
        }
        break;
      }
      case 'subtask': {
        const subtask = subtasks.find(s => s.id === relatedTo.id);
        if (subtask) {
          for (const r of primaryRecipients) {
            if (r.type === 'assigned_user') subtask.assignedTo.forEach(addTo);
            else if (r.type === 'role') addRole(r.id);
            else if (r.type === 'user') addTo(r.id);
          }
          for (const r of ccRecipients) {
            if (r.type === 'role') addRole(r.id, ccEmails);
            else if (r.type === 'user') {
              const u = employees.find(e => e.id === r.id);
              if (u?.email && !ccEmails.includes(u.email)) ccEmails.push(u.email);
            }
          }
        }
        break;
      }
      case 'defect': {
        const defect = defects.find(d => d.id === relatedTo.id);
        if (defect) {
          for (const r of primaryRecipients) {
            if (r.type === 'assigned_user') addTo(defect.assignedTo);
            else if (r.type === 'creator') addTo(defect.reportedBy);
            else if (r.type === 'role') addRole(r.id);
            else if (r.type === 'user') addTo(r.id);
          }
          for (const r of ccRecipients) {
            if (r.type === 'role') addRole(r.id, ccEmails);
            else if (r.type === 'user') {
              const u = employees.find(e => e.id === r.id);
              if (u?.email && !ccEmails.includes(u.email)) ccEmails.push(u.email);
            }
          }
        }
        break;
      }
      case 'action_point': {
        const ap = actionPoints.find(a => a.id === relatedTo.id);
        if (ap) {
          for (const r of primaryRecipients) {
            if (r.type === 'assigned_user') ap.assignedTo.forEach(addTo);
            else if (r.type === 'role') addRole(r.id);
            else if (r.type === 'user') addTo(r.id);
          }
          for (const r of ccRecipients) {
            if (r.type === 'role') addRole(r.id, ccEmails);
            else if (r.type === 'user') {
              const u = employees.find(e => e.id === r.id);
              if (u?.email && !ccEmails.includes(u.email)) ccEmails.push(u.email);
            }
          }
        }
        break;
      }
      default:
        break;
    }

    return { toEmails, ccEmails };
  }, [employees, tasks, subtasks, defects, actionPoints]);

  const createNotification = useCallback(async (
    type: Notification['type'],
    title: string,
    message: string,
    relatedTo?: Notification['relatedTo'],
    recipientIds?: string[]
  ) => {
    await addDoc(collection(db, 'notifications'), {
      type,
      title,
      message,
      createdAt: serverTimestamp(),
      read: false,
      relatedTo,
      recipientId: recipientIds && recipientIds.length === 1 ? recipientIds[0] : undefined
    });

    const matchingRules = notificationRules.filter(
      rule => rule.event === type && rule.enabled
    );

    if (matchingRules.length === 0) {
      console.log(`[Email] No matching notification rules for event: "${type}"`);
    }

    for (const rule of matchingRules) {
      const primaryRecipients = rule.primaryRecipients || [];
      const ccRecipients = rule.ccRecipients || [];

      const { toEmails, ccEmails } = relatedTo
        ? resolveRelatedEmails(relatedTo, primaryRecipients, ccRecipients)
        : { toEmails: [] as string[], ccEmails: [] as string[] };

      const allRecipients = [...toEmails, ...ccEmails];
      const uniqueRecipients = [...new Set(allRecipients)];

      if (recipientIds && recipientIds.length > 0) {
        recipientIds.forEach(id => {
          const u = employees.find(e => e.id === id);
          if (u?.email && !toEmails.includes(u.email)) toEmails.push(u.email);
        });
      }

      if (uniqueRecipients.length > 0 || toEmails.length > 0) {
        let variables: Record<string, string> = {};

        if (relatedTo?.type === 'task') {
          const task = tasks.find(t => t.id === relatedTo.id);
          if (task) {
            const goal = goals.find(g => g.id === task.goalId);
            const app = goal ? apps.find(a => a.id === goal.appId) : null;
            const assignee = task.assignedTo.length > 0 ? employees.find(e => e.id === task.assignedTo[0]) : null;
            const approver = task.approvedBy ? employees.find(e => e.id === task.approvedBy) : null;

            variables = {
              task_name: task.name,
              task_description: task.description,
              task_status: task.status,
              task_priority: task.priority,
              task_due_date: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
              task_previous_status: '',
              task_new_status: task.status,
              user_name: assignee?.name || '',
              assigned_user: assignee?.name || '',
              approver_name: approver?.name || '',
              tester_name: '',
              app_name: app?.name || '',
              goal_name: goal?.name || ''
            };
          }
        } else if (relatedTo?.type === 'subtask') {
          const subtask = subtasks.find(s => s.id === relatedTo.id);
          if (subtask) {
            const assignee = subtask.assignedTo.length > 0 ? employees.find(e => e.id === subtask.assignedTo[0]) : null;
            variables = {
              subtask_name: subtask.name,
              subtask_status: subtask.status,
              subtask_priority: subtask.priority,
              user_name: assignee?.name || '',
              assigned_user: assignee?.name || ''
            };
          }
        } else if (relatedTo?.type === 'defect') {
          const defect = defects.find(d => d.id === relatedTo.id);
          if (defect) {
            const assignee = employees.find(e => e.id === defect.assignedTo);
            const app = defect.applicationId ? apps.find(a => a.id === defect.applicationId) : null;
            variables = {
              defect_code: defect.defectCode,
              defect_title: defect.title,
              defect_status: defect.status,
              defect_severity: defect.severity,
              defect_priority: defect.priority,
              assigned_user: assignee?.name || '',
              user_name: assignee?.name || '',
              app_name: app?.name || ''
            };
          }
        } else if (relatedTo?.type === 'action_point') {
          const ap = actionPoints.find(a => a.id === relatedTo.id);
          if (ap) {
            const assignee = ap.assignedTo.length > 0 ? employees.find(e => e.id === ap.assignedTo[0]) : null;
            variables = {
              action_point_title: ap.title,
              action_point_status: ap.status,
              assigned_user: assignee?.name || '',
              user_name: assignee?.name || ''
            };
          }
        }

        let emailSubject = rule.subject;
        let emailMessage = rule.message;

        for (const [key, value] of Object.entries(variables)) {
          emailSubject = emailSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
          emailMessage = emailMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        await sendEmail({ to: toEmails, cc: ccEmails.length > 0 ? ccEmails : undefined }, emailSubject, emailMessage.replace(/\n/g, '<br>'));
        console.log(`[Email] Sent to:`, toEmails, ccEmails.length > 0 ? ccEmails : undefined, `| Subject:`, emailSubject);
      } else {
        console.log(`[Email] No recipients resolved for rule:`, rule.event);
      }
    }
  }, [notificationRules, employees, tasks, goals, apps, subtasks, defects, actionPoints, resolveRelatedEmails]);

  const sendTaskNotification = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const statusToEvent: Record<string, string> = {
      not_started: 'task_assigned',
      in_progress: 'task_started',
      completed: 'task_ready_for_testing',
      approved: 'task_approved',
      blocked: 'task_blocked'
    };

    const event = statusToEvent[task.status] || 'task_assigned';

    await createNotification(
      event as any,
      `Task: ${task.name}`,
      `Notification for "${task.name}" (${task.status.replace(/_/g, ' ')})`,
      { type: 'task', id: task.id },
      task.assignedTo
    );

    await updateDoc(doc(db, 'tasks', taskId), {
      lastEmailSentAt: serverTimestamp()
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, lastEmailSentAt: new Date() } : t));
}, [tasks, createNotification]);

  const notifyWork = useCallback(async (
    type: Notification['type'],
    title: string,
    message: string,
    recipientIds: string[],
    relatedTo?: Notification['relatedTo']
  ) => {
    if (!recipientIds || recipientIds.length === 0) return;
    const uniqueIds = [...new Set(recipientIds)];
    await Promise.all(uniqueIds.map(id =>
      addDoc(collection(db, 'notifications'), {
        type,
        title,
        message,
        createdAt: serverTimestamp(),
        read: false,
        relatedTo,
        recipientId: id
      })
    ));
  }, []);

const sendActionPointNotification = useCallback(async (apId: string) => {
    const ap = actionPoints.find(a => a.id === apId);
    if (!ap) return;

    const toEmails: string[] = [];
    ap.assignedTo.forEach(uid => {
      const user = employees.find(e => e.id === uid);
      if (user?.email && !toEmails.includes(user.email)) toEmails.push(user.email);
    });

    if (toEmails.length === 0) return;

    const goal = ap.goalId ? goals.find(g => g.id === ap.goalId) : null;
    const assigneeNames = ap.assignedTo.map(id => employees.find(e => e.id === id)?.name || 'Unknown').join(', ');

    const subject = `Action Point: ${ap.title}`;
    const message = `
      <h2>Action Point: ${ap.title}</h2>
      <p><strong>Assigned to:</strong> ${assigneeNames}</p>
      <p><strong>Priority:</strong> ${ap.priority}</p>
      <p><strong>Status:</strong> ${ap.status.replace(/_/g, ' ')}</p>
      <p><strong>Date:</strong> ${new Date(ap.date).toLocaleDateString()}</p>
      ${ap.description ? `<p><strong>Description:</strong> ${ap.description}</p>` : ''}
      ${goal ? `<p><strong>Goal:</strong> ${goal.name}</p>` : ''}
    `;

    await sendEmail({ to: toEmails }, subject, message);

    await updateDoc(doc(db, 'actionPoints', apId), {
      lastEmailSentAt: serverTimestamp()
    });
    setActionPoints(prev => prev.map(a => a.id === apId ? { ...a, lastEmailSentAt: new Date() } : a));
  }, [actionPoints, employees, goals]);

  const sendDefectNotification = useCallback(async (defectId: string) => {
    const defect = defects.find(d => d.id === defectId);
    if (!defect) return;

    const assignee = employees.find(e => e.id === defect.assignedTo);
    const reporter = employees.find(e => e.id === defect.reportedBy);
    const app = defect.applicationId ? apps.find(a => a.id === defect.applicationId) : null;

    const toEmails: string[] = [];
    if (assignee?.email) toEmails.push(assignee.email);
    if (reporter?.email && !toEmails.includes(reporter.email)) toEmails.push(reporter.email);

    if (toEmails.length === 0) return;

    const subject = `[${defect.defectCode}] ${defect.title}`;
    const message = `
      <h2>Defect: ${defect.defectCode} - ${defect.title}</h2>
      <p><strong>Status:</strong> ${defect.status.replace(/_/g, ' ')}</p>
      <p><strong>Severity:</strong> ${defect.severity}</p>
      <p><strong>Priority:</strong> ${defect.priority}</p>
      <p><strong>Assigned to:</strong> ${assignee?.name || 'Unassigned'}</p>
      <p><strong>Reported by:</strong> ${reporter?.name || 'Unknown'}</p>
      ${app ? `<p><strong>Application:</strong> ${app.name}</p>` : ''}
      ${defect.dueDate ? `<p><strong>Due Date:</strong> ${new Date(defect.dueDate).toLocaleDateString()}</p>` : ''}
      <p><strong>Module:</strong> ${defect.module || '-'}</p>
      <p><strong>Environment:</strong> ${defect.environment}</p>
      <p><strong>Description:</strong> ${defect.description || 'No description'}</p>
    `;

    await sendEmail({ to: toEmails }, subject, message);

    await updateDoc(doc(db, 'defects', defectId), {
      lastEmailSentAt: serverTimestamp()
    });
    setDefects(prev => prev.map(d => d.id === defectId ? { ...d, lastEmailSentAt: new Date() } : d));
  }, [defects, employees, apps]);

  const addApp = useCallback(async (app: Omit<App, 'id' | 'createdAt'>) => {
    const appId = `app-${Date.now()}`;
    await setDoc(doc(db, 'apps', appId), {
      ...app,
      id: appId,
      createdAt: serverTimestamp()
    });
    const employee = employees.find(e => e.id === app.createdBy);
    setApps(prev => [{ ...app, id: appId, createdAt: new Date() }, ...prev]);
    await addActivity({
      type: 'app_created',
      userId: app.createdBy,
      userName: employee?.name || 'Unknown',
      description: `created app "${app.name}"`,
      relatedTo: { type: 'app', id: appId, name: app.name }
    });
  }, [employees, addActivity]);

  const updateApp = useCallback(async (appId: string, updates: Partial<App>) => {
    await updateDoc(doc(db, 'apps', appId), updates);
  }, []);

  const deleteApp = useCallback(async (appId: string) => {
    const appGoals = goals.filter(g => g.appId === appId);
    for (const goal of appGoals) {
      const goalTasks = tasks.filter(t => t.goalId === goal.id);
      for (const task of goalTasks) {
        const taskSubtasks = subtasks.filter(s => s.taskId === task.id);
        for (const subtask of taskSubtasks) {
          await deleteDoc(doc(db, 'subtasks', subtask.id));
        }
        await deleteDoc(doc(db, 'tasks', task.id));
      }
      await deleteDoc(doc(db, 'goals', goal.id));
    }
    await deleteDoc(doc(db, 'apps', appId));
  }, [goals, tasks, subtasks]);

  const addGoal = useCallback(async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const goalId = `goal-${Date.now()}`;
    await setDoc(doc(db, 'goals', goalId), sanitizeForFirestore({
      ...goal,
      id: goalId,
      createdAt: serverTimestamp()
    }));
    setGoals(prev => [{ ...goal, id: goalId, createdAt: new Date() } as Goal, ...prev]);
    await addActivity({
      type: 'goal_created',
      userId: 'system',
      userName: 'System',
      description: `created goal "${goal.name}"`,
      relatedTo: { type: 'goal', id: goalId, name: goal.name }
    });
  }, [addActivity]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    await updateDoc(doc(db, 'goals', goalId), sanitizeForFirestore(updates));
  }, []);

  const deleteGoal = useCallback(async (goalId: string) => {
    const goalTasks = tasks.filter(t => t.goalId === goalId);
    for (const task of goalTasks) {
      const taskSubtasks = subtasks.filter(s => s.taskId === task.id);
      for (const subtask of taskSubtasks) {
        await deleteDoc(doc(db, 'subtasks', subtask.id));
      }
      await deleteDoc(doc(db, 'tasks', task.id));
    }
    await deleteDoc(doc(db, 'goals', goalId));
  }, [tasks, subtasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    const taskId = `task-${Date.now()}`;
    const goal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
    const appId = task.appId || goal?.appId;
    const phaseId = task.phaseId || goal?.phaseId;
    await setDoc(doc(db, 'tasks', taskId), sanitizeForFirestore({
      ...task,
      id: taskId,
      appId,
      phaseId,
      workType: task.workType || 'non-development',
      createdAt: serverTimestamp()
    }));
    setTasks(prev => [{ ...task, id: taskId, appId, phaseId, workType: task.workType || 'non-development', createdAt: new Date() } as Task, ...prev]);
    const assigneeNames = task.assignedTo.map(id => employees.find(e => e.id === id)?.name || 'Unknown').join(', ');
    await addActivity({
      type: 'task_created',
      userId: task.assignedTo[0] || 'system',
      userName: assigneeNames,
      description: `was assigned task "${task.name}"`,
      relatedTo: { type: 'task', id: taskId, name: task.name }
    });
    await notifyWork(
      'work_assigned',
      'New Task Assigned',
      `You have been assigned: ${task.name}`,
      task.assignedTo,
      { type: 'task', id: taskId }
    );
    return { id: taskId, ...task, appId, phaseId, workType: task.workType || 'non-development', createdAt: new Date() };
  }, [employees, goals, addActivity, createNotification, notifyWork]);

  const deleteTask = useCallback(async (taskId: string) => {
    const taskSubtasks = subtasks.filter(s => s.taskId === taskId);
    for (const subtask of taskSubtasks) {
      await deleteDoc(doc(db, 'subtasks', subtask.id));
    }
    await deleteDoc(doc(db, 'tasks', taskId));
  }, [subtasks]);

  const runAutomationForEventRef = useRef<((evt: AutomationTriggerEvent, payload: {
    workKind: string;
    workId: string;
    workStatus: string;
    workType?: string;
  }) => Promise<void>) | null>(null);

const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const statusChanged = !!updates.status && updates.status !== task.status;

    if (updates.status && updates.status !== task.status) {
      const allowed = canTransitionWork({
        kind: 'task',
        currentStatus: task.status,
        nextStatus: updates.status,
        workType: taskWorkType(task),
        can: hasPermission
      });
      if (!allowed) {
        console.warn(`[Workflow] Task ${taskId} transition ${task.status} -> ${updates.status} blocked for current role.`);
        return;
      }
      const doneStates = ['completed', 'approved'];
      if (doneStates.includes(updates.status)) {
        const blockers = workDependencies.filter(d =>
          d.toKind === 'task' && d.toId === taskId && d.type === 'blocked_by'
        );
        if (blockers.length > 0) {
          console.warn(`[Workflow] Task ${taskId} blocked by ${blockers.length} dependency(ies); cannot complete.`);
          return;
        }
      }
    }

    const updateData: any = { ...updates };
    if (updates.status === 'in_progress' && task.status === 'not_started') {
      const employee = employees.find(e => e.id === task.assignedTo[0]);
      await addActivity({
        type: 'task_created',
        userId: task.assignedTo[0] || 'system',
        userName: employee?.name || 'Unknown',
        description: `started working on "${task.name}"`,
        relatedTo: { type: 'task', id: task.id, name: task.name }
      });
      await createNotification(
        'task_started',
        'Task Started',
        `${employee?.name} started working on: ${task.name}`,
        { type: 'task', id: task.id }
      );
    }

    if (updates.status === 'completed' && task.status !== 'completed') {
      updateData.completedAt = serverTimestamp();
      const employee = employees.find(e => e.id === task.assignedTo[0]);
      await addActivity({
        type: 'task_completed',
        userId: task.assignedTo[0] || 'system',
        userName: employee?.name || 'Unknown',
        description: `completed task "${task.name}" and sent for testing`,
        relatedTo: { type: 'task', id: task.id, name: task.name }
      });
      await createNotification(
        'task_ready_for_testing',
        'Task Ready for Testing',
        `${employee?.name} completed: ${task.name}. Ready for testing.`,
        { type: 'task', id: task.id }
      );
    }

    if (updates.status === 'approved' && task.status === 'completed') {
      updateData.approvedAt = serverTimestamp();
      const approver = employees.find(e => e.id === updates.approvedBy);
      await addActivity({
        type: 'task_approved',
        userId: updates.approvedBy || 'system',
        userName: approver?.name || 'Unknown',
        description: `approved task "${task.name}"`,
        relatedTo: { type: 'task', id: task.id, name: task.name }
      });
      await createNotification(
        'task_approved',
        'Task Approved',
        `${approver?.name} approved: ${task.name}`,
        { type: 'task', id: task.id }
      );
    }

    if (updates.status === 'blocked') {
      const employee = employees.find(e => e.id === task.assignedTo[0]);
      await addActivity({
        type: 'task_created',
        userId: task.assignedTo[0] || 'system',
        userName: employee?.name || 'Unknown',
        description: `blocked task "${task.name}"`,
        relatedTo: { type: 'task', id: task.id, name: task.name }
      });
      await createNotification(
        'task_blocked',
        'Task Blocked',
        `Task "${task.name}" is now blocked.`,
        { type: 'task', id: task.id }
      );
    }

    if (updates.status === 'not_started' && task.status === 'completed') {
      await createNotification(
        'task_rejected',
        'Task Sent Back',
        `Task "${task.name}" was sent back for revision.`,
        { type: 'task', id: task.id }
      );
    }

    await updateDoc(doc(db, 'tasks', taskId), updateData);

    if (statusChanged) {
      await runAutomationForEventRef.current?.('task_status_changed', {
        workKind: 'task',
        workId: taskId,
        workStatus: updates.status || task.status,
        workType: task.workType || 'non-development'
      });
    }
  }, [tasks, employees, addActivity, createNotification, hasPermission, workDependencies]);

  const approveTask = useCallback(async (taskId: string, approverId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const approver = employees.find(e => e.id === approverId);
    await addActivity({
      type: 'task_approved',
      userId: approverId,
      userName: approver?.name || 'Unknown',
      description: `approved task "${task.name}"`,
      relatedTo: { type: 'task', id: task.id, name: task.name }
    });
    await createNotification(
      'task_approved',
      'Task Approved',
      `Your task "${task.name}" was approved by ${approver?.name}`,
      { type: 'task', id: task.id }
    );

    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: approverId
    });
  }, [tasks, employees, addActivity, createNotification]);

  const addSubtask = useCallback(async (subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const subtaskId = `subtask-${Date.now()}`;
    await setDoc(doc(db, 'subtasks', subtaskId), {
      ...subtask,
      id: subtaskId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setSubtasks(prev => [{ ...subtask, id: subtaskId, createdAt: new Date(), updatedAt: new Date() } as Subtask, ...prev]);
    const assigneeNames = subtask.assignedTo.map(id => employees.find(e => e.id === id)?.name || 'Unknown').join(', ');
    if (assigneeNames) {
      await createNotification(
        'subtask_assigned',
        'Subtask Assigned',
        `You have been assigned subtask: ${subtask.name}`,
        { type: 'subtask', id: subtaskId }
      );
    }
  }, [employees, createNotification]);

  const updateSubtask = useCallback(async (subtaskId: string, updates: Partial<Subtask>) => {
    const subtask = subtasks.find(s => s.id === subtaskId);
    if (subtask && updates.status === 'completed' && subtask.status !== 'completed') {
      const employee = employees.find(e => e.id === subtask.assignedTo[0]);
      await createNotification(
        'subtask_completed',
        'Subtask Completed',
        `${employee?.name} completed subtask: ${subtask.name}`,
        { type: 'subtask', id: subtaskId }
      );
    }
    await updateDoc(doc(db, 'subtasks', subtaskId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }, [subtasks, employees, createNotification]);

  const deleteSubtask = useCallback(async (subtaskId: string) => {
    await deleteDoc(doc(db, 'subtasks', subtaskId));
  }, []);

  const addEmployee = useCallback(async (employee: Omit<Employee, 'id'>) => {
    const employeeId = `emp-${Date.now()}`;
    const firebaseUid = await createFirebaseUser(employee.email, employee.password);
    if (!firebaseUid) {
      console.error('Failed to create Firebase Auth user for employee');
      return;
    }
    await setDoc(doc(db, 'employees', employeeId), {
      ...employee,
      id: employeeId,
      firebaseUid
    });
  }, []);

  const updateEmployee = useCallback(async (employeeId: string, updates: Partial<Employee>) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    let uid = employee.firebaseUid;

    if (!uid) {
      const found = await findUserByEmail(employee.email);
      if (found) {
        uid = found.uid;
        await updateDoc(doc(db, 'employees', employeeId), { firebaseUid: uid });
      }
    }

    if (!uid) {
      const createdUid = await createFirebaseUser(employee.email, employee.password);
      if (createdUid) {
        uid = createdUid;
        await updateDoc(doc(db, 'employees', employeeId), { firebaseUid: uid });
      }
    }

    if (!uid) {
      throw new Error('Could not find or create Firebase Auth user for this employee');
    }

    if (updates.email && updates.email !== employee.email) {
      const success = await updateFirebaseUserEmail(uid, updates.email);
      if (!success) {
        throw new Error('Failed to update email in Firebase Auth');
      }
    }

    if (updates.password && updates.password !== employee.password) {
      const success = await updateFirebaseUserPassword(uid, updates.password);
      if (!success) {
        throw new Error('Failed to update password in Firebase Auth');
      }
    }

    await updateDoc(doc(db, 'employees', employeeId), updates);
  }, [employees]);

  const deleteEmployee = useCallback(async (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee?.firebaseUid) {
      await deleteFirebaseUser(employee.firebaseUid);
    }
    await deleteDoc(doc(db, 'employees', employeeId));
  }, [employees]);

  const addRole = useCallback(async (role: Omit<Role, 'id'>) => {
    const roleId = `role-${Date.now()}`;
    await setDoc(doc(db, 'roles', roleId), {
      ...role,
      id: roleId
    });
  }, []);

  const updateRole = useCallback(async (roleId: string, updates: Partial<Role>) => {
    await updateDoc(doc(db, 'roles', roleId), updates);
  }, []);

  const deleteRole = useCallback(async (roleId: string) => {
    await deleteDoc(doc(db, 'roles', roleId));
  }, []);

  function sanitizeForFirestore(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (obj instanceof Date) return Timestamp.fromDate(obj);
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeForFirestore(item));
    }
    if (obj instanceof Timestamp) return obj;
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result;
  }

  const addNotificationRule = useCallback(async (rule: Omit<NotificationRule, 'id'>) => {
    const ruleId = `notif-rule-${Date.now()}`;
    const cleanData: any = sanitizeForFirestore({
      id: ruleId,
      event: rule.event || '',
      subject: rule.subject || '',
      message: rule.message || '',
      enabled: rule.enabled !== undefined ? rule.enabled : true,
      primaryRecipients: Array.isArray(rule.primaryRecipients) ? rule.primaryRecipients : [],
      ccRecipients: Array.isArray(rule.ccRecipients) ? rule.ccRecipients : []
    });
    await setDoc(doc(db, 'notificationRules', ruleId), cleanData);
  }, []);

  const updateNotificationRule = useCallback(async (ruleId: string, updates: Partial<NotificationRule>) => {
    const cleanData = sanitizeForFirestore({
      event: updates.event,
      subject: updates.subject,
      message: updates.message,
      enabled: updates.enabled,
      primaryRecipients: updates.primaryRecipients,
      ccRecipients: updates.ccRecipients
    });
    await updateDoc(doc(db, 'notificationRules', ruleId), cleanData);
  }, []);

  const deleteNotificationRule = useCallback(async (ruleId: string) => {
    await deleteDoc(doc(db, 'notificationRules', ruleId));
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(async (userId: string) => {
    const mine = notifications.filter(n => !n.read && (!n.recipientId || n.recipientId === userId));
    await Promise.all(mine.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    setNotifications(prev => prev.map(n => (!n.read && (!n.recipientId || n.recipientId === userId)) ? { ...n, read: true } : n));
  }, [notifications]);

  const addComment = useCallback(async ({ taskId, subtaskId, userId, content, defectId, actionPointId, qaCycleId }: {
    taskId?: string;
    subtaskId?: string;
    userId: string;
    content: string;
    defectId?: string;
    actionPointId?: string;
    qaCycleId?: string;
  }) => {
    const user = employees.find(e => e.id === userId);
    await addDoc(collection(db, 'comments'), {
      taskId: taskId || null,
      subtaskId: subtaskId || null,
      defectId: defectId || null,
      actionPointId: actionPointId || null,
      qaCycleId: qaCycleId || null,
      userId,
      userName: user?.name || 'Unknown',
      content,
      timestamp: serverTimestamp()
    });
  }, [employees]);

  const getCommentsForTask = useCallback((taskId: string) => {
    return comments.filter(comment => comment.taskId === taskId);
  }, [comments]);

  const getCommentsForSubtask = useCallback((subtaskId: string) => {
    return comments.filter(comment => comment.subtaskId === subtaskId);
  }, [comments]);

  const getCommentsForDefect = useCallback((defectId: string) => {
    return comments.filter(comment => comment.defectId === defectId);
  }, [comments]);

  const getCommentsForActionPoint = useCallback((apId: string) => {
    return comments.filter(comment => comment.actionPointId === apId);
  }, [comments]);

  const getSubtasksForTask = useCallback((taskId: string) => {
    return subtasks.filter(subtask => subtask.taskId === taskId);
  }, [subtasks]);

  const getTasksForEmployee = useCallback((employeeId: string) => {
    return tasks.filter(task => task.assignedTo.includes(employeeId));
  }, [tasks]);

  const getGoalsForApp = useCallback((appId: string) => {
    return goals.filter(goal => goal.appId === appId);
  }, [goals]);

  const getTasksForGoal = useCallback((goalId: string) => {
    return tasks.filter(task => task.goalId === goalId);
  }, [tasks]);

  const getAppById = useCallback((appId: string) => {
    return apps.find(a => a.id === appId);
  }, [apps]);

  const getGoalById = useCallback((goalId: string) => {
    return goals.find(g => g.id === goalId);
  }, [goals]);

  const getEmployeeById = useCallback((employeeId: string) => {
    return employees.find(e => e.id === employeeId);
  }, [employees]);

  const generateDefectCode = useCallback(() => {
    const count = defects.length + 1;
    return `BUG-${String(count).padStart(4, '0')}`;
  }, [defects.length]);

  const addDefect = useCallback(async (defectData: Omit<Defect, 'id' | 'defectCode' | 'createdAt' | 'updatedAt' | 'activityLogs' | 'reopenedCount' | 'fixVerified'>) => {
    const defectId = `defect-${Date.now()}`;
    const defectCode = generateDefectCode();
    const reporter = employees.find(e => e.id === defectData.reportedBy);

    const newDefect: Defect = {
      ...defectData,
      id: defectId,
      defectCode,
      createdAt: new Date(),
      updatedAt: new Date(),
      activityLogs: [{
        id: `log-${Date.now()}`,
        action: 'created',
        userId: defectData.reportedBy,
        userName: reporter?.name || 'Unknown',
        timestamp: new Date(),
        details: 'Defect created'
      }],
      reopenedCount: 0,
      fixVerified: false
    };

    await setDoc(doc(db, 'defects', defectId), sanitizeForFirestore({
      ...newDefect,
      dateReported: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await addActivity({
      type: 'task_created',
      userId: defectData.reportedBy,
      userName: reporter?.name || 'Unknown',
      description: `reported defect "${defectData.title}" (${defectCode})`,
      relatedTo: { type: 'task', id: defectId, name: defectData.title }
    });

    if (defectData.assignedTo) {
      await notifyWork(
        'defect_assigned',
        `Defect Assigned: ${defectData.title}`,
        `You have been assigned defect ${defectCode}: ${defectData.title}`,
        [defectData.assignedTo],
        { type: 'defect', id: defectId }
      );
    }

    return newDefect;
  }, [employees, generateDefectCode, addActivity, notifyWork]);

  const updateDefect = useCallback(async (defectId: string, updates: Partial<Defect>, userId?: string, userName?: string) => {
    const defect = defects.find(d => d.id === defectId);
    if (!defect) return;

    const statusChanged = !!updates.status && updates.status !== defect.status;

    if (updates.status && updates.status !== defect.status) {
      const allowed = canTransitionWork({
        kind: 'defect',
        currentStatus: defect.status,
        nextStatus: updates.status,
        workType: defect.workType || 'development',
        can: hasPermission
      });
      if (!allowed) {
        console.warn(`[Workflow] Defect ${defectId} transition ${defect.status} -> ${updates.status} blocked for current role.`);
        return;
      }
      if (updates.status === 'closed') {
        const blockers = workDependencies.filter(d =>
          d.toKind === 'defect' && d.toId === defectId && d.type === 'blocked_by'
        );
        if (blockers.length > 0) {
          console.warn(`[Workflow] Defect ${defectId} blocked by ${blockers.length} dependency(ies); cannot close.`);
          return;
        }
      }
    }

    const updateData: any = { ...updates, updatedAt: new Date() };

    if (updates.status === 'resolved' && defect.status !== 'resolved') {
      updateData.resolutionStatus = updates.resolutionStatus || 'fixed';
    }

    if (updates.status === 'closed' && defect.status !== 'closed') {
      updateData.closedAt = new Date();
    }

    if (updates.status === 'reopened' && defect.status === 'closed') {
      updateData.reopenedCount = (defect.reopenedCount || 0) + 1;
      updateData.status = 'in_progress';
      updateData.fixVerified = false;
    }

    if (updates.fixVerified && !defect.fixVerified) {
      updateData.verificationDate = new Date();
      updateData.status = 'closed';
      updateData.closedAt = new Date();
      if (userId) updateData.testedBy = userId;
      updateData.testCycle = `QA-${String((defect.reopenedCount || 0) + 1).padStart(2, '0')}`;
    }

    if (userId && userName) {
      const currentLogs = defect.activityLogs || [];
      const action = updates.status ? `status changed to ${updates.status}` : 'updated';
      updateData.activityLogs = [
        ...currentLogs,
        {
          id: `log-${Date.now()}`,
          action,
          userId,
          userName,
          timestamp: new Date(),
          details: updates.status ? `Status: ${defect.status} → ${updates.status}` : undefined
        }
      ];
    }

    await updateDoc(doc(db, 'defects', defectId), sanitizeForFirestore(updateData));

    if (statusChanged) {
      await runAutomationForEventRef.current?.('defect_status_changed', {
        workKind: 'defect',
        workId: defectId,
        workStatus: updates.status || defect.status,
        workType: defect.workType || 'development'
      });
    }
  }, [defects, hasPermission, workDependencies]);

  const deleteDefect = useCallback(async (defectId: string) => {
    await deleteDoc(doc(db, 'defects', defectId));
    setDefects(prev => prev.filter(d => d.id !== defectId));
  }, []);

  const addDefectComment = useCallback(async (defectId: string, userId: string, userName: string, content: string) => {
    const defect = defects.find(d => d.id === defectId);
    if (!defect) return;

    const currentLogs = defect.activityLogs || [];
    await updateDoc(doc(db, 'defects', defectId), {
      activityLogs: [
        ...currentLogs,
        {
          id: `log-${Date.now()}`,
          action: 'comment',
          userId,
          userName,
          timestamp: new Date(),
          details: content
        }
      ],
      updatedAt: serverTimestamp()
    });
  }, [defects]);

  const getDefectsForApp = useCallback((appId: string) => {
    return defects.filter(d => d.applicationId === appId);
  }, [defects]);

  const getDefectById = useCallback((defectId: string) => {
    return defects.find(d => d.id === defectId);
  }, [defects]);

  const addPhase = useCallback(async (phaseData: Omit<Phase, 'id' | 'createdAt'>) => {
    const phaseId = `phase-${Date.now()}`;
    await setDoc(doc(db, 'phases', phaseId), {
      ...phaseData,
      id: phaseId,
      createdAt: new Date()
    });
  }, []);

  const updatePhase = useCallback(async (phaseId: string, updates: Partial<Phase>) => {
    await updateDoc(doc(db, 'phases', phaseId), updates);
  }, []);

  const deletePhase = useCallback(async (phaseId: string) => {
    const phaseGoals = goals.filter(g => g.phaseId === phaseId);
    for (const goal of phaseGoals) {
      const goalTasks = tasks.filter(t => t.goalId === goal.id);
      for (const task of goalTasks) {
        const taskSubtasks = subtasks.filter(s => s.taskId === task.id);
        for (const subtask of taskSubtasks) {
          await deleteDoc(doc(db, 'subtasks', subtask.id));
        }
        await deleteDoc(doc(db, 'tasks', task.id));
      }
      await deleteDoc(doc(db, 'goals', goal.id));
    }
    await deleteDoc(doc(db, 'phases', phaseId));
  }, [goals, tasks, subtasks]);

  const getPhasesForApp = useCallback((appId: string) => {
    return phases.filter(p => p.appId === appId);
  }, [phases]);

  const getPhaseById = useCallback((phaseId: string) => {
    return phases.find(p => p.id === phaseId);
  }, [phases]);

  const addAppDocument = useCallback(async (docData: Omit<AppDocument, 'id' | 'createdAt'>) => {
    const docId = `appdoc-${Date.now()}`;
    await setDoc(doc(db, 'appDocuments', docId), {
      ...docData,
      id: docId,
      createdAt: new Date()
    });
  }, []);

  const deleteAppDocument = useCallback(async (docId: string) => {
    await deleteDoc(doc(db, 'appDocuments', docId));
  }, []);

  const getDocumentsForApp = useCallback((appId: string) => {
    return appDocuments.filter(d => d.appId === appId);
  }, [appDocuments]);

  const addModule = useCallback(async (m: Omit<Module, 'id' | 'createdAt'>) => {
    const moduleId = `mod-${Date.now()}`;
    await setDoc(doc(db, 'modules', moduleId), {
      ...m,
      id: moduleId,
      createdAt: serverTimestamp()
    });
    setModules(prev => [{ ...m, id: moduleId, createdAt: new Date() } as Module, ...prev]);
  }, []);

  const updateModule = useCallback(async (moduleId: string, updates: Partial<Module>) => {
    await updateDoc(doc(db, 'modules', moduleId), sanitizeForFirestore(updates));
  }, []);

  const deleteModule = useCallback(async (moduleId: string) => {
    await deleteDoc(doc(db, 'modules', moduleId));
    setModules(prev => prev.filter(m => m.id !== moduleId));
  }, []);

  const getModulesForApp = useCallback((appId: string) => {
    return modules.filter(m => m.appId === appId);
  }, [modules]);

  const addExpectation = useCallback(async (exp: Omit<ModuleExpectation, 'id' | 'createdAt'>) => {
    const expId = `exp-${Date.now()}`;
    await setDoc(doc(db, 'moduleExpectations', expId), {
      ...exp,
      id: expId,
      createdAt: serverTimestamp()
    });
    setExpectations(prev => [{ ...exp, id: expId, createdAt: new Date() } as ModuleExpectation, ...prev]);
  }, []);

  const updateExpectation = useCallback(async (expId: string, updates: Partial<ModuleExpectation>) => {
    await updateDoc(doc(db, 'moduleExpectations', expId), sanitizeForFirestore(updates));
  }, []);

  const deleteExpectation = useCallback(async (expId: string) => {
    await deleteDoc(doc(db, 'moduleExpectations', expId));
    setExpectations(prev => prev.filter(e => e.id !== expId));
  }, []);

  const getExpectationsForModule = useCallback((moduleId: string) => {
    return expectations.filter(e => e.moduleId === moduleId);
  }, [expectations]);

  const addActionPoint = useCallback(async (ap: Omit<ActionPoint, 'id' | 'createdAt' | 'taskId'> & { taskId?: string }) => {
    const apId = `ap-${Date.now()}`;
    const now = new Date();

    const goal = ap.goalId ? goals.find(g => g.id === ap.goalId) : null;
    const appId = ap.appId || goal?.appId;
    const phaseId = ap.phaseId || goal?.phaseId;

    let linkedTaskId = ap.taskId;

    if (!linkedTaskId && ap.goalId) {
      const task = await addTask({
        name: ap.title,
        description: ap.description || '',
        goalId: ap.goalId,
        appId,
        phaseId,
        assignedTo: ap.assignedTo,
        priority: ap.priority,
        status: 'not_started',
        workType: ap.workType
      });
      linkedTaskId = (task as any)?.id;
    }

    await setDoc(doc(db, 'actionPoints', apId), sanitizeForFirestore({
      id: apId,
      title: ap.title,
      description: ap.description || '',
      goalId: ap.goalId || null,
      appId: appId || null,
      phaseId: phaseId || null,
      assignedTo: ap.assignedTo,
      priority: ap.priority,
      status: 'pending',
      weekStart: ap.weekStart,
      date: ap.date,
      taskId: linkedTaskId || null,
      createdBy: ap.createdBy,
      createdAt: now,
      notes: ap.notes || '',
      workType: ap.workType || 'non-development',
      source: ap.source || 'manual'
    }));

    await notifyWork(
      'action_point_assigned',
      'New Action Point',
      `You have been assigned action point: ${ap.title}`,
      ap.assignedTo,
      { type: 'action_point', id: apId }
    );
  }, [addTask, goals, notifyWork]);

  const updateActionPoint = useCallback(async (apId: string, updates: Partial<ActionPoint>) => {
    await updateDoc(doc(db, 'actionPoints', apId), sanitizeForFirestore(updates));
  }, []);

  const deleteActionPoint = useCallback(async (apId: string) => {
    const ap = actionPoints.find(a => a.id === apId);
    if (ap?.taskId) {
      await deleteDoc(doc(db, 'tasks', ap.taskId));
    }
    await deleteDoc(doc(db, 'actionPoints', apId));
  }, [actionPoints]);

  const addTag = useCallback(async (tag: Omit<Tag, 'id' | 'createdAt'>) => {
    const tagId = `tag-${Date.now()}`;
    await setDoc(doc(db, 'tags', tagId), {
      ...tag,
      id: tagId,
      createdAt: serverTimestamp()
    });
    setTags(prev => [{ ...tag, id: tagId, createdAt: new Date() }, ...prev]);
  }, []);

  const updateTag = useCallback(async (tagId: string, updates: Partial<Tag>) => {
    await updateDoc(doc(db, 'tags', tagId), updates);
  }, []);

  const deleteTag = useCallback(async (tagId: string) => {
    await deleteDoc(doc(db, 'tags', tagId));
    setTags(prev => prev.filter(t => t.id !== tagId));
  }, []);

  const getTagsForApp = useCallback((appId: string) => {
    return tags.filter(t => t.appId === appId);
  }, [tags]);

  const addSprint = useCallback(async (sprint: Omit<Sprint, 'id' | 'createdAt'>) => {
    const sprintId = `sprint-${Date.now()}`;
    await setDoc(doc(db, 'sprints', sprintId), {
      ...sprint,
      id: sprintId,
      createdAt: serverTimestamp()
    });
    setSprints(prev => [{ ...sprint, id: sprintId, createdAt: new Date() }, ...prev]);
  }, []);

  const updateSprint = useCallback(async (sprintId: string, updates: Partial<Sprint>) => {
    await updateDoc(doc(db, 'sprints', sprintId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }, []);

  const deleteSprint = useCallback(async (sprintId: string) => {
    await deleteDoc(doc(db, 'sprints', sprintId));
    setSprints(prev => prev.filter(s => s.id !== sprintId));
  }, []);

  const getSprintsForApp = useCallback((appId: string) => {
    return sprints.filter(s => s.appId === appId);
  }, [sprints]);

  const getSprintById = useCallback((sprintId: string) => {
    return sprints.find(s => s.id === sprintId);
  }, [sprints]);

  const addQaCycle = useCallback(async (cycle: Omit<QaCycle, 'id' | 'createdAt' | 'cycleNumber'>) => {
    const cycleId = `qa-cycle-${Date.now()}`;
    const existing = qaCycles.filter(c => c.workKind === cycle.workKind && c.workId === cycle.workId);
    const cycleNumber = existing.length > 0 ? Math.max(...existing.map(c => c.cycleNumber)) + 1 : 1;
    await setDoc(doc(db, 'qaCycles', cycleId), {
      ...cycle,
      id: cycleId,
      cycleNumber,
      createdAt: serverTimestamp(),
      testedAt: serverTimestamp()
    });
    setQaCycles(prev => [{ ...cycle, id: cycleId, cycleNumber, createdAt: new Date(), testedAt: new Date() }, ...prev]);
    return cycleId;
  }, [qaCycles]);

  const getQaCyclesForWork = useCallback((workKind: string, workId: string) => {
    return qaCycles
      .filter(c => c.workKind === workKind && c.workId === workId)
      .sort((a, b) => b.cycleNumber - a.cycleNumber || b.testedAt.getTime() - a.testedAt.getTime());
  }, [qaCycles]);

  const recordQaResult = useCallback(async (args: {
    workKind: 'task' | 'defect' | 'action_point';
    workId: string;
    environment: QaCycle['environment'];
    result: QaCycleResult;
    notes: string;
    defectsDiscovered: string[];
  }) => {
    const { workKind, workId, environment, result, notes, defectsDiscovered } = args;
    if (!currentUser) return null;

    const existing = qaCycles.filter(c => c.workKind === workKind && c.workId === workId);
    const cycleNumber = nextQaCycleNumber(existing, workKind, workId);

    const transition = getQaTransition({
      kind: workKind,
      currentStatus: workKind === 'defect' ? (defects.find(d => d.id === workId)?.status || 'open')
        : workKind === 'task' ? (tasks.find(t => t.id === workId)?.status || 'not_started')
        : 'pending',
      result,
      can: hasPermission
    });

    if (!transition) {
      console.warn('[QA] Transition not permitted for current role.');
      return null;
    }

    if (workKind === 'defect') {
      await updateDefect(workId, {
        status: transition.status as DefectStatus,
        fixVerified: transition.fixVerified,
        ...(transition.reopen ? { status: 'in_progress' as DefectStatus, reopenedCount: (defects.find(d => d.id === workId)?.reopenedCount || 0) + 1 } : {})
      }, currentUser.id, currentUser.name);
    } else if (workKind === 'task') {
      await updateTask(workId, { status: transition.status as TaskStatus });
    }

    const cycleId = await addQaCycle({
      workKind,
      workId,
      testerId: currentUser.id,
      environment,
      result,
      notes,
      defectsDiscovered
    });

    return cycleId;
  }, [qaCycles, defects, tasks, currentUser, hasPermission, updateDefect, updateTask, addQaCycle]);

  const addWorkDependency = useCallback(async (dep: Omit<WorkDependency, 'id' | 'createdAt'>) => {
    const depId = `dep-${Date.now()}`;
    await setDoc(doc(db, 'workDependencies', depId), {
      ...dep,
      id: depId,
      createdAt: serverTimestamp()
    });
    setWorkDependencies(prev => [{ ...dep, id: depId, createdAt: new Date() }, ...prev]);
    return depId;
  }, []);

  const deleteWorkDependency = useCallback(async (depId: string) => {
    await deleteDoc(doc(db, 'workDependencies', depId));
    setWorkDependencies(prev => prev.filter(d => d.id !== depId));
  }, []);

  const getDependenciesForWork = useCallback((kind: string, id: string) => {
    return workDependencies.filter(d => (d.fromKind === kind && d.fromId === id) || (d.toKind === kind && d.toId === id));
  }, [workDependencies]);

  const isWorkBlocked = useCallback((kind: string, id: string) => {
    return workDependencies.some(d =>
      (d.toKind === kind && d.toId === id && d.type === 'blocked_by') ||
      (d.fromKind === kind && d.fromId === id && d.type === 'blocks' && false)
    );
  }, [workDependencies]);

  const addWorkTemplate = useCallback(async (template: Omit<WorkTemplate, 'id' | 'createdAt'>) => {
    const templateId = `wt-${Date.now()}`;
    await setDoc(doc(db, 'workTemplates', templateId), {
      ...template,
      id: templateId,
      createdAt: serverTimestamp()
    });
    setWorkTemplates(prev => [{ ...template, id: templateId, createdAt: new Date() }, ...prev]);
    return templateId;
  }, []);

  const deleteWorkTemplate = useCallback(async (templateId: string) => {
    await deleteDoc(doc(db, 'workTemplates', templateId));
    setWorkTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const createWorkFromTemplate = useCallback(async (templateId: string, overrides?: { appId?: string; goalId?: string; assignedTo?: string[] }) => {
    const template = workTemplates.find(t => t.id === templateId);
    if (!template) return null;
    const appId = overrides?.appId || template.appId;
    const assignedTo = overrides?.assignedTo || [];
    if (template.workKind === 'task') {
      const taskId = `task-${Date.now()}`;
      await setDoc(doc(db, 'tasks', taskId), {
        id: taskId,
        goalId: overrides?.goalId,
        appId,
        name: template.fields.title,
        description: template.fields.description || '',
        assignedTo,
        status: 'not_started',
        priority: template.fields.priority || 'medium',
        workType: template.fields.workType || 'non-development',
        tags: [],
        createdAt: serverTimestamp(),
        origin: { source: 'template', templateId }
      });
      for (const sub of template.fields.subtasks || []) {
        await setDoc(doc(db, 'subtasks', `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), {
          id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          taskId,
          name: sub,
          assignedTo,
          status: 'pending',
          priority: 'medium',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      return taskId;
    }
    if (template.workKind === 'action_point') {
      const apId = `ap-${Date.now()}`;
      await setDoc(doc(db, 'actionPoints', apId), {
        id: apId,
        title: template.fields.title,
        description: template.fields.description || '',
        assignedTo,
        priority: template.fields.priority || 'medium',
        status: 'pending',
        weekStart: new Date(),
        date: new Date(),
        createdBy: currentUser?.id || '',
        createdAt: new Date(),
        notes: '',
        workType: template.fields.workType || 'non-development',
        source: 'manual'
      });
      return apId;
    }
    if (template.workKind === 'defect') {
      const defectId = `defect-${Date.now()}`;
      await setDoc(doc(db, 'defects', defectId), {
        id: defectId,
        defectCode: `DEF-${Date.now().toString().slice(-4)}`,
        title: template.fields.title,
        description: template.fields.description || '',
        applicationId: appId || '',
        module: '',
        environment: 'staging',
        reportedBy: currentUser?.id || '',
        assignedTo: assignedTo[0] || '',
        dateReported: new Date(),
        issueType: template.fields.issueType || 'functional',
        severity: template.fields.severity || 'minor',
        priority: template.fields.priority || 'medium',
        reproducibility: 'sometimes',
        frequency: 'sometimes',
        status: 'open',
        fixVerified: false,
        reopenedCount: 0,
        stepsToReproduce: '',
        expectedResult: '',
        actualResult: '',
        qaComments: '',
        developerNotes: '',
        activityLogs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        workType: 'development',
        origin: { source: 'template', templateId }
      });
      return defectId;
    }
    return null;
  }, [workTemplates, currentUser]);

  const addAutomation = useCallback(async (automation: Omit<Automation, 'id' | 'runHistory' | 'createdAt' | 'updatedAt'>) => {
    const automationId = `auto-${Date.now()}`;
    await setDoc(doc(db, 'automations', automationId), {
      ...automation,
      id: automationId,
      runHistory: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setAutomations(prev => [{ ...automation, id: automationId, runHistory: [], createdAt: new Date() }, ...prev]);
    return automationId;
  }, []);

  const updateAutomation = useCallback(async (automationId: string, updates: Partial<Automation>) => {
    await updateDoc(doc(db, 'automations', automationId), sanitizeForFirestore({ ...updates, updatedAt: serverTimestamp() }));
    setAutomations(prev => prev.map(a => (a.id === automationId ? { ...a, ...updates, updatedAt: new Date() } : a)));
  }, []);

  const deleteAutomation = useCallback(async (automationId: string) => {
    await deleteDoc(doc(db, 'automations', automationId));
    setAutomations(prev => prev.filter(a => a.id !== automationId));
  }, []);

  const automationLockRef = useRef<Map<string, number>>(new Map());
  const automationRunsRef = useRef(0);
  const automationWindowRef = useRef(Date.now());

  /**
   * Evaluate all enabled rules for an event and apply matching actions.
   * Idempotency: dedupe by (event, workId, ruleId) with a 30s window;
   * rate cap: max 20 executions / 10s; never re-enters for same key.
   */
  const runAutomationForEvent = useCallback(async (evt: AutomationTriggerEvent, payload: {
    workKind: string;
    workId: string;
    workStatus: string;
    workType?: string;
  }) => {
    const now = Date.now();
    if (now - automationWindowRef.current > 10000) {
      automationWindowRef.current = now;
      automationRunsRef.current = 0;
    }
    if (automationRunsRef.current >= 20) {
      console.warn('[Automation] Rate cap reached (20 runs / 10s); skipping.');
      return;
    }

    for (const rule of automations) {
      const key = `${evt}|${payload.workId}|${rule.id}`;
      const last = automationLockRef.current.get(key);
      if (last && now - last < 30000) continue;

      const verdict = evaluateAutomation(rule, {
        event: evt,
        workKind: payload.workKind,
        workId: payload.workId,
        workStatus: payload.workStatus,
        workType: payload.workType
      }, { event: evt, workId: payload.workId, ruleId: rule.id, timestamp: last || 0 });

      if (!verdict.applies) continue;

      automationLockRef.current.set(key, now);
      automationRunsRef.current += 1;

      const runId = nextRunId();
      const outcome: Automation['runHistory'][number] = {
        runId,
        runAt: new Date(),
        workKind: payload.workKind,
        workId: payload.workId,
        event: evt,
        outcome: 'applied',
        note: verdict.reason
      };

      try {
        if (rule.action.setStatus) {
          if (payload.workKind === 'task') {
            await updateTask(payload.workId, { status: rule.action.setStatus as TaskStatus });
          } else if (payload.workKind === 'defect') {
            await updateDefect(payload.workId, { status: rule.action.setStatus as DefectStatus });
          } else if (payload.workKind === 'action_point') {
            await updateActionPoint(payload.workId, { status: rule.action.setStatus as ActionPointStatus });
          }
        }
        if (rule.action.addTag && payload.workKind === 'task') {
          const task = tasks.find(t => t.id === payload.workId);
          if (task) {
            await updateTask(payload.workId, { tags: [...new Set([...(task.tags || []), rule.action.addTag])] });
          }
        }
        if (rule.action.notify) {
          const { role, userIds, message } = rule.action.notify;
          const targets = userIds?.length
            ? userIds
            : role ? employees.filter(e => roles.find(r => r.id === e.roleId)?.permissions.includes(role)).map(e => e.id)
            : [];
          if (targets.length > 0) {
            await notifyWork(
              'work_status_changed',
              rule.name,
              message || `Automation "${rule.name}" applied to ${payload.workKind}.`,
              targets,
              { type: payload.workKind === 'defect' ? 'defect' : payload.workKind === 'action_point' ? 'action_point' : 'work', id: payload.workId }
            );
          }
        }
        outcome.outcome = 'applied';
      } catch (e) {
        console.error('[Automation] Action failed:', e);
        outcome.outcome = 'skipped';
        outcome.note = String(e);
      }

      const updatedHistory = [...(rule.runHistory || []), outcome];
      await updateDoc(doc(db, 'automations', rule.id), sanitizeForFirestore({
        runHistory: updatedHistory,
        updatedAt: serverTimestamp()
      }));
      setAutomations(prev => prev.map(a => (a.id === rule.id ? { ...a, runHistory: updatedHistory, updatedAt: new Date() } : a)));
    }
  }, [automations, tasks, employees, roles, updateTask, updateDefect, updateActionPoint, notifyWork]);

  runAutomationForEventRef.current = runAutomationForEvent;

  const addRepository = useCallback(async (repo: Omit<Repository, 'id' | 'createdAt'>) => {
    const repoId = `repo-${Date.now()}`;
    await setDoc(doc(db, 'repositories', repoId), {
      ...repo,
      id: repoId,
      createdAt: serverTimestamp()
    });
    setRepositories(prev => [{ ...repo, id: repoId, createdAt: new Date() }, ...prev]);
    return repoId;
  }, []);

  const updateRepository = useCallback(async (repoId: string, updates: Partial<Repository>) => {
    await updateDoc(doc(db, 'repositories', repoId), sanitizeForFirestore({ ...updates, updatedAt: serverTimestamp() }));
  }, []);

  const deleteRepository = useCallback(async (repoId: string) => {
    await deleteDoc(doc(db, 'repositories', repoId));
    setRepositories(prev => prev.filter(r => r.id !== repoId));
  }, []);

  const getRepositoriesForApp = useCallback((appId: string) => {
    return repositories.filter(r => r.appId === appId);
  }, [repositories]);

  /** Attach/refresh the GitHub sub-doc on a task or defect (additive). */
  const updateWorkGithub = useCallback(async (kind: 'task' | 'defect', workId: string, github: Partial<GithubSubDoc>) => {
    if (kind === 'task') {
      const task = tasks.find(t => t.id === workId);
      if (!task) return;
      await updateTask(workId, { github: { status: 'not_started', ...(task.github || {}), ...github } });
    } else {
      const defect = defects.find(d => d.id === workId);
      if (!defect) return;
      await updateDefect(workId, { github: { status: 'not_started', ...(defect.github || {}), ...github } });
    }
  }, [tasks, defects, updateTask, updateDefect]);

  return (
    <AppContext.Provider
      value={{
        apps,
        goals,
        tasks,
        subtasks,
        employees,
        roles,
        notificationRules,
        notifications,
        activities,
        comments,
        defects,
        phases,
        loading,
        addApp,
        updateApp,
        deleteApp,
        addGoal,
        updateGoal,
        deleteGoal,
        addTask,
        deleteTask,
        updateTask,
        approveTask,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addRole,
        updateRole,
        deleteRole,
        addNotificationRule,
        updateNotificationRule,
        deleteNotificationRule,
        markNotificationRead,
        markAllNotificationsRead,
        notifyWork,
        addComment,
        getCommentsForTask,
        getCommentsForSubtask,
        getCommentsForDefect,
        getCommentsForActionPoint,
        getSubtasksForTask,
        getTasksForEmployee,
        getGoalsForApp,
        getTasksForGoal,
        getAppById,
        getGoalById,
        getEmployeeById,
        addDefect,
        updateDefect,
        deleteDefect,
        addDefectComment,
        getDefectsForApp,
        getDefectById,
        addPhase,
        updatePhase,
        deletePhase,
        getPhasesForApp,
        getPhaseById,
        appDocuments,
        addAppDocument,
        deleteAppDocument,
        getDocumentsForApp,
        modules,
        addModule,
        updateModule,
        deleteModule,
        getModulesForApp,
        expectations,
        addExpectation,
        updateExpectation,
        deleteExpectation,
        getExpectationsForModule,
        actionPoints,
        addActionPoint,
        updateActionPoint,
        deleteActionPoint,
        sendTaskNotification,
        sendActionPointNotification,
        sendDefectNotification,
        tags,
        addTag,
        updateTag,
        deleteTag,
        getTagsForApp,
        sprints,
        addSprint,
        updateSprint,
        deleteSprint,
        getSprintsForApp,
        getSprintById,
        qaCycles,
        addQaCycle,
        getQaCyclesForWork,
        recordQaResult,
        workDependencies,
        addWorkDependency,
        deleteWorkDependency,
        getDependenciesForWork,
        isWorkBlocked,
        workTemplates,
        addWorkTemplate,
        deleteWorkTemplate,
        createWorkFromTemplate,
        automations,
        addAutomation,
        updateAutomation,
        deleteAutomation,
        runAutomationForEvent,
        repositories,
        addRepository,
        updateRepository,
        deleteRepository,
        getRepositoriesForApp,
        updateWorkGithub
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
