import React, { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { App, InfrastructureEntry, MonitorEntry, AccessEntry, RunbookEntry } from '../types';

type Props = {
  app: App;
  onSave: (profile: any) => void;
};

const emptyInfra: InfrastructureEntry = { resource: '', provider: '', spec: '', quantity: '', autoScaling: '' };
const emptyMonitor: MonitorEntry = { monitorType: '', tool: '', dashboard: '', alertChannel: '' };
const emptyAccess: AccessEntry = { accessType: '', method: '', auth: '', reviewCycle: '' };
const emptyRunbook: RunbookEntry = { name: '', purpose: '', location: '' };

const inputCls = "w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-sm outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150";

export function OperationsProfileForm({ app, onSave }: Props) {
  const e = app.operationsProfile;
  const [d, setD] = useState({
    environment: e?.environment || '',
    region: e?.region || '',
    deployedVersion: e?.deployedVersion || '',
    infrastructure: e?.infrastructure || [emptyInfra],
    deploymentMethod: e?.deploymentMethod || '',
    cicdPlatform: e?.cicdPlatform || '',
    rollbackStrategy: e?.rollbackStrategy || '',
    releaseCadence: e?.releaseCadence || '',
    configMgmtTool: e?.configMgmtTool || '',
    secretsStorage: e?.secretsStorage || '',
    featureFlagSystem: e?.featureFlagSystem || '',
    envVarsLocation: e?.envVarsLocation || '',
    monitoring: e?.monitoring || [emptyMonitor],
    logAggregationTool: e?.logAggregationTool || '',
    logRetentionPeriod: e?.logRetentionPeriod || '',
    auditLogging: e?.auditLogging || '',
    backupMethod: e?.backupMethod || '',
    backupSchedule: e?.backupSchedule || '',
    rto: e?.rto || '',
    rpo: e?.rpo || '',
    drTestSchedule: e?.drTestSchedule || '',
    onCallSchedule: e?.onCallSchedule || '',
    severityLevels: e?.severityLevels || '',
    incidentDocLink: e?.incidentDocLink || '',
    pagerDuty: e?.pagerDuty || '',
    accessManagement: e?.accessManagement || [emptyAccess],
    maintenanceWindow: e?.maintenanceWindow || '',
    upcomingMaintenance: e?.upcomingMaintenance || '',
    certExpiryDates: e?.certExpiryDates || '',
    runbooks: e?.runbooks || [emptyRunbook],
    operationsLead: e?.operationsLead || '',
    reviewDate: e?.reviewDate || '',
    approvedBy: e?.approvedBy || ''
  });

  const set = (f: string, v: any) => setD(prev => ({ ...prev, [f]: v }));

  return (
    <div className="space-y-6 bg-[#FFFFFF]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Metadata</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Application Name" value={app.name} disabled />
          <F label="Environment" value={d.environment} onChange={v => set('environment', v)} placeholder="e.g. Production, Staging" />
          <F label="Region" value={d.region} onChange={v => set('region', v)} placeholder="e.g. us-east-1" />
          <F label="Deployed Version" value={d.deployedVersion} onChange={v => set('deployedVersion', v)} />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>1. Infrastructure</h3>
        <TableHeader labels={['Resource', 'Provider', 'Spec/SKU', 'Quantity', 'Auto-scaling?']} />
        {d.infrastructure.map((row, i) => (
          <TableRow key={i} total={d.infrastructure.length} onRemove={() => set('infrastructure', d.infrastructure.filter((_, j) => j !== i))}>
            <input value={row.resource} onChange={e => set('infrastructure', d.infrastructure.map((r, j) => j === i ? { ...r, resource: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.provider} onChange={e => set('infrastructure', d.infrastructure.map((r, j) => j === i ? { ...r, provider: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.spec} onChange={e => set('infrastructure', d.infrastructure.map((r, j) => j === i ? { ...r, spec: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.quantity} onChange={e => set('infrastructure', d.infrastructure.map((r, j) => j === i ? { ...r, quantity: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.autoScaling} onChange={e => set('infrastructure', d.infrastructure.map((r, j) => j === i ? { ...r, autoScaling: e.target.value } : r))} className={inputCls} placeholder="Yes / No" style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('infrastructure', [...d.infrastructure, emptyInfra])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>2. Deployment</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Deployment Method" value={d.deploymentMethod} onChange={v => set('deploymentMethod', v)} placeholder="e.g. Rolling, Blue/Green" />
          <F label="CI/CD Platform" value={d.cicdPlatform} onChange={v => set('cicdPlatform', v)} />
          <F label="Rollback Strategy" value={d.rollbackStrategy} onChange={v => set('rollbackStrategy', v)} placeholder="e.g. Git revert + redeploy" />
          <F label="Release Cadence" value={d.releaseCadence} onChange={v => set('releaseCadence', v)} placeholder="e.g. Weekly, On-demand" />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>3. Configuration & Secrets</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Config Mgmt Tool" value={d.configMgmtTool} onChange={v => set('configMgmtTool', v)} placeholder="e.g. Ansible, Helm values" />
          <F label="Secrets Storage" value={d.secretsStorage} onChange={v => set('secretsStorage', v)} placeholder="e.g. AWS Secrets Manager, Vault" />
          <F label="Feature Flag System" value={d.featureFlagSystem} onChange={v => set('featureFlagSystem', v)} placeholder="e.g. LaunchDarkly, Flagsmith" />
          <F label="Env Variables Location" value={d.envVarsLocation} onChange={v => set('envVarsLocation', v)} placeholder="e.g. K8s ConfigMap, .env" />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>4. Monitoring & Alerting</h3>
        <TableHeader labels={['Monitor Type', 'Tool', 'Dashboard', 'Alert Channel']} />
        {d.monitoring.map((row, i) => (
          <TableRow key={i} total={d.monitoring.length} onRemove={() => set('monitoring', d.monitoring.filter((_, j) => j !== i))}>
            <input value={row.monitorType} onChange={e => set('monitoring', d.monitoring.map((r, j) => j === i ? { ...r, monitorType: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.tool} onChange={e => set('monitoring', d.monitoring.map((r, j) => j === i ? { ...r, tool: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.dashboard} onChange={e => set('monitoring', d.monitoring.map((r, j) => j === i ? { ...r, dashboard: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.alertChannel} onChange={e => set('monitoring', d.monitoring.map((r, j) => j === i ? { ...r, alertChannel: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('monitoring', [...d.monitoring, emptyMonitor])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>5. Logging</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Log Aggregation Tool" value={d.logAggregationTool} onChange={v => set('logAggregationTool', v)} placeholder="e.g. ELK, Datadog, Splunk" />
          <F label="Log Retention Period" value={d.logRetentionPeriod} onChange={v => set('logRetentionPeriod', v)} placeholder="e.g. 30 days, 90 days" />
          <F label="Audit Logging Enabled?" value={d.auditLogging} onChange={v => set('auditLogging', v)} placeholder="Yes / No" />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>6. Backup & Disaster Recovery</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Backup Method" value={d.backupMethod} onChange={v => set('backupMethod', v)} placeholder="e.g. Snapshot, Replication" />
          <F label="Backup Schedule" value={d.backupSchedule} onChange={v => set('backupSchedule', v)} placeholder="e.g. Daily at 02:00 UTC" />
          <F label="RTO" value={d.rto} onChange={v => set('rto', v)} placeholder="e.g. 4 hours" />
          <F label="RPO" value={d.rpo} onChange={v => set('rpo', v)} placeholder="e.g. 1 hour" />
          <F label="DR Test Schedule" value={d.drTestSchedule} onChange={v => set('drTestSchedule', v)} placeholder="e.g. Quarterly" />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>7. Incident Response</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="On-Call Schedule" value={d.onCallSchedule} onChange={v => set('onCallSchedule', v)} placeholder="e.g. Weekly rotation" />
          <F label="Severity Levels" value={d.severityLevels} onChange={v => set('severityLevels', v)} placeholder="e.g. SEV1-Critical, SEV2-High" />
          <F label="Incident Doc Link" value={d.incidentDocLink} onChange={v => set('incidentDocLink', v)} />
          <F label="PagerDuty / Opsgenie" value={d.pagerDuty} onChange={v => set('pagerDuty', v)} />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>8. Access Management</h3>
        <TableHeader labels={['Access Type', 'Method', 'Authentication', 'Review Cycle']} />
        {d.accessManagement.map((row, i) => (
          <TableRow key={i} total={d.accessManagement.length} onRemove={() => set('accessManagement', d.accessManagement.filter((_, j) => j !== i))}>
            <input value={row.accessType} onChange={e => set('accessManagement', d.accessManagement.map((r, j) => j === i ? { ...r, accessType: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.method} onChange={e => set('accessManagement', d.accessManagement.map((r, j) => j === i ? { ...r, method: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.auth} onChange={e => set('accessManagement', d.accessManagement.map((r, j) => j === i ? { ...r, auth: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.reviewCycle} onChange={e => set('accessManagement', d.accessManagement.map((r, j) => j === i ? { ...r, reviewCycle: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('accessManagement', [...d.accessManagement, emptyAccess])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>9. Maintenance</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Maintenance Window" value={d.maintenanceWindow} onChange={v => set('maintenanceWindow', v)} placeholder="e.g. Sunday 02:00-06:00 UTC" />
          <F label="Upcoming Maintenance" value={d.upcomingMaintenance} onChange={v => set('upcomingMaintenance', v)} placeholder="e.g. 2026-08-01 — DB migration" />
          <F label="Certificate Expiry Dates" value={d.certExpiryDates} onChange={v => set('certExpiryDates', v)} placeholder="e.g. 2026-12-31 (TLS)" />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>10. Runbooks</h3>
        <TableHeader labels={['Runbook', 'Purpose', 'Location']} />
        {d.runbooks.map((row, i) => (
          <TableRow key={i} total={d.runbooks.length} onRemove={() => set('runbooks', d.runbooks.filter((_, j) => j !== i))}>
            <input value={row.name} onChange={e => set('runbooks', d.runbooks.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.purpose} onChange={e => set('runbooks', d.runbooks.map((r, j) => j === i ? { ...r, purpose: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.location} onChange={e => set('runbooks', d.runbooks.map((r, j) => j === i ? { ...r, location: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('runbooks', [...d.runbooks, emptyRunbook])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Sign-off</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Operations Lead" value={d.operationsLead} onChange={v => set('operationsLead', v)} />
          <F label="Review Date" value={d.reviewDate} onChange={v => set('reviewDate', v)} placeholder="YYYY-MM-DD" />
          <F label="Approved By" value={d.approvedBy} onChange={v => set('approvedBy', v)} />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[#E9E9E7]">
        <button onClick={() => onSave(d)} className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1A6FC0] rounded-[6px] transition-colors duration-150 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
          <Save className="w-4 h-4" /> Save Operations Profile
        </button>
      </div>
    </div>
  );
}

function F({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-[#787774] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} disabled={disabled} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-sm outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] disabled:opacity-60 transition-colors duration-150" style={{ fontFamily: 'Inter, sans-serif' }} />
    </div>
  );
}

function TableHeader({ labels }: { labels: string[] }) {
  return (
    <div className="flex gap-2 mb-1">
      {labels.map((l, i) => <span key={i} className="flex-1 text-[10px] text-[#787774] uppercase tracking-wider px-2" style={{ fontFamily: 'Inter, sans-serif' }}>{l}</span>)}
      <span className="w-8" />
    </div>
  );
}

function TableRow({ total, onRemove, children }: { total: number; children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center mb-1.5 p-2 bg-white border border-transparent hover:bg-[#F7F7F5] hover:border-[#E9E9E7] rounded-[6px] transition-colors duration-150">
      {children}
      {total > 1 ? (
        <button onClick={onRemove} className="flex-shrink-0 p-1 text-[#787774] hover:text-[#EB5757] cursor-pointer transition-colors duration-150"><Trash2 className="w-3.5 h-3.5" /></button>
      ) : <span className="w-8" />}
    </div>
  );
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs text-[#2383E2] hover:text-[#1A6FC0] mt-2 cursor-pointer transition-colors duration-150" style={{ fontFamily: 'Inter, sans-serif' }}><Plus className="w-3 h-3" /> Add Row</button>
  );
}
