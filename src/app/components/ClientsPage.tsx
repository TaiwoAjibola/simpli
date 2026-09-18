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
  Building
} from 'lucide-react';
import { Client } from '../types';

const STATUS_STYLES: Record<Client['status'], string> = {
  active: 'bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7]',
  inactive: 'bg-[#F7F7F5] text-[#787774] border border-[#E9E9E7]',
  archived: 'bg-white text-[#787774] border border-[#E9E9E7]'
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
    <div className="min-h-screen bg-[#FFFFFF] p-8" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-semibold text-[#37352F] tracking-tight">Clients</h1>
            <p className="text-[14px] text-[#787774] mt-1">Manage your client relationships</p>
          </div>
          {canManage && (
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1a6fc0] transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              New Client
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-6 bg-white border border-[#E9E9E7] rounded-[8px] space-y-4">
            <h3 className="text-[16px] font-medium text-[#37352F]">{editingClient ? 'Edit Client' : 'New Client'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] placeholder:text-[#787774] transition-colors duration-150" required />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Client['status'] })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Phone</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Company</label>
                <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Industry</label>
                <input type="text" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Contact Person</label>
                <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]" />
              </div>
              <div className="col-span-2">
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Address</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2]" />
              </div>
              <div className="col-span-2">
                <label className="block text-[14px] font-medium text-[#37352F] mb-1.5">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] text-[14px] rounded-[6px] focus:outline-none focus:border-[#2383E2] focus:ring-1 focus:ring-[#2383E2] h-20 resize-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-[#2383E2] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#1a6fc0] transition-colors duration-150">{editingClient ? 'Update' : 'Create'} Client</button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-white text-[#37352F] border border-[#E9E9E7] text-[14px] font-medium rounded-[6px] hover:bg-[#F7F7F5] transition-colors duration-150">Cancel</button>
            </div>
          </form>
        )}

        {clients.length === 0 && !showForm && (
          <div className="text-center py-12 bg-white border border-[#E9E9E7] rounded-[8px]">
            <Users className="w-10 h-10 text-[#787774] mx-auto mb-3" />
            <p className="text-[14px] text-[#787774]">No clients yet. Add your first client to get started.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => {
            const linkedProjects = getLinkedProjects(client.id);
            return (
              <div key={client.id} className="bg-white border border-[#E9E9E7] rounded-[8px] p-5 hover:bg-[#F7F7F5] transition-colors duration-150">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E9E9E7] flex items-center justify-center rounded-[6px]">
                      <Building className="w-5 h-5 text-[#37352F]" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#37352F]">{client.name}</h3>
                      {client.company && <p className="text-[12px] text-[#787774]">{client.company}</p>}
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-[4px] capitalize font-medium ${STATUS_STYLES[client.status]}`}>{client.status}</span>
                </div>

                <div className="space-y-1.5 mb-3">
                  {client.email && (
                    <div className="flex items-center gap-2 text-[12px] text-[#787774]">
                      <Mail className="w-3 h-3" />{client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#787774]">
                      <Phone className="w-3 h-3" />{client.phone}
                    </div>
                  )}
                  {client.contactPerson && (
                    <p className="text-[12px] text-[#787774]">Contact: {client.contactPerson}</p>
                  )}
                </div>

                {linkedProjects.length > 0 && (
                  <div className="mb-3 pt-3 border-t border-[#E9E9E7]">
                    <p className="text-[11px] text-[#787774] uppercase font-medium mb-1">Projects ({linkedProjects.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {linkedProjects.map(p => (
                        <span key={p.id} className="text-[11px] px-1.5 py-0.5 bg-[#F7F7F5] border border-[#E9E9E7] text-[#787774] rounded-[4px]">{p.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {canManage && (
                  <div className="flex items-center gap-2 pt-3 border-t border-[#E9E9E7]">
                    <button onClick={() => handleEdit(client)} className="p-1.5 text-[#787774] hover:text-[#37352F] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(client.id)} className="p-1.5 text-[#787774] hover:text-[#EB5757] hover:bg-white border border-transparent hover:border-[#E9E9E7] rounded-[4px] transition-colors duration-150"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}