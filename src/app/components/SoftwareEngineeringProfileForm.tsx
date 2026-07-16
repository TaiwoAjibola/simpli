import React, { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { App, TechStackEntry, ArchitectureComponent, EngineeringDecision, KnownLimitation } from '../types';

type Props = {
  app: App;
  onSave: (profile: any) => void;
};

const emptyTechStack: TechStackEntry = { language: '', version: '', runtime: '', framework: '', database: '', cache: '', queue: '' };
const emptyComponent: ArchitectureComponent = { component: '', responsibility: '', language: '' };
const emptyDecision: EngineeringDecision = { decision: '', date: '', rationale: '' };
const emptyLimitation: KnownLimitation = { issue: '', impact: '', workaround: '', plannedFix: '' };

export function SoftwareEngineeringProfileForm({ app, onSave }: Props) {
  const existing = app.softwareEngineeringProfile;
  const [d, setD] = useState({
    projectCode: existing?.projectCode || '',
    repository: existing?.repository || '',
    version: existing?.version || '',
    techStack: existing?.techStack || [emptyTechStack],
    architecturePattern: existing?.architecturePattern || '',
    components: existing?.components || [{ component: '', responsibility: '', language: '' }],
    designPatterns: existing?.designPatterns || '',
    apiType: existing?.apiType || '',
    apiProtocol: existing?.apiProtocol || '',
    apiAuthMethod: existing?.apiAuthMethod || '',
    apiDocLocation: existing?.apiDocLocation || '',
    cicdPlatform: existing?.cicdPlatform || '',
    pipelineStages: existing?.pipelineStages || '',
    artifactRepo: existing?.artifactRepo || '',
    deploymentStrategy: existing?.deploymentStrategy || '',
    testing: existing?.testing || [{ testType: '', tool: '', coverageTarget: '', ciStage: '' }],
    authProvider: existing?.authProvider || '',
    secretsManager: existing?.secretsManager || '',
    scanningTools: existing?.scanningTools || '',
    complianceFrameworks: existing?.complianceFrameworks || '',
    engineeringDecisions: existing?.engineeringDecisions || [emptyDecision],
    knownLimitations: existing?.knownLimitations || [emptyLimitation],
    owner: existing?.owner || '',
    engineeringLead: existing?.engineeringLead || '',
    reviewDate: existing?.reviewDate || '',
    approvedBy: existing?.approvedBy || ''
  });

  const set = (field: string, value: any) => setD(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      {/* Metadata */}
      <Section title="Metadata">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Application Name" value={app.name} disabled />
          <Field label="Project Code" value={d.projectCode} onChange={v => set('projectCode', v)} />
          <Field label="Repository" value={d.repository} onChange={v => set('repository', v)} />
          <Field label="Version" value={d.version} onChange={v => set('version', v)} />
        </div>
      </Section>

      {/* Technology Stack */}
      <Section title="Technology Stack">
        <TableHeader labels={['Language', 'Version', 'Runtime', 'Framework', 'Database', 'Cache', 'Queue']} />
        {d.techStack.map((row, i) => (
          <TableRow key={i} total={d.techStack.length} onRemove={() => set('techStack', d.techStack.filter((_, j) => j !== i))}>
            <input value={row.language} onChange={e => set('techStack', d.techStack.map((r, j) => j === i ? { ...r, language: e.target.value } : r))} className="input" />
            <input value={row.version} onChange={e => set('techStack', d.techStack.map((r, j) => j === i ? { ...r, version: e.target.value } : r))} className="input" />
            <input value={row.runtime} onChange={e => set('techStack', d.techStack.map((r, j) => j === i ? { ...r, runtime: e.target.value } : r))} className="input" />
            <input value={row.framework} onChange={e => set('techStack', d.techStack.map((r, j) => j === i ? { ...r, framework: e.target.value } : r))} className="input" />
            <input value={row.database} onChange={e => set('techStack', d.techStack.map((r, j) => j === i ? { ...r, database: e.target.value } : r))} className="input" />
            <input value={row.cache} onChange={e => set('techStack', d.techStack.map((r, j) => j === i ? { ...r, cache: e.target.value } : r))} className="input" />
            <input value={row.queue} onChange={e => set('techStack', d.techStack.map((r, j) => j === i ? { ...r, queue: e.target.value } : r))} className="input" />
          </TableRow>
        ))}
        <AddButton onClick={() => set('techStack', [...d.techStack, emptyTechStack])} />
      </Section>

      {/* Architecture */}
      <Section title="Architecture Overview">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Architecture Pattern" value={d.architecturePattern} onChange={v => set('architecturePattern', v)} placeholder="e.g. Microservices, Monolith" />
          <Field label="Design Patterns" value={d.designPatterns} onChange={v => set('designPatterns', v)} placeholder="e.g. CQRS, Saga, Repository" />
        </div>
        <TableHeader labels={['Component', 'Responsibility', 'Language / Runtime']} />
        {d.components.map((row, i) => (
          <TableRow key={i} total={d.components.length} onRemove={() => set('components', d.components.filter((_, j) => j !== i))}>
            <input value={row.component} onChange={e => set('components', d.components.map((r, j) => j === i ? { ...r, component: e.target.value } : r))} className="input" />
            <input value={row.responsibility} onChange={e => set('components', d.components.map((r, j) => j === i ? { ...r, responsibility: e.target.value } : r))} className="input" />
            <input value={row.language} onChange={e => set('components', d.components.map((r, j) => j === i ? { ...r, language: e.target.value } : r))} className="input" />
          </TableRow>
        ))}
        <AddButton onClick={() => set('components', [...d.components, emptyComponent])} />
      </Section>

      {/* API Surface */}
      <Section title="API Surface">
        <div className="grid grid-cols-2 gap-4">
          <Field label="API Type" value={d.apiType} onChange={v => set('apiType', v)} placeholder="e.g. REST, GraphQL, gRPC" />
          <Field label="Protocol" value={d.apiProtocol} onChange={v => set('apiProtocol', v)} placeholder="e.g. HTTP/2, WebSocket" />
          <Field label="Auth Method" value={d.apiAuthMethod} onChange={v => set('apiAuthMethod', v)} placeholder="e.g. OAuth 2.0, JWT, API Key" />
          <Field label="Documentation Location" value={d.apiDocLocation} onChange={v => set('apiDocLocation', v)} placeholder="e.g. Swagger Hub, Postman" />
        </div>
      </Section>

      {/* CI/CD */}
      <Section title="CI/CD Pipeline">
        <div className="grid grid-cols-2 gap-4">
          <Field label="CI Platform" value={d.cicdPlatform} onChange={v => set('cicdPlatform', v)} placeholder="e.g. GitHub Actions, Jenkins" />
          <Field label="Pipeline Stages" value={d.pipelineStages} onChange={v => set('pipelineStages', v)} placeholder="e.g. Lint → Build → Test → Deploy" />
          <Field label="Artifact Repository" value={d.artifactRepo} onChange={v => set('artifactRepo', v)} placeholder="e.g. Docker Hub, ECR" />
          <Field label="Deployment Strategy" value={d.deploymentStrategy} onChange={v => set('deploymentStrategy', v)} placeholder="e.g. Rolling, Blue/Green" />
        </div>
      </Section>

      {/* Testing */}
      <Section title="Testing">
        <TableHeader labels={['Test Type', 'Tool', 'Coverage Target', 'CI Stage']} />
        {d.testing.map((row, i) => (
          <TableRow key={i} total={d.testing.length} onRemove={() => set('testing', d.testing.filter((_, j) => j !== i))}>
            <input value={row.testType} onChange={e => set('testing', d.testing.map((r, j) => j === i ? { ...r, testType: e.target.value } : r))} className="input" placeholder="e.g. Unit" />
            <input value={row.tool} onChange={e => set('testing', d.testing.map((r, j) => j === i ? { ...r, tool: e.target.value } : r))} className="input" placeholder="e.g. Jest" />
            <input value={row.coverageTarget} onChange={e => set('testing', d.testing.map((r, j) => j === i ? { ...r, coverageTarget: e.target.value } : r))} className="input" placeholder="e.g. 80%" />
            <input value={row.ciStage} onChange={e => set('testing', d.testing.map((r, j) => j === i ? { ...r, ciStage: e.target.value } : r))} className="input" placeholder="e.g. Test" />
          </TableRow>
        ))}
        <AddButton onClick={() => set('testing', [...d.testing, { testType: '', tool: '', coverageTarget: '', ciStage: '' }])} />
      </Section>

      {/* Security */}
      <Section title="Security">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Auth Provider" value={d.authProvider} onChange={v => set('authProvider', v)} placeholder="e.g. Auth0, Cognito" />
          <Field label="Secrets Manager" value={d.secretsManager} onChange={v => set('secretsManager', v)} placeholder="e.g. AWS Secrets Manager, Vault" />
          <Field label="Security Scanning Tools" value={d.scanningTools} onChange={v => set('scanningTools', v)} placeholder="e.g. Snyk, Trivy, SonarQube" />
          <Field label="Compliance Frameworks" value={d.complianceFrameworks} onChange={v => set('complianceFrameworks', v)} placeholder="e.g. SOC 2, HIPAA, GDPR" />
        </div>
      </Section>

      {/* Engineering Decisions */}
      <Section title="Engineering Decisions">
        <TableHeader labels={['Decision', 'Date', 'Rationale']} />
        {d.engineeringDecisions.map((row, i) => (
          <TableRow key={i} total={d.engineeringDecisions.length} onRemove={() => set('engineeringDecisions', d.engineeringDecisions.filter((_, j) => j !== i))}>
            <input value={row.decision} onChange={e => set('engineeringDecisions', d.engineeringDecisions.map((r, j) => j === i ? { ...r, decision: e.target.value } : r))} className="input" />
            <input value={row.date} onChange={e => set('engineeringDecisions', d.engineeringDecisions.map((r, j) => j === i ? { ...r, date: e.target.value } : r))} className="input" placeholder="YYYY-MM-DD" />
            <input value={row.rationale} onChange={e => set('engineeringDecisions', d.engineeringDecisions.map((r, j) => j === i ? { ...r, rationale: e.target.value } : r))} className="input" />
          </TableRow>
        ))}
        <AddButton onClick={() => set('engineeringDecisions', [...d.engineeringDecisions, emptyDecision])} />
      </Section>

      {/* Known Limitations */}
      <Section title="Known Limitations & Risks">
        <TableHeader labels={['Issue', 'Impact', 'Workaround', 'Planned Fix']} />
        {d.knownLimitations.map((row, i) => (
          <TableRow key={i} total={d.knownLimitations.length} onRemove={() => set('knownLimitations', d.knownLimitations.filter((_, j) => j !== i))}>
            <input value={row.issue} onChange={e => set('knownLimitations', d.knownLimitations.map((r, j) => j === i ? { ...r, issue: e.target.value } : r))} className="input" />
            <input value={row.impact} onChange={e => set('knownLimitations', d.knownLimitations.map((r, j) => j === i ? { ...r, impact: e.target.value } : r))} className="input" />
            <input value={row.workaround} onChange={e => set('knownLimitations', d.knownLimitations.map((r, j) => j === i ? { ...r, workaround: e.target.value } : r))} className="input" />
            <input value={row.plannedFix} onChange={e => set('knownLimitations', d.knownLimitations.map((r, j) => j === i ? { ...r, plannedFix: e.target.value } : r))} className="input" />
          </TableRow>
        ))}
        <AddButton onClick={() => set('knownLimitations', [...d.knownLimitations, emptyLimitation])} />
      </Section>

      {/* Sign-off */}
      <Section title="Sign-off">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Owner" value={d.owner} onChange={v => set('owner', v)} />
          <Field label="Engineering Lead" value={d.engineeringLead} onChange={v => set('engineeringLead', v)} />
          <Field label="Review Date" value={d.reviewDate} onChange={v => set('reviewDate', v)} placeholder="YYYY-MM-DD" />
          <Field label="Approved By" value={d.approvedBy} onChange={v => set('approvedBy', v)} />
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-[rgba(0,229,255,0.1)]">
        <button onClick={() => onSave(d)} className="flex items-center gap-2 px-6 py-2 bg-[#00e5ff] text-[#0a0a0f] font-medium hover:bg-[#00c4e0]">
          <Save className="w-4 h-4" /> Save Software Engineering Profile
        </button>
      </div>
    </div>
  );
}

// Shared sub-components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-[#12121a] border border-[rgba(0,229,255,0.1)]">
      <h3 className="text-sm font-semibold text-[#f0f0f5] uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-[#6b6b80] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] text-[#f0f0f5] text-sm outline-none disabled:opacity-60"
      />
    </div>
  );
}

function TableHeader({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex gap-2 mb-1">
      {labels.map((l, i) => (
        <span key={i} className="flex-1 text-[10px] text-[#6b6b80] uppercase tracking-wider px-2">{l}</span>
      ))}
      <span className="w-8" />
    </div>
  );
}

function TableRow({ total, onRemove, children }: { total: number; children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center mb-1.5">
      {children}
      {total > 1 && (
        <button onClick={onRemove} className="flex-shrink-0 p-1 text-[#6b6b80] hover:text-[#ff3b5c]">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      {total === 1 && <span className="w-8" />}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-xs text-[#00e5ff] hover:underline mt-1">
      <Plus className="w-3 h-3" /> Add Row
    </button>
  );
}