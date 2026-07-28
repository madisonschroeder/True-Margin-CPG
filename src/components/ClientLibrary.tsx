import React, { useState } from 'react';
import { Search, Plus, Copy, Trash2, FileText, Clock, FolderOpen, X } from 'lucide-react';

export interface ClientFile {
  id: string;
  name: string;
  notes: string;
  lastModified: string;
  data: any; // SessionData
}

interface ClientLibraryProps {
  clients: ClientFile[];
  activeClientId: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onClose: () => void;
}

export const ClientLibrary: React.FC<ClientLibraryProps> = ({
  clients, activeClientId, onOpen, onNew, onDuplicate, onDelete, onRename, onUpdateNotes, onClose,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  const filtered = clients.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const companyName = c.data?.companyProfile?.companyName || '';
    return c.name.toLowerCase().includes(q) || companyName.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q);
  });

  const getQuickStats = (data: any) => {
    if (!data) return null;
    const skuCount = data.skuLibrary?.skus?.length || 0;
    const companyName = data.companyProfile?.companyName || '';
    const category = data.productCategory || '';
    return { skuCount, companyName, category };
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <FolderOpen size={22} className="text-primary" />
            <h2 className="text-xl font-bold">Client Library</h2>
            <span className="badge badge-ghost text-xs">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
              <input
                type="text"
                placeholder="Search clients..."
                className="input input-sm input-bordered pl-8 w-56"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button onClick={onNew} className="btn btn-primary btn-sm gap-1">
              <Plus size={14} /> New Client
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-base-content/40">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No clients found</p>
              <p className="text-sm mt-1">{search ? 'Try a different search term' : 'Create your first client file to get started'}</p>
              {!search && (
                <button onClick={onNew} className="btn btn-primary btn-sm mt-4 gap-1">
                  <Plus size={14} /> New Client
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(client => {
                const stats = getQuickStats(client.data);
                const isActive = client.id === activeClientId;
                const modified = new Date(client.lastModified);
                const timeAgo = getTimeAgo(modified);

                return (
                  <div
                    key={client.id}
                    className={`card bg-base-200 border hover:shadow-lg transition-all cursor-pointer group ${
                      isActive ? 'border-primary ring-1 ring-primary/30' : 'border-base-300 hover:border-primary/40'
                    }`}
                    onClick={() => { onOpen(client.id); onClose(); }}
                  >
                    <div className="card-body p-4 gap-2">
                      {/* Top row: name + actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingId === client.id ? (
                            <input
                              autoFocus
                              className="input input-xs input-bordered w-full font-semibold"
                              value={editingName}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setEditingName(e.target.value)}
                              onBlur={() => { onRename(client.id, editingName); setEditingId(null); }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { onRename(client.id, editingName); setEditingId(null); }
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                          ) : (
                            <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                          )}
                          {stats?.companyName && (
                            <p className="text-xs text-base-content/50 truncate mt-0.5">{stats.companyName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button
                            className="btn btn-ghost btn-xs"
                            title="Rename"
                            onClick={e => { e.stopPropagation(); setEditingId(client.id); setEditingName(client.name); }}
                          >✏️</button>
                          <button
                            className="btn btn-ghost btn-xs"
                            title="Duplicate"
                            onClick={e => { e.stopPropagation(); onDuplicate(client.id); }}
                          ><Copy size={12} /></button>
                          {clients.length > 1 && (
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              title="Delete"
                              onClick={e => { e.stopPropagation(); onDelete(client.id); }}
                            ><Trash2 size={12} /></button>
                          )}
                        </div>
                      </div>

                      {/* Category badge */}
                      {stats?.category && (
                        <div>
                          <span className="badge badge-sm badge-outline badge-primary">{stats.category}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {editingNotesId === client.id ? (
                        <textarea
                          autoFocus
                          className="textarea textarea-bordered textarea-xs w-full text-xs"
                          rows={2}
                          placeholder="Add notes about this client..."
                          value={editingNotes}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setEditingNotes(e.target.value)}
                          onBlur={() => { onUpdateNotes(client.id, editingNotes); setEditingNotesId(null); }}
                          onKeyDown={e => {
                            if (e.key === 'Escape') setEditingNotesId(null);
                          }}
                        />
                      ) : (
                        <p
                          className="text-xs text-base-content/40 min-h-[1.5em] hover:text-base-content/60 cursor-text"
                          onClick={e => { e.stopPropagation(); setEditingNotesId(client.id); setEditingNotes(client.notes || ''); }}
                        >
                          {client.notes || 'Click to add notes...'}
                        </p>
                      )}

                      {/* Footer stats */}
                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-base-300">
                        <div className="flex items-center gap-1 text-xs text-base-content/40">
                          <Clock size={10} />
                          <span>{timeAgo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {stats && stats.skuCount > 0 && (
                            <span className="text-xs text-base-content/40">{stats.skuCount} SKU{stats.skuCount !== 1 ? 's' : ''}</span>
                          )}
                          {isActive && (
                            <span className="badge badge-xs badge-primary">Active</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
