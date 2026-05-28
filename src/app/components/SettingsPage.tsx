import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Palette,
  Layout,
  AlertCircle
} from 'lucide-react';
import { TaskCategory } from '../types';

const CARD_STYLES = ['default', 'compact', 'detailed'] as const;

const PRESET_COLORS = [
  '#00e5ff', '#8b5cf6', '#ff006e', '#ff6b35',
  '#00c853', '#ffd600', '#2979ff', '#ff3d00',
  '#00bfa5', '#d500f9', '#536dfe', '#f50057'
];

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const { taskCategories, addTaskCategory, updateTaskCategory, deleteTaskCategory } = useApp();
  const canManage = hasPermission('manage_categories');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#00e5ff', cardStyle: 'default' as TaskCategory['cardStyle'] });

  const resetForm = () => {
    setFormData({ name: '', color: '#00e5ff', cardStyle: 'default' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editingId) {
      await updateTaskCategory(editingId, formData);
    } else {
      await addTaskCategory(formData);
    }
    resetForm();
  };

  const handleEdit = (cat: TaskCategory) => {
    setFormData({ name: cat.name, color: cat.color, cardStyle: cat.cardStyle });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (catId: string) => {
    if (window.confirm('Delete this category? Tasks using it will become uncategorized.')) {
      await deleteTaskCategory(catId);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Settings</h1>
        <p className="text-[#6b6b80]">Manage task categories, colors, and card styles</p>
      </div>

      <div className="bg-[#12121a] border border-[rgba(0,229,255,0.1)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f0f0f5] flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#00e5ff]" />
            Task Categories
          </h2>
          {canManage && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[rgba(0,229,255,0.1)] text-[#00e5ff] hover:bg-[rgba(0,229,255,0.2)] transition"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          )}
        </div>

        {showForm && canManage && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-[#0a0a0f] border border-[rgba(0,229,255,0.1)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#6b6b80] uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#12121a] border border-[rgba(0,229,255,0.1)] px-3 py-2 text-[#f0f0f5] focus:outline-none focus:border-[#00e5ff]"
                  placeholder="e.g. Bug Fix, Feature, Chore"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6b6b80] uppercase tracking-wider mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-sm text-[#6b6b80] font-mono">{formData.color}</span>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                      className={`w-6 h-6 border-2 ${formData.color === c ? 'border-[#f0f0f5]' : 'border-transparent'} hover:scale-110 transition`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6b6b80] uppercase tracking-wider mb-1">Card Style</label>
                <select
                  value={formData.cardStyle}
                  onChange={e => setFormData(prev => ({ ...prev, cardStyle: e.target.value as TaskCategory['cardStyle'] }))}
                  className="w-full bg-[#12121a] border border-[rgba(0,229,255,0.1)] px-3 py-2 text-[#f0f0f5] focus:outline-none focus:border-[#00e5ff]"
                >
                  {CARD_STYLES.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-[rgba(0,229,255,0.1)] text-[#00e5ff] hover:bg-[rgba(0,229,255,0.2)] transition"
              >
                <Check className="w-4 h-4" /> {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 text-[#6b6b80] hover:text-[#f0f0f5] transition"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        )}

        {taskCategories.length === 0 ? (
          <div className="text-center py-12 text-[#6b6b80]">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>No categories yet. Create one to start organizing your tasks.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {taskCategories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-4 bg-[#0a0a0f] border border-[rgba(0,229,255,0.05)] hover:border-[rgba(0,229,255,0.15)] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: cat.color }} />
                  <span className="text-[#f0f0f5] font-medium">{cat.name}</span>
                  <span className="text-xs text-[#6b6b80] flex items-center gap-1">
                    <Layout className="w-3 h-3" /> {cat.cardStyle}
                  </span>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="p-1.5 text-[#6b6b80] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.05)] transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-[#ff3b5c] hover:bg-[rgba(255,59,92,0.1)] transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-[#0a0a0f] border border-[rgba(0,229,255,0.05)]">
          <h3 className="text-sm font-semibold text-[#f0f0f5] mb-2">Preview</h3>
          <p className="text-xs text-[#6b6b80] mb-3">How your categories will appear on task and action point cards:</p>
          <div className="flex flex-wrap gap-3">
            {taskCategories.map(cat => (
              <PreviewCard key={cat.id} category={cat} />
            ))}
            {taskCategories.length === 0 && (
              <p className="text-xs text-[#6b6b80]">No categories to preview.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ category }: { category: TaskCategory }) {
  return (
    <div
      className="w-48 p-3 bg-[#12121a] border-l-4 border-[#00e5ff]"
      style={{ borderLeftColor: category.color }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
        <span className="text-xs font-medium text-[#6b6b80]">{category.name}</span>
      </div>
      <p className="text-sm text-[#f0f0f5] font-medium mb-1">Sample Task</p>
      {category.cardStyle !== 'compact' && (
        <p className="text-xs text-[#6b6b80]">Preview of how this category looks on cards.</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] px-1.5 py-0.5 bg-[rgba(0,229,255,0.1)] text-[#00e5ff]">Medium</span>
        {category.cardStyle === 'detailed' && (
          <span className="text-[10px] text-[#6b6b80]">Assignee</span>
        )}
      </div>
    </div>
  );
}
