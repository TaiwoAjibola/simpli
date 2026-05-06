import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendEmail } from '../../utils/sendEmail';
import {
  createFirebaseUser,
  updateFirebaseUserPassword,
  updateFirebaseUserEmail,
  deleteFirebaseUser
} from '../../firebase/auth-utils';
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
  Comment
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function docToApp(doc: any): App {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date()
  };
}

function docToGoal(doc: any): Goal {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date()
  };
}

function docToTask(doc: any): Task {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    dueDate: data.dueDate?.toDate(),
    completedAt: data.completedAt?.toDate(),
    approvedAt: data.approvedAt?.toDate()
  };
}

function docToSubtask(doc: any): Subtask {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date()
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

function docToActivity(doc: any): Activity {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate() || new Date()
  };
}

function docToComment(doc: any): Comment {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate() || new Date()
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
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
      { ref: query(collection(db, 'comments'), orderBy('timestamp', 'desc')), setter: setComments, transformer: docToComment }
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

  const createNotification = useCallback(async (
    type: Notification['type'],
    title: string,
    message: string,
    relatedTo?: Notification['relatedTo']
  ) => {
    await addDoc(collection(db, 'notifications'), {
      type,
      title,
      message,
      createdAt: serverTimestamp(),
      read: false,
      relatedTo
    });

    const matchingRules = notificationRules.filter(
      rule => rule.event === type && rule.enabled
    );

    for (const rule of matchingRules) {
      const recipientEmails: string[] = [];

      for (const recipient of rule.recipients) {
        if (recipient.type === 'user') {
          const user = employees.find(e => e.id === recipient.id);
          if (user?.email) recipientEmails.push(user.email);
        } else if (recipient.type === 'role') {
          const roleUsers = employees.filter(e => e.roleId === recipient.id);
          roleUsers.forEach(u => { if (u.email) recipientEmails.push(u.email); });
        }
      }

      const uniqueEmails = [...new Set(recipientEmails)];

      if (uniqueEmails.length > 0) {
        let variables: Record<string, string> = {};

        if (relatedTo?.type === 'task') {
          const task = tasks.find(t => t.id === relatedTo.id);
          if (task) {
            const goal = goals.find(g => g.id === task.goalId);
            const app = goal ? apps.find(a => a.id === goal.appId) : null;
            const assignee = task.assignedTo.length > 0 ? employees.find(e => e.id === task.assignedTo[0]) : null;

            variables = {
              task_name: task.name,
              task_description: task.description,
              task_status: task.status,
              task_priority: task.priority,
              task_due_date: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
              user_name: assignee?.name || '',
              assigned_user: assignee?.name || '',
              approver_name: '',
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
        }

        let emailSubject = rule.subject;
        let emailMessage = rule.message;

        for (const [key, value] of Object.entries(variables)) {
          emailSubject = emailSubject.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
          emailMessage = emailMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        await sendEmail(uniqueEmails, emailSubject, emailMessage.replace(/\n/g, '<br>'));
      }
    }
  }, [notificationRules, employees, tasks, goals, apps, subtasks]);

  const addApp = useCallback(async (app: Omit<App, 'id' | 'createdAt'>) => {
    const appId = `app-${Date.now()}`;
    await setDoc(doc(db, 'apps', appId), {
      ...app,
      id: appId,
      createdAt: serverTimestamp()
    });
    const employee = employees.find(e => e.id === app.createdBy);
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
    await setDoc(doc(db, 'goals', goalId), {
      ...goal,
      id: goalId,
      createdAt: serverTimestamp()
    });
    await addActivity({
      type: 'goal_created',
      userId: 'system',
      userName: 'System',
      description: `created goal "${goal.name}"`,
      relatedTo: { type: 'goal', id: goalId, name: goal.name }
    });
  }, [addActivity]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    await updateDoc(doc(db, 'goals', goalId), updates);
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
    await setDoc(doc(db, 'tasks', taskId), {
      ...task,
      id: taskId,
      createdAt: serverTimestamp()
    });
    const assigneeNames = task.assignedTo.map(id => employees.find(e => e.id === id)?.name || 'Unknown').join(', ');
    await addActivity({
      type: 'task_created',
      userId: task.assignedTo[0] || 'system',
      userName: assigneeNames,
      description: `was assigned task "${task.name}"`,
      relatedTo: { type: 'task', id: taskId, name: task.name }
    });
    await createNotification(
      'task_assigned',
      'New Task Assigned',
      `You have been assigned: ${task.name}`,
      { type: 'task', id: taskId }
    );
    return { id: taskId, ...task, createdAt: new Date() };
  }, [employees, addActivity, createNotification]);

  const deleteTask = useCallback(async (taskId: string) => {
    const taskSubtasks = subtasks.filter(s => s.taskId === taskId);
    for (const subtask of taskSubtasks) {
      await deleteDoc(doc(db, 'subtasks', subtask.id));
    }
    await deleteDoc(doc(db, 'tasks', taskId));
  }, [subtasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

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
  }, [tasks, employees, addActivity, createNotification]);

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

    if (updates.email && updates.email !== employee.email) {
      const success = await updateFirebaseUserEmail(employee.firebaseUid || employeeId, updates.email);
      if (!success) {
        throw new Error('Failed to update email in Firebase Auth');
      }
    }

    if (updates.password && updates.password !== employee.password) {
      const success = await updateFirebaseUserPassword(employee.firebaseUid || employeeId, updates.password);
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

  const addNotificationRule = useCallback(async (rule: Omit<NotificationRule, 'id'>) => {
    const ruleId = `notif-rule-${Date.now()}`;
    await setDoc(doc(db, 'notificationRules', ruleId), {
      ...rule,
      id: ruleId
    });
  }, []);

  const updateNotificationRule = useCallback(async (ruleId: string, updates: Partial<NotificationRule>) => {
    await updateDoc(doc(db, 'notificationRules', ruleId), updates);
  }, []);

  const deleteNotificationRule = useCallback(async (ruleId: string) => {
    await deleteDoc(doc(db, 'notificationRules', ruleId));
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  }, []);

  const addComment = useCallback(async ({ taskId, subtaskId, userId, content }: { taskId?: string; subtaskId?: string; userId: string; content: string }) => {
    const user = employees.find(e => e.id === userId);
    await addDoc(collection(db, 'comments'), {
      taskId: taskId || null,
      subtaskId: subtaskId || null,
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
        addComment,
        getCommentsForTask,
        getCommentsForSubtask,
        getSubtasksForTask,
        getTasksForEmployee,
        getGoalsForApp,
        getTasksForGoal,
        getAppById,
        getGoalById,
        getEmployeeById
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
