import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const db = admin.firestore();

const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: functions.config().gmail?.user || process.env.GMAIL_USER || '',
    pass: functions.config().gmail?.password || process.env.GMAIL_APP_PASSWORD || ''
  }
};

const transporter = nodemailer.createTransport(EMAIL_CONFIG);

function replaceVariables(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

async function getNotificationVariables(notificationType: string, data: any): Promise<Record<string, string>> {
  const taskData = data.task || {};
  const goalData = data.goal || {};
  const appData = data.app || {};
  const userData = data.user || {};
  const subtaskData = data.subtask || {};

  return {
    task_name: taskData.name || '',
    task_description: taskData.description || '',
    task_status: taskData.status || '',
    task_priority: taskData.priority || '',
    task_due_date: taskData.dueDate ? new Date(taskData.dueDate).toLocaleDateString() : 'N/A',
    task_previous_status: data.previousStatus || '',
    task_new_status: taskData.status || '',
    subtask_name: subtaskData.name || '',
    subtask_status: subtaskData.status || '',
    subtask_priority: subtaskData.priority || '',
    user_name: userData.name || '',
    assigned_user: userData.name || '',
    created_by: userData.name || '',
    approver_name: userData.name || '',
    tester_name: userData.name || '',
    app_name: appData.name || '',
    goal_name: goalData.name || ''
  };
}

async function sendNotificationEmail(rule: any, recipients: string[], variables: Record<string, string>) {
  const subject = replaceVariables(rule.subject, variables);
  const message = replaceVariables(rule.message, variables);

  const mailOptions = {
    from: `"Simpli" <${EMAIL_CONFIG.auth.user}>`,
    to: recipients.join(', '),
    subject,
    html: message.replace(/\n/g, '<br>'),
    text: message
  };

  try {
    await transporter.sendMail(mailOptions);
    functions.logger.info(`Email sent to ${recipients.join(', ')} for rule ${rule.id}`);
  } catch (error) {
    functions.logger.error(`Failed to send email:`, error);
  }
}

async function getRecipientsForRule(rule: any): Promise<string[]> {
  const emails: string[] = [];

  for (const recipient of rule.recipients || []) {
    if (recipient.type === 'user') {
      const userDoc = await db.collection('employees').doc(recipient.id).get();
      if (userDoc.exists) {
        emails.push(userDoc.data()!.email);
      }
    } else if (recipient.type === 'role') {
      const usersSnapshot = await db.collection('employees')
        .where('roleId', '==', recipient.id)
        .get();
      usersSnapshot.forEach(doc => {
        emails.push(doc.data().email);
      });
    }
  }

  return [...new Set(emails)];
}

async function triggerNotification(event: string, data: any) {
  const rulesSnapshot = await db.collection('notificationRules')
    .where('event', '==', event)
    .where('enabled', '==', true)
    .get();

  const variables = await getNotificationVariables(event, data);

  for (const ruleDoc of rulesSnapshot.docs) {
    const rule = ruleDoc.data();
    const recipients = await getRecipientsForRule(rule);

    if (recipients.length > 0) {
      await sendNotificationEmail({ id: ruleDoc.id, ...rule }, recipients, variables);
    }
  }
}

export const onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
    const notificationType = notification.type;

    let taskData: any = {};
    let userData: any = {};
    let goalData: any = {};
    let appData: any = {};
    let subtaskData: any = {};
    let previousStatus = '';

    if (notification.relatedTo) {
      if (notification.relatedTo.type === 'task') {
        const taskDoc = await db.collection('tasks').doc(notification.relatedTo.id).get();
        if (taskDoc.exists) {
          taskData = taskDoc.data()!;

          if (taskData.goalId) {
            const goalDoc = await db.collection('goals').doc(taskData.goalId).get();
            if (goalDoc.exists) {
              goalData = goalDoc.data()!;

              if (goalData.appId) {
                const appDoc = await db.collection('apps').doc(goalData.appId).get();
                if (appDoc.exists) {
                  appData = appDoc.data()!;
                }
              }
            }
          }

          if (taskData.assignedTo && taskData.assignedTo.length > 0) {
            const userDoc = await db.collection('employees').doc(taskData.assignedTo[0]).get();
            if (userDoc.exists) {
              userData = userDoc.data()!;
            }
          }
        }
      } else if (notification.relatedTo.type === 'subtask') {
        const subtaskDoc = await db.collection('subtasks').doc(notification.relatedTo.id).get();
        if (subtaskDoc.exists) {
          subtaskData = subtaskDoc.data()!;

          if (subtaskData.taskId) {
            const taskDoc = await db.collection('tasks').doc(subtaskData.taskId).get();
            if (taskDoc.exists) {
              taskData = taskDoc.data()!;

              if (taskData.goalId) {
                const goalDoc = await db.collection('goals').doc(taskData.goalId).get();
                if (goalDoc.exists) {
                  goalData = goalDoc.data()!;
                }
              }
            }
          }

          if (subtaskData.assignedTo && subtaskData.assignedTo.length > 0) {
            const userDoc = await db.collection('employees').doc(subtaskData.assignedTo[0]).get();
            if (userDoc.exists) {
              userData = userDoc.data()!;
            }
          }
        }
      }
    }

    const eventMap: Record<string, string> = {
      'task_started': 'task_started',
      'task_ready_for_testing': 'task_ready_for_testing',
      'task_sent_for_approval': 'task_sent_for_approval',
      'task_approved': 'task_approved',
      'task_rejected': 'task_rejected',
      'task_blocked': 'task_blocked',
      'subtask_completed': 'subtask_completed',
      'task_assigned': 'task_assigned',
      'subtask_assigned': 'subtask_assigned'
    };

    const event = eventMap[notificationType];
    if (event) {
      await triggerNotification(event, {
        task: taskData,
        user: userData,
        goal: goalData,
        app: appData,
        subtask: subtaskData,
        previousStatus
      });
    }
  });

export const sendTestEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { to, subject, message } = data;

  try {
    await transporter.sendMail({
      from: `"Simpli" <${EMAIL_CONFIG.auth.user}>`,
      to,
      subject: subject || 'Test Email from Simpli',
      html: message || 'This is a test email from Simpli.',
      text: message || 'This is a test email from Simpli.'
    });

    return { success: true, message: 'Test email sent successfully' };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
