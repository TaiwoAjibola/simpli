import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  App,
  Goal,
  Milestone,
  Task,
  Employee,
  Role,
  NotificationRule,
  Notification,
  Activity,
  TaskStatus,
  Comment
} from '../types';
import {
  apps as initialApps,
  goals as initialGoals,
  milestones as initialMilestones,
  tasks as initialTasks,
  employees as initialEmployees,
  roles as initialRoles,
  notificationRules as initialNotificationRules,
  activities as initialActivities
} from '../data/mockData';

type AppContextType = {
  apps: App[];
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
  employees: Employee[];
  roles: Role[];
  notificationRules: NotificationRule[];
  notifications: Notification[];
  activities: Activity[];
  comments: Comment[];
  addApp: (app: Omit<App, 'id' | 'createdAt'>) => void;
  deleteApp: (appId: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  deleteGoal: (goalId: string) => void;
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  deleteMilestone: (milestoneId: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  approveTask: (taskId: string, approverId: string) => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => void;
  deleteEmployee: (employeeId: string) => void;
  addRole: (role: Omit<Role, 'id'>) => void;
  addNotificationRule: (rule: Omit<NotificationRule, 'id'>) => void;
  updateNotificationRule: (ruleId: string, updates: Partial<NotificationRule>) => void;
  deleteNotificationRule: (ruleId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  addComment: (taskId: string, userId: string, content: string) => void;
  getCommentsForTask: (taskId: string) => Comment[];
  getTasksForEmployee: (employeeId: string) => Task[];
  getGoalsForApp: (appId: string) => Goal[];
  getMilestonesForGoal: (goalId: string) => Milestone[];
  getTasksForMilestone: (milestoneId: string) => Task[];
  getAppById: (appId: string) => App | undefined;
  getGoalById: (goalId: string) => Goal | undefined;
  getMilestoneById: (milestoneId: string) => Milestone | undefined;
  getEmployeeById: (employeeId: string) => Employee | undefined;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<App[]>(initialApps);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>(initialNotificationRules);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [comments, setComments] = useState<Comment[]>([]);

  const addActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: `act-${Date.now()}`,
      timestamp: new Date()
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  const createNotification = (
    type: Notification['type'],
    title: string,
    message: string,
    relatedTo?: Notification['relatedTo']
  ) => {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      createdAt: new Date(),
      read: false,
      relatedTo
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const addApp = (app: Omit<App, 'id' | 'createdAt'>) => {
    const newApp: App = {
      ...app,
      id: `app-${Date.now()}`,
      createdAt: new Date()
    };
    setApps(prev => [...prev, newApp]);
    addActivity({
      type: 'app_created',
      userId: app.createdBy,
      userName: getEmployeeById(app.createdBy)?.name || 'Unknown',
      description: `created app "${newApp.name}"`,
      relatedTo: { type: 'app', id: newApp.id, name: newApp.name }
    });
  };

  const deleteApp = (appId: string) => {
    setApps(prev => prev.filter(a => a.id !== appId));
    const appGoals = goals.filter(g => g.appId === appId);
    appGoals.forEach(g => {
      const goalMilestones = milestones.filter(m => m.goalId === g.id);
      goalMilestones.forEach(m => {
        setTasks(prev => prev.filter(t => t.milestoneId !== m.id));
      });
      setMilestones(prev => prev.filter(m => m.goalId !== g.id));
    });
    setGoals(prev => prev.filter(g => g.appId !== appId));
  };

  const addGoal = (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    const newGoal: Goal = {
      ...goal,
      id: `goal-${Date.now()}`,
      createdAt: new Date()
    };
    setGoals(prev => [...prev, newGoal]);
    addActivity({
      type: 'goal_created',
      userId: 'system',
      userName: 'System',
      description: `created goal "${newGoal.name}"`,
      relatedTo: { type: 'goal', id: newGoal.id, name: newGoal.name }
    });
  };

  const deleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    const goalMilestones = milestones.filter(m => m.goalId === goalId);
    goalMilestones.forEach(m => {
      setTasks(prev => prev.filter(t => t.milestoneId !== m.id));
    });
    setMilestones(prev => prev.filter(m => m.goalId !== goalId));
  };

  const addMilestone = (milestone: Omit<Milestone, 'id'>) => {
    const newMilestone: Milestone = {
      ...milestone,
      id: `mile-${Date.now()}`
    };
    setMilestones(prev => [...prev, newMilestone]);
    addActivity({
      type: 'milestone_created',
      userId: 'system',
      userName: 'System',
      description: `created milestone "${newMilestone.name}"`,
      relatedTo: { type: 'milestone', id: newMilestone.id, name: newMilestone.name }
    });
  };

  const deleteMilestone = (milestoneId: string) => {
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
    setTasks(prev => prev.filter(t => t.milestoneId !== milestoneId));
  };

  const addTask = (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date()
    };
    setTasks(prev => [...prev, newTask]);
    const assigneeNames = task.assignedTo.map(id => getEmployeeById(id)?.name || 'Unknown').join(', ');
    addActivity({
      type: 'task_created',
      userId: task.assignedTo[0] || 'system',
      userName: assigneeNames,
      description: `was assigned task "${newTask.name}"`,
      relatedTo: { type: 'task', id: newTask.id, name: newTask.name }
    });
    createNotification(
      'task_assigned',
      'New Task Assigned',
      `You have been assigned: ${newTask.name}`,
      { type: 'task', id: newTask.id }
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          const updatedTask = { ...task, ...updates };

          if (updates.status === 'completed' && task.status !== 'completed') {
            updatedTask.completedAt = new Date();
            const employee = getEmployeeById(task.assignedTo[0] || '');
            addActivity({
              type: 'task_completed',
              userId: task.assignedTo[0] || 'system',
              userName: employee?.name || 'Unknown',
              description: `completed task "${task.name}"`,
              relatedTo: { type: 'task', id: task.id, name: task.name }
            });
            createNotification(
              'task_completed',
              'Task Completed',
              `${employee?.name} completed: ${task.name}`,
              { type: 'task', id: task.id }
            );
          }

          return updatedTask;
        }
        return task;
      })
    );
  };

  const approveTask = (taskId: string, approverId: string) => {
    setTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          const approver = getEmployeeById(approverId);
          addActivity({
            type: 'task_approved',
            userId: approverId,
            userName: approver?.name || 'Unknown',
            description: `approved task "${task.name}"`,
            relatedTo: { type: 'task', id: task.id, name: task.name }
          });
          createNotification(
            'task_approved',
            'Task Approved',
            `Your task "${task.name}" was approved by ${approver?.name}`,
            { type: 'task', id: task.id }
          );
          return {
            ...task,
            status: 'approved' as TaskStatus,
            approvedAt: new Date(),
            approvedBy: approverId
          };
        }
        return task;
      })
    );
  };

  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: `emp-${Date.now()}`
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const updateEmployee = (employeeId: string, updates: Partial<Employee>) => {
    setEmployees(prev =>
      prev.map(emp => (emp.id === employeeId ? { ...emp, ...updates } : emp))
    );
  };

  const deleteEmployee = (employeeId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== employeeId));
  };

  const addRole = (role: Omit<Role, 'id'>) => {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}`
    };
    setRoles(prev => [...prev, newRole]);
  };

  const addNotificationRule = (rule: Omit<NotificationRule, 'id'>) => {
    const newRule: NotificationRule = {
      ...rule,
      id: `notif-rule-${Date.now()}`
    };
    setNotificationRules(prev => [...prev, newRule]);
  };

  const updateNotificationRule = (ruleId: string, updates: Partial<NotificationRule>) => {
    setNotificationRules(prev =>
      prev.map(rule => (rule.id === ruleId ? { ...rule, ...updates } : rule))
    );
  };

  const deleteNotificationRule = (ruleId: string) => {
    setNotificationRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const addComment = (taskId: string, userId: string, content: string) => {
    const user = getEmployeeById(userId);
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      taskId,
      userId,
      userName: user?.name || 'Unknown',
      content,
      timestamp: new Date()
    };
    setComments(prev => [newComment, ...prev]);
  };

  const getCommentsForTask = (taskId: string) => {
    return comments.filter(comment => comment.taskId === taskId);
  };

  const getTasksForEmployee = (employeeId: string) => {
    return tasks.filter(task => task.assignedTo.includes(employeeId));
  };

  const getGoalsForApp = (appId: string) => {
    return goals.filter(goal => goal.appId === appId);
  };

  const getMilestonesForGoal = (goalId: string) => {
    return milestones.filter(milestone => milestone.goalId === goalId);
  };

  const getTasksForMilestone = (milestoneId: string) => {
    return tasks.filter(task => task.milestoneId === milestoneId);
  };

  const getAppById = (appId: string) => {
    return apps.find(a => a.id === appId);
  };

  const getGoalById = (goalId: string) => {
    return goals.find(g => g.id === goalId);
  };

  const getMilestoneById = (milestoneId: string) => {
    return milestones.find(m => m.id === milestoneId);
  };

  const getEmployeeById = (employeeId: string) => {
    return employees.find(e => e.id === employeeId);
  };

  useEffect(() => {
    milestones.forEach(milestone => {
      const milestoneTasks = getTasksForMilestone(milestone.id);
      const allApproved = milestoneTasks.length > 0 &&
        milestoneTasks.every(task => task.status === 'approved');

      if (allApproved && milestone.status !== 'completed') {
        setMilestones(prev =>
          prev.map(m =>
            m.id === milestone.id ? { ...m, status: 'completed' as const } : m
          )
        );
        addActivity({
          type: 'milestone_completed',
          userId: 'system',
          userName: 'System',
          description: `milestone "${milestone.name}" was completed`,
          relatedTo: { type: 'milestone', id: milestone.id, name: milestone.name }
        });
        createNotification(
          'milestone_completed',
          'Milestone Completed',
          `Milestone "${milestone.name}" has been completed!`,
          { type: 'milestone', id: milestone.id }
        );
      }
    });
  }, [tasks]);

  return (
    <AppContext.Provider
      value={{
        apps,
        goals,
        milestones,
        tasks,
        employees,
        roles,
        notificationRules,
        notifications,
        activities,
        comments,
        addApp,
        deleteApp,
        addGoal,
        deleteGoal,
        addMilestone,
        deleteMilestone,
        addTask,
        deleteTask,
        updateTask,
        approveTask,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addRole,
        addNotificationRule,
        updateNotificationRule,
        deleteNotificationRule,
        markNotificationRead,
        addComment,
        getCommentsForTask,
        getTasksForEmployee,
        getGoalsForApp,
        getMilestonesForGoal,
        getTasksForMilestone,
        getAppById,
        getGoalById,
        getMilestoneById,
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
