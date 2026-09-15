import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Mail,
  Phone,
  Building,
  X
} from 'lucide-react';
import { Client } from '../types';

const STATUS_STYLES: Record<Client['status'], string> = {
  active: 'bg-[rgba(16,185,129,0.1)] text-[#10b981]',
  inactive: 'bg-[rgba(148,163,184,0.1)] text-[#6D28D9]',
  archived: 'bg-[rgba(167,139,250,0.1)] text-[#A78BFA]'
};

export function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient, apps } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    address: '',
    contactPerson: '',
    notes: '',
    status: 'active' as Client['status']
  });

  const canManage = hasPermission('manage_users');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      await updateClient(editingClient.id, formData);
    } else {
      await addClient({ ...formData, createdBy: currentUser!.id });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', company: '', industry: '', address: '', contactPerson: '', notes: '', status: 'active' });
    setShowForm(false);
    setEditingClient(null);
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      industry: client.industry || '',
      address: client.address || '',
      contactPerson: client.contactPerson || '',
      notes: client.notes || '',
      status: client.status
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (clientId: string) => {
    if (confirm('Delete this client? Projects linked to it will be unlinked.')) {
      await deleteClient(clientId);
    }
  };

  const getLinkedProjects = (clientId: string) => apps.filter(a => a.clientId === clientId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#4C1D95]">Clients</h1>
          <p className="text-[#6D28D9] mt-1">Manage your client relationships</p>
        </div>
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-[#020617] text-sm font-medium hover:bg-[#6D28D9]"
          >
            <Plus className="w-4 h-4" />
            New Client
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-white border border-[#E9D5FF] space-y-4">
          <h3 className="text-lg font-medium text-[#4C1D95]">{editingClient ? 'Edit Client' : 'New Client'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Client['status'] })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Phone</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Company</label>
              <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Industry</label>
              <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Contact Person</label>
              <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Address</label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95]" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#4C1D95] mb-2">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-[#F5F3FF] border border-[#E9D5FF] text-[#4C1D95] h-20 resize-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#7C3AED] text-[#020617] font-medium hover:bg-[#6D28D9]">{editingClient ? 'Update' : 'Create'} Client</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-white text-[#4C1D95] border border-[#E9D5FF]">Cancel</button>
          </div>
        </form>
      )}

      {clients.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white border border-[#E9D5FF]">
          <Users className="w-12 h-12 text-[#6D28D9] mx-auto mb-3" />
          <p className="text-[#6D28D9]">No clients yet. Add your first client to get started.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const linkedProjects = getLinkedProjects(client.id);
          return (
            <div key={client.id} className="bg-white border border-[#E9D5FF] p-5 hover:border-[rgba(124,58,237,0.25)] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[rgba(124,58,237,0.1)] flex items-center justify-center rounded-lg">
                    <Building className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#4C1D95]">{client.name}</h3>
                    {client.company && <p className="text-xs text-[#6D28D9]">{client.company}</p>}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 ${STATUS_STYLES[client.status]}`}>{client.status}</span>
              </div>

              <div className="space-y-1.5 mb-3">
                {client.email && (
                  <div className="flex items-center gap-2 text-xs text-[#6D28D9]">
                    <Mail className="w-3 h-3" />{client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-[#6D28D9]">
                    <Phone className="w-3 h-3" />{client.phone}
                  </div>
                )}
                {client.contactPerson && (
                  <p className="text-xs text-[#6D28D9]">Contact: {client.contactPerson}</p>
                )}
              </div>

              {linkedProjects.length > 0 && (
                <div className="mb-3 pt-3 border-t border-[rgba(124,58,237,0.05)]">
                  <p className="text-[10px] text-[#6D28D9] uppercase font-medium mb-1">Projects ({linkedProjects.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {linkedProjects.map(p => (
                      <span key={p.id} className="text-[10px] px-1.5 py-0.5 bg-[rgba(124,58,237,0.08)] text-[#7C3AED]">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {canManage && (
                <div className="flex items-center gap-2 pt-3 border-t border-[rgba(124,58,237,0.05)]">
                  <button onClick={() => handleEdit(client)} className="p-1.5 text-[#6D28D9] hover:text-[#7C3AED]"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(client.id)} className="p-1.5 text-[#6D28D9] hover:text-[#DC2626]"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
