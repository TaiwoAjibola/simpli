export type IntegrationStatus = 'configured' | 'connected' | 'error';

export type IntegrationDef = {
  type: string;
  name: string;
  description: string;
  implementation: 'real' | 'stub';
  connect: () => Promise<void>;
  sync: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const noop = async () => {};

/**
 * Integration registry (§37). GitHub is the only concrete implementation;
 * Calendar/Slack/Drive/Email are declared as stubs so the registry shape is
 * stable and new integrations can be added without touching callers.
 */
export const INTEGRATIONS: IntegrationDef[] = [
  {
    type: 'github',
    name: 'GitHub',
    description: 'Repositories, branches, pull requests, CI checks, and merges.',
    implementation: 'real',
    connect: async () => {
      const res = await fetch('/api/github/status');
      if (!res.ok) throw new Error('GitHub connection failed');
      const data = await res.json();
      if (!data.login) throw new Error('GitHub connection failed: no authenticated account');
    },
    sync: async () => {
      const res = await fetch('/api/github/status');
      if (!res.ok) throw new Error('GitHub sync failed');
    },
    disconnect: noop
  },
  {
    type: 'calendar',
    name: 'Google Calendar',
    description: 'Planned. Sync milestones and due dates to calendars.',
    implementation: 'stub',
    connect: noop,
    sync: noop,
    disconnect: noop
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Planned. Send work and notification events to channels.',
    implementation: 'stub',
    connect: noop,
    sync: noop,
    disconnect: noop
  },
  {
    type: 'drive',
    name: 'Google Drive',
    description: 'Planned. Attach documents to work items.',
    implementation: 'stub',
    connect: noop,
    sync: noop,
    disconnect: noop
  },
  {
    type: 'email',
    name: 'Email',
    description: 'Notifications via SMTP. Configured server-side.',
    implementation: 'real',
    connect: noop,
    sync: noop,
    disconnect: noop
  }
];

export function getIntegration(type: string): IntegrationDef | undefined {
  return INTEGRATIONS.find(i => i.type === type);
}

export function integrationStatusOf(type: string, connectedRepos: number): IntegrationStatus {
  if (type === 'github') return connectedRepos > 0 ? 'connected' : 'configured';
  if (type === 'email') return 'connected';
  return 'configured';
}