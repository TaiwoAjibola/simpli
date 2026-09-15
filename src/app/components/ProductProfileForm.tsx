import React, { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { App, FeatureEntry, BusinessRule, UserRoleEntry, IntegrationEntry, ThirdPartyService, KeyContact } from '../types';

type Props = { app: App; onSave: (profile: any) => void };

const emptyFeature: FeatureEntry = { feature: '', category: '', priority: '', status: '', users: '' };
const emptyRule: BusinessRule = { rule: '', domain: '', description: '', whereEnforced: '' };
const emptyRole: UserRoleEntry = { role: '', description: '', scope: '', permissions: '' };
const emptyIntegration: IntegrationEntry = { integration: '', direction: '', protocol: '', dataExchanged: '', slaDependency: '' };
const emptyService: ThirdPartyService = { service: '', purpose: '', contractEnd: '', accountOwner: '' };
const emptyContact: KeyContact = { role: '', name: '', email: '', availability: '' };

const inputCls = "w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-sm outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] transition-colors duration-150";

export function ProductProfileForm({ app, onSave }: Props) {
  const e = app.productProfile;
  const [d, setD] = useState({
    productOwner: e?.productOwner || '',
    targetAudience: e?.targetAudience || '',
    launchDate: e?.launchDate || '',
    productVision: e?.productVision || '',
    valueProposition: e?.valueProposition || '',
    differentiators: e?.differentiators || '',
    targetMarket: e?.targetMarket || '',
    features: e?.features || [emptyFeature],
    businessRules: e?.businessRules || [emptyRule],
    userRoles: e?.userRoles || [emptyRole],
    primaryFlows: e?.primaryFlows || '',
    workflowDiagramsLocation: e?.workflowDiagramsLocation || '',
    integrations: e?.integrations || [emptyIntegration],
    thirdPartyServices: e?.thirdPartyServices || [emptyService],
    supportTierModel: e?.supportTierModel || '',
    commonIssuesKbLink: e?.commonIssuesKbLink || '',
    escalationPath: e?.escalationPath || '',
    knownIssues: e?.knownIssues || '',
    configChangeProcess: e?.configChangeProcess || '',
    keyContacts: e?.keyContacts || [emptyContact],
    outstandingItems: e?.outstandingItems || '',
    keyDocsLocation: e?.keyDocsLocation || '',
    trainingMaterials: e?.trainingMaterials || '',
    productOwnerName: e?.productOwnerName || '',
    engineeringLeadName: e?.engineeringLeadName || '',
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
          <F label="Product Owner" value={d.productOwner} onChange={v => set('productOwner', v)} />
          <F label="Target Audience" value={d.targetAudience} onChange={v => set('targetAudience', v)} />
          <F label="Launch Date" value={d.launchDate} onChange={v => set('launchDate', v)} placeholder="YYYY-MM-DD" />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>1. Product Overview</h3>
        <div className="space-y-3">
          <TextArea label="Product Vision (1-2 sentences)" value={d.productVision} onChange={v => set('productVision', v)} />
          <TextArea label="Core Value Proposition" value={d.valueProposition} onChange={v => set('valueProposition', v)} />
          <TextArea label="Key Differentiators" value={d.differentiators} onChange={v => set('differentiators', v)} />
          <F label="Target Market / Users" value={d.targetMarket} onChange={v => set('targetMarket', v)} />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>2. Features & Capabilities</h3>
        <TableHeader labels={['Feature', 'Category', 'Priority', 'Status', 'Users']} />
        {d.features.map((row, i) => (
          <TableRow key={i} total={d.features.length} onRemove={() => set('features', d.features.filter((_, j) => j !== i))}>
            <input value={row.feature} onChange={e => set('features', d.features.map((r, j) => j === i ? { ...r, feature: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.category} onChange={e => set('features', d.features.map((r, j) => j === i ? { ...r, category: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.priority} onChange={e => set('features', d.features.map((r, j) => j === i ? { ...r, priority: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.status} onChange={e => set('features', d.features.map((r, j) => j === i ? { ...r, status: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.users} onChange={e => set('features', d.features.map((r, j) => j === i ? { ...r, users: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('features', [...d.features, emptyFeature])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>3. Business Rules</h3>
        <TableHeader labels={['Rule', 'Domain', 'Description', 'Where Enforced']} />
        {d.businessRules.map((row, i) => (
          <TableRow key={i} total={d.businessRules.length} onRemove={() => set('businessRules', d.businessRules.filter((_, j) => j !== i))}>
            <input value={row.rule} onChange={e => set('businessRules', d.businessRules.map((r, j) => j === i ? { ...r, rule: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.domain} onChange={e => set('businessRules', d.businessRules.map((r, j) => j === i ? { ...r, domain: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.description} onChange={e => set('businessRules', d.businessRules.map((r, j) => j === i ? { ...r, description: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.whereEnforced} onChange={e => set('businessRules', d.businessRules.map((r, j) => j === i ? { ...r, whereEnforced: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('businessRules', [...d.businessRules, emptyRule])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>4. User Roles & Permissions</h3>
        <TableHeader labels={['Role', 'Description', 'Scope', 'Permissions']} />
        {d.userRoles.map((row, i) => (
          <TableRow key={i} total={d.userRoles.length} onRemove={() => set('userRoles', d.userRoles.filter((_, j) => j !== i))}>
            <input value={row.role} onChange={e => set('userRoles', d.userRoles.map((r, j) => j === i ? { ...r, role: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.description} onChange={e => set('userRoles', d.userRoles.map((r, j) => j === i ? { ...r, description: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.scope} onChange={e => set('userRoles', d.userRoles.map((r, j) => j === i ? { ...r, scope: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.permissions} onChange={e => set('userRoles', d.userRoles.map((r, j) => j === i ? { ...r, permissions: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('userRoles', [...d.userRoles, emptyRole])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>5. User Journeys</h3>
        <div className="space-y-3">
          <TextArea label="Primary User Flows" value={d.primaryFlows} onChange={v => set('primaryFlows', v)} />
          <F label="Workflow Diagrams Location" value={d.workflowDiagramsLocation} onChange={v => set('workflowDiagramsLocation', v)} />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>6. Integrations</h3>
        <TableHeader labels={['Integration', 'Direction', 'Protocol', 'Data Exchanged', 'SLA Dependency']} />
        {d.integrations.map((row, i) => (
          <TableRow key={i} total={d.integrations.length} onRemove={() => set('integrations', d.integrations.filter((_, j) => j !== i))}>
            <input value={row.integration} onChange={e => set('integrations', d.integrations.map((r, j) => j === i ? { ...r, integration: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.direction} onChange={e => set('integrations', d.integrations.map((r, j) => j === i ? { ...r, direction: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.protocol} onChange={e => set('integrations', d.integrations.map((r, j) => j === i ? { ...r, protocol: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.dataExchanged} onChange={e => set('integrations', d.integrations.map((r, j) => j === i ? { ...r, dataExchanged: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.slaDependency} onChange={e => set('integrations', d.integrations.map((r, j) => j === i ? { ...r, slaDependency: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('integrations', [...d.integrations, emptyIntegration])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>7. Third-Party Services</h3>
        <TableHeader labels={['Service', 'Purpose', 'Contract End', 'Account Owner']} />
        {d.thirdPartyServices.map((row, i) => (
          <TableRow key={i} total={d.thirdPartyServices.length} onRemove={() => set('thirdPartyServices', d.thirdPartyServices.filter((_, j) => j !== i))}>
            <input value={row.service} onChange={e => set('thirdPartyServices', d.thirdPartyServices.map((r, j) => j === i ? { ...r, service: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.purpose} onChange={e => set('thirdPartyServices', d.thirdPartyServices.map((r, j) => j === i ? { ...r, purpose: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.contractEnd} onChange={e => set('thirdPartyServices', d.thirdPartyServices.map((r, j) => j === i ? { ...r, contractEnd: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.accountOwner} onChange={e => set('thirdPartyServices', d.thirdPartyServices.map((r, j) => j === i ? { ...r, accountOwner: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('thirdPartyServices', [...d.thirdPartyServices, emptyService])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>8. Support & Troubleshooting</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Support Tier Model" value={d.supportTierModel} onChange={v => set('supportTierModel', v)} />
          <F label="Common Issues KB Link" value={d.commonIssuesKbLink} onChange={v => set('commonIssuesKbLink', v)} />
          <F label="Escalation Path" value={d.escalationPath} onChange={v => set('escalationPath', v)} />
          <F label="Known Issues" value={d.knownIssues} onChange={v => set('knownIssues', v)} />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>9. Configuration & Flags</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Config Change Process" value={d.configChangeProcess} onChange={v => set('configChangeProcess', v)} />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>10. Key Contacts</h3>
        <TableHeader labels={['Role', 'Name', 'Email', 'Availability']} />
        {d.keyContacts.map((row, i) => (
          <TableRow key={i} total={d.keyContacts.length} onRemove={() => set('keyContacts', d.keyContacts.filter((_, j) => j !== i))}>
            <input value={row.role} onChange={e => set('keyContacts', d.keyContacts.map((r, j) => j === i ? { ...r, role: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.name} onChange={e => set('keyContacts', d.keyContacts.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.email} onChange={e => set('keyContacts', d.keyContacts.map((r, j) => j === i ? { ...r, email: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
            <input value={row.availability} onChange={e => set('keyContacts', d.keyContacts.map((r, j) => j === i ? { ...r, availability: e.target.value } : r))} className={inputCls} style={{ fontFamily: 'Inter, sans-serif' }} />
          </TableRow>
        ))}
        <AddBtn onClick={() => set('keyContacts', [...d.keyContacts, emptyContact])} />
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>11. Handover Notes</h3>
        <div className="space-y-3">
          <TextArea label="Outstanding Items" value={d.outstandingItems} onChange={v => set('outstandingItems', v)} />
          <F label="Key Docs Location" value={d.keyDocsLocation} onChange={v => set('keyDocsLocation', v)} />
          <F label="Training Materials" value={d.trainingMaterials} onChange={v => set('trainingMaterials', v)} />
        </div>
      </div>

      <div className="p-4 bg-white border border-[#E9E9E7] rounded-[8px]">
        <h3 className="text-[14px] font-semibold text-[#37352F] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>Sign-off</h3>
        <div className="grid grid-cols-2 gap-4">
          <F label="Product Owner" value={d.productOwnerName} onChange={v => set('productOwnerName', v)} />
          <F label="Engineering Lead" value={d.engineeringLeadName} onChange={v => set('engineeringLeadName', v)} />
          <F label="Review Date" value={d.reviewDate} onChange={v => set('reviewDate', v)} placeholder="YYYY-MM-DD" />
          <F label="Approved By" value={d.approvedBy} onChange={v => set('approvedBy', v)} />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[#E9E9E7]">
        <button onClick={() => onSave(d)} className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white font-medium text-sm hover:bg-[#1A6FC0] rounded-[6px] transition-colors duration-150 cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
          <Save className="w-4 h-4" /> Save Product Profile
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

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-[#787774] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] rounded-[6px] text-[#37352F] text-sm outline-none placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] resize-none transition-colors duration-150" style={{ fontFamily: 'Inter, sans-serif' }} />
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
