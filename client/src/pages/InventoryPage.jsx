import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---- Small helpers ----
function SortableField({ field, onRemove, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id || field._tempId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { t } = useTranslation();

  return (
    <div ref={setNodeRef} style={style} className="card mb-2">
      <div className="card-body py-2">
        <div className="d-flex gap-2 align-items-center">
          <span className="text-muted" style={{ cursor: 'grab' }} {...attributes} {...listeners}><i className="bi bi-grip-vertical" /></span>
          <input className="form-control form-control-sm" style={{ maxWidth: 140 }} placeholder={t('fieldLabel')}
            value={field.label} onChange={e => onUpdate({ ...field, label: e.target.value })} />
          <select className="form-select form-select-sm" style={{ maxWidth: 160 }} value={field.fieldType}
            onChange={e => onUpdate({ ...field, fieldType: e.target.value })}>
            {['text_single', 'text_multi', 'number', 'link', 'boolean'].map(ft => (
              <option key={ft} value={ft}>{t(ft)}</option>
            ))}
          </select>
          <input className="form-control form-control-sm" style={{ maxWidth: 180 }} placeholder={t('fieldDescription')}
            value={field.description || ''} onChange={e => onUpdate({ ...field, description: e.target.value })} />
          <div className="form-check mb-0 ms-1">
            <input className="form-check-input" type="checkbox" id={`sit_${field._tempId}`}
              checked={field.showInTable} onChange={e => onUpdate({ ...field, showInTable: e.target.checked })} />
            <label className="form-check-label small" htmlFor={`sit_${field._tempId}`}>{t('showInTable')}</label>
          </div>
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={onRemove}><i className="bi bi-trash" /></button>
        </div>
      </div>
    </div>
  );
}

const FIELD_LIMITS = { text_single: 3, text_multi: 3, number: 3, link: 3, boolean: 3 };

function countByType(fields) {
  const c = {};
  fields.forEach(f => { c[f.fieldType] = (c[f.fieldType] || 0) + 1; });
  return c;
}

// Custom ID Part component
function IdPart({ part, onChange, onRemove }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: part._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="card mb-2">
      <div className="card-body py-2">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <span style={{ cursor: 'grab' }} {...attributes} {...listeners}><i className="bi bi-grip-vertical" /></span>
          <select className="form-select form-select-sm" style={{ maxWidth: 160 }} value={part.type}
            onChange={e => onChange({ ...part, type: e.target.value })}>
            {['fixed', 'random20', 'random32', 'random6', 'random9', 'guid', 'datetime', 'sequence'].map(pt => (
              <option key={pt} value={pt}>{t(pt)}</option>
            ))}
          </select>
          {part.type === 'fixed' && (
            <input className="form-control form-control-sm" style={{ maxWidth: 140 }} placeholder={t('fixedValue')}
              value={part.value || ''} onChange={e => onChange({ ...part, value: e.target.value })} />
          )}
          {(part.type === 'sequence' || part.type === 'random20' || part.type === 'random32') && (
            <>
              <div className="form-check mb-0">
                <input className="form-check-input" type="checkbox" id={`pad_${part._id}`}
                  checked={!!part.padded} onChange={e => onChange({ ...part, padded: e.target.checked })} />
                <label className="form-check-label small" htmlFor={`pad_${part._id}`}>{t('padWithZeros')}</label>
              </div>
              {part.padded && (
                <input className="form-control form-control-sm" style={{ maxWidth: 70 }} type="number" min={1} max={20}
                  value={part.padLength || 6} onChange={e => onChange({ ...part, padLength: Number(e.target.value) })} />
              )}
            </>
          )}
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={onRemove}><i className="bi bi-trash" /></button>
        </div>
      </div>
    </div>
  );
}

function previewCustomId(format) {
  if (!format?.length) return 'EXAMPLE-ID';
  return format.map(p => {
    switch (p.type) {
      case 'fixed': return p.value || '';
      case 'random20': return p.padded ? '0000042' : '42';
      case 'random32': return p.padded ? '0000001234' : '1234';
      case 'random6': return '042857';
      case 'random9': return '042857321';
      case 'guid': return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
      case 'datetime': return '20240315143022';
      case 'sequence': return p.padded ? '1'.padStart(p.padLength || 6, '0') : '1';
      default: return '';
    }
  }).join('');
}

export default function InventoryPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [inventory, setInventory] = useState(null);
  const [writeAccess, setWriteAccess] = useState(false);
  const [manageAccess, setManageAccess] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [loading, setLoading] = useState(!isNew);

  // Editable state
  const [form, setForm] = useState({
    title: '', description: '', isPublic: false, categoryId: '', tags: [], imageUrl: '',
    fields: [], customIdFormat: [],
  });
  const [version, setVersion] = useState(1);
  const [saveStatus, setSaveStatus] = useState('');
  const saveTimer = useRef(null);
  const lastSavedVersion = useRef(1);

  // Items
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // Access
  const [accessList, setAccessList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);

  // Tags autocomplete
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);

  // Categories
  const [categories, setCategories] = useState([]);

  // Socket
  const socketRef = useRef(null);

  useEffect(() => {
    api.get('/users/tags').then(r => setCategories([])); // categories from DB
    // Load categories
    api.get('/inventories?limit=1').then(() => {
      // We'd normally have a /categories endpoint
    });

    if (!isNew) {
      api.get(`/inventories/${id}`).then(r => {
        const inv = r.data.inventory;
        setInventory(inv);
        setWriteAccess(r.data.writeAccess);
        setManageAccess(r.data.manageAccess);
        setVersion(inv.version);
        lastSavedVersion.current = inv.version;
        setForm({
          title: inv.title,
          description: inv.description || '',
          isPublic: inv.isPublic,
          categoryId: inv.categoryId || '',
          tags: inv.tags?.map(it => it.tag.name) || [],
          imageUrl: inv.imageUrl || '',
          fields: inv.fields?.map(f => ({ ...f, _tempId: f.id })) || [],
          customIdFormat: Array.isArray(inv.customIdFormat) ? inv.customIdFormat.map((p, i) => ({ ...p, _id: i + '_' + p.type })) : [],
        });
        setAccessList(inv.access || []);
        setLoading(false);
      });

      api.get(`/items/inventory/${id}`).then(r => setItems(r.data.items));
      api.get(`/comments/inventory/${id}`).then(r => setComments(r.data.comments));

      // Socket
      const socket = io(import.meta.env.VITE_SOCKET_URL || '');
      socketRef.current = socket;
      socket.emit('join-inventory', id);
      socket.on('comment:created', c => setComments(prev => [...prev, c]));
      socket.on('comment:deleted', ({ id }) => setComments(prev => prev.filter(c => c.id !== id)));
      socket.on('item:created', item => setItems(prev => [item, ...prev]));
      socket.on('item:updated', item => setItems(prev => prev.map(i => i.id === item.id ? item : i)));
      socket.on('item:deleted', ({ id: itemId }) => setItems(prev => prev.filter(i => i.id !== itemId)));
      return () => { socket.emit('leave-inventory', id); socket.disconnect(); };
    } else {
      setWriteAccess(true);
      setManageAccess(true);
      setLoading(false);
    }
  }, [id, isNew]);

  // Auto-save (only for manage users, not for write-only users)
  const autoSave = useCallback(async () => {
    if (!manageAccess || isNew) return;
    setSaveStatus('autoSaving');
    try {
      const r = await api.put(`/inventories/${id}`, { ...form, version: lastSavedVersion.current });
      lastSavedVersion.current = r.data.inventory.version;
      setVersion(r.data.inventory.version);
      setSaveStatus('saved');
    } catch (e) {
      if (e.response?.data?.error === 'Version conflict') {
        setSaveStatus('conflict');
      } else {
        setSaveStatus('error');
      }
    }
  }, [form, id, manageAccess, isNew]);

  useEffect(() => {
    if (!manageAccess || isNew) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('');
    saveTimer.current = setTimeout(autoSave, 8000);
    return () => clearTimeout(saveTimer.current);
  }, [form, autoSave]);

  const handleCreate = async () => {
    try {
      const r = await api.post('/inventories', form);
      navigate(`/inventories/${r.data.inventory.id}`);
    } catch (e) { alert(e.response?.data?.error || t('error')); }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirm'))) return;
    await api.delete(`/inventories/${id}`);
    navigate('/inventories');
  };

  // Fields management
  const addField = (type) => {
    const counts = countByType(form.fields);
    if ((counts[type] || 0) >= FIELD_LIMITS[type]) return alert(`Max ${FIELD_LIMITS[type]} ${t(type)} fields`);
    const _tempId = Date.now() + '_' + type;
    setForm(f => ({ ...f, fields: [...f.fields, { _tempId, label: '', fieldType: type, description: '', showInTable: true }] }));
  };

  const updateField = (idx, field) => setForm(f => {
    const fields = [...f.fields];
    fields[idx] = field;
    return { ...f, fields };
  });

  const removeField = (idx) => setForm(f => ({ ...f, fields: f.fields.filter((_, i) => i !== idx) }));

  const handleFieldDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setForm(f => {
      const ids = f.fields.map(fi => fi.id || fi._tempId);
      const from = ids.indexOf(active.id);
      const to = ids.indexOf(over.id);
      return { ...f, fields: arrayMove(f.fields, from, to) };
    });
  };

  // Custom ID
  const addIdPart = (type) => {
    setForm(f => ({ ...f, customIdFormat: [...f.customIdFormat, { type, _id: Date.now() + '_' + type }] }));
  };

  const updateIdPart = (idx, part) => setForm(f => {
    const parts = [...f.customIdFormat];
    parts[idx] = part;
    return { ...f, customIdFormat: parts };
  });

  const removeIdPart = (idx) => setForm(f => ({ ...f, customIdFormat: f.customIdFormat.filter((_, i) => i !== idx) }));

  const handleIdDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setForm(f => {
      const ids = f.customIdFormat.map(p => p._id);
      return { ...f, customIdFormat: arrayMove(f.customIdFormat, ids.indexOf(active.id), ids.indexOf(over.id)) };
    });
  };

  // Tags autocomplete
  useEffect(() => {
    if (tagInput.length < 1) { setTagSuggestions([]); return; }
    api.get(`/users/tags?q=${encodeURIComponent(tagInput)}`).then(r => setTagSuggestions(r.data.tags.map(t => t.name)));
  }, [tagInput]);

  const addTag = (name) => {
    const clean = name.trim().toLowerCase();
    if (clean && !form.tags.includes(clean)) setForm(f => ({ ...f, tags: [...f.tags, clean] }));
    setTagInput('');
    setTagSuggestions([]);
  };

  // User search for access
  useEffect(() => {
    if (userSearch.length < 2) { setUserResults([]); return; }
    api.get(`/users/search?q=${encodeURIComponent(userSearch)}`).then(r => setUserResults(r.data.users));
  }, [userSearch]);

  const addAccess = async (userId) => {
    const r = await api.post(`/inventories/${id}/access`, { userId });
    setAccessList(prev => [...prev, r.data.access]);
    setUserSearch('');
    setUserResults([]);
  };

  const removeAccess = async (userId) => {
    await api.delete(`/inventories/${id}/access/${userId}`);
    setAccessList(prev => prev.filter(a => a.userId !== userId));
  };

  // Items
const deleteItems = async () => {
  if (!confirm(t('confirm'))) return;
  await api.delete('/items/bulk', { data: { ids: [...selectedItems] } });
  setItems(prev => prev.filter(i => !selectedItems.has(i.id)));
  setSelectedItems(new Set());
};

  const toggleSelect = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(items.map(i => i.id)));
  };

  // Comments
  const submitComment = async () => {
    if (!commentText.trim()) return;
    await api.post(`/comments/inventory/${id}`, { content: commentText });
    setCommentText('');
  };

  const likeItem = async (itemId, liked) => {
    if (liked) await api.delete(`/items/${itemId}/like`);
    else await api.post(`/items/${itemId}/like`);
    setItems(prev => prev.map(i => i.id === itemId ? {
      ...i,
      _count: { ...i._count, likes: liked ? i._count.likes - 1 : i._count.likes + 1 },
      likes: liked ? [] : [{}]
    } : i));
  };

  // Stats
  const [stats, setStats] = useState(null);
  const loadStats = () => {
    if (!stats) api.get(`/inventories/${id}/stats`).then(r => setStats(r.data.stats));
  };

  const tableFields = form.fields.filter(f => f.showInTable);

  if (loading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border" /></div>;

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex align-items-start justify-content-between mb-3 flex-wrap gap-2">
        <div>
          {isNew
            ? <h4>{t('createInventory')}</h4>
            : (
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {inventory?.imageUrl && <img src={inventory.imageUrl} alt="" className="rounded" style={{ height: 48 }} />}
                <div>
                  <h4 className="mb-0">{inventory?.title}</h4>
                  <small className="text-muted">by <Link to={`/profile/${inventory?.ownerId}`}>{inventory?.owner?.username}</Link></small>
                </div>
              </div>
            )}
        </div>
        <div className="d-flex gap-2 align-items-center">
          {saveStatus === 'autoSaving' && <span className="text-muted small"><span className="spinner-border spinner-border-sm me-1" />{t('autoSaving')}</span>}
          {saveStatus === 'saved' && <span className="text-success small"><i className="bi bi-check2 me-1" />{t('saved')}</span>}
          {saveStatus === 'conflict' && <span className="text-danger small">{t('versionConflict')}</span>}
          {isNew && <button className="btn btn-primary btn-sm" onClick={handleCreate}>{t('save')}</button>}
          {!isNew && manageAccess && (
            <button className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
              <i className="bi bi-trash me-1" />{t('deleteInventory')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>{t('items')}</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === 'discussion' ? 'active' : ''}`} onClick={() => setActiveTab('discussion')}>{t('discussion')}</button></li>
        {manageAccess && <>
          <li className="nav-item"><button className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>{t('settings')}</button></li>
          <li className="nav-item"><button className={`nav-link ${activeTab === 'customId' ? 'active' : ''}`} onClick={() => setActiveTab('customId')}>{t('customId')}</button></li>
          <li className="nav-item"><button className={`nav-link ${activeTab === 'fields' ? 'active' : ''}`} onClick={() => setActiveTab('fields')}>{t('fields')}</button></li>
          <li className="nav-item"><button className={`nav-link ${activeTab === 'access' ? 'active' : ''}`} onClick={() => setActiveTab('access')}>{t('access')}</button></li>
          <li className="nav-item"><button className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); loadStats(); }}>{t('stats')}</button></li>
        </>}
      </ul>

      {/* --- ITEMS TAB --- */}
      {activeTab === 'items' && (
        <div>
          {writeAccess &&(
            <div className="mb-2 d-flex gap-2">
              <Link className="btn btn-primary btn-sm" to={`/inventories/${id}/items/new`}><i className="bi bi-plus me-1" />{t('addItem')}</Link>
              {selectedItems.size > 0 && (
                <button className="btn btn-outline-danger btn-sm" onClick={deleteItems}>
                  <i className="bi bi-trash me-1" />{t('deleteItem')} ({selectedItems.size})
                </button>
              )}
            </div>
          )}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  {writeAccess && <th><input type="checkbox" checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleSelectAll} /></th>}
                  <th>{t('title')}</th>
                  {tableFields.map(f => <th key={f.id || f._tempId}>{f.label}</th>)}
                  <th>{t('customId')}</th>
                  <th>{t('createdBy')}</th>
                  <th>{t('createdAt')}</th>
                  <th>{t('likes')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const liked = item.likes?.length > 0;
                  return (
                    <tr key={item.id}
                      onDoubleClick={() => navigate(`/inventories/${id}/items/${item.id}`)}
                      style={{ cursor: 'pointer' }}>
                      {writeAccess && <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelect(item.id)} />
                      </td>}
                      <td>
                        <Link to={`/inventories/${id}/items/${item.id}`} onClick={e => e.stopPropagation()}>
                          {item.name || '—'}
                        </Link>
                      </td>
                      {tableFields.map(f => (
                        <td key={f.id || f._tempId}>
                          {f.fieldType === 'boolean'
                            ? <i className={`bi bi-${item.fieldValues?.[f.id] ? 'check-circle-fill text-success' : 'x-circle text-secondary'}`} />
                            : f.fieldType === 'link' && item.fieldValues?.[f.id]
                              ? <a href={item.fieldValues[f.id]} target="_blank" rel="noreferrer"><i className="bi bi-link-45deg" /></a>
                              : <span className="text-truncate d-block" style={{ maxWidth: 200 }}>{String(item.fieldValues?.[f.id] ?? '')}</span>}
                        </td>
                      ))}
                      <td>
                        <Link to={`/inventories/${id}/items/${item.id}`} onClick={e => e.stopPropagation()}>
                          {item.customId}
                        </Link>
                      </td>
                      <td><small>{item.createdBy?.username}</small></td>
                      <td><small>{new Date(item.createdAt).toLocaleDateString()}</small></td>
                      <td>
                        <button className={`btn btn-sm ${liked ? 'btn-danger' : 'btn-outline-secondary'}`}
                          onClick={e => { e.stopPropagation(); if (user) likeItem(item.id, liked); }}
                          disabled={!user}>
                          <i className="bi bi-heart-fill me-1" />{item._count?.likes ?? 0}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && (
                  <tr><td colSpan={tableFields.length + 6} className="text-center text-muted py-3">{t('noItems')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <small className="text-muted">{t('dragToReorder')}: Double-click row to open item</small>
        </div>
      )}

      {/* --- DISCUSSION TAB --- */}
      {activeTab === 'discussion' && (
        <div>
          <div className="mb-3" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {comments.map(c => (
              <div key={c.id} className="mb-3 border-bottom pb-2">
                <div className="d-flex gap-2 align-items-center mb-1">
                  {c.user.avatarUrl && <img src={c.user.avatarUrl} alt="" className="rounded-circle" width={24} height={24} />}
                  <Link to={`/profile/${c.user.id}`} className="fw-semibold text-decoration-none">{c.user.username}</Link>
                  <small className="text-muted">{new Date(c.createdAt).toLocaleString()}</small>
                </div>
                <div className="ps-4"><ReactMarkdown>{c.content}</ReactMarkdown></div>
              </div>
            ))}
            {!comments.length && <p className="text-muted">{t('noComments')}</p>}
          </div>
          {user && (
            <div>
              <textarea className="form-control mb-2" rows={3} placeholder={t('writeComment')}
                value={commentText} onChange={e => setCommentText(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={submitComment}>{t('addComment')}</button>
            </div>
          )}
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && manageAccess && (
        <div className="row g-3" style={{ maxWidth: 600 }}>
          <div className="col-12">
            <label className="form-label">{t('title')}</label>
            <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="col-12">
            <label className="form-label">{t('description')} (Markdown)</label>
            <textarea className="form-control" rows={4} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            {form.description && (
              <div className="border rounded p-2 mt-1 bg-body-secondary">
                <small className="text-muted d-block mb-1">{t('preview')}</small>
                <ReactMarkdown>{form.description}</ReactMarkdown>
              </div>
            )}
          </div>
          <div className="col-12">
            <label className="form-label">{t('image')} URL</label>
            <input className="form-control" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <div className="col-12">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="isPublic" checked={form.isPublic}
                onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
              <label className="form-check-label" htmlFor="isPublic">{t('isPublic')}</label>
            </div>
          </div>
          {/* Tags */}
          <div className="col-12">
            <label className="form-label">{t('tags')}</label>
            <div className="d-flex flex-wrap gap-1 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="badge bg-secondary d-flex align-items-center gap-1">
                  #{tag}
                  <button className="btn-close btn-close-white btn-sm" style={{ fontSize: 8 }}
                    onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} />
                </span>
              ))}
            </div>
            <div className="position-relative" style={{ maxWidth: 300 }}>
              <input className="form-control form-control-sm" placeholder="Add tag..."
                value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }} />
              {tagSuggestions.length > 0 && (
                <ul className="dropdown-menu show position-absolute w-100" style={{ top: '100%', zIndex: 1000 }}>
                  {tagSuggestions.map(s => (
                    <li key={s}><button className="dropdown-item" onClick={() => addTag(s)}>#{s}</button></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {isNew && (
            <div className="col-12">
              <button className="btn btn-primary" onClick={handleCreate}>{t('save')}</button>
            </div>
          )}
        </div>
      )}

      {/* --- CUSTOM ID TAB --- */}
      {activeTab === 'customId' && manageAccess && (
        <div style={{ maxWidth: 700 }}>
          <div className="alert alert-info d-flex gap-2">
            <i className="bi bi-info-circle-fill" />
            <div>
              <strong>{t('preview')}:</strong> <code>{previewCustomId(form.customIdFormat)}</code>
            </div>
          </div>

          <div className="mb-3 d-flex flex-wrap gap-1">
            {['fixed', 'random20', 'random32', 'random6', 'random9', 'guid', 'datetime', 'sequence'].map(pt => (
              <button key={pt} className="btn btn-sm btn-outline-secondary" onClick={() => addIdPart(pt)}
                title={t(pt)}>
                <i className="bi bi-plus me-1" />{t(pt)}
              </button>
            ))}
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleIdDragEnd}>
            <SortableContext items={form.customIdFormat.map(p => p._id)} strategy={verticalListSortingStrategy}>
              {form.customIdFormat.map((part, idx) => (
                <IdPart key={part._id} part={part}
                  onChange={p => updateIdPart(idx, p)}
                  onRemove={() => removeIdPart(idx)} />
              ))}
            </SortableContext>
          </DndContext>
          {!form.customIdFormat.length && <p className="text-muted">{t('noItems')}</p>}
        </div>
      )}

      {/* --- FIELDS TAB --- */}
      {activeTab === 'fields' && manageAccess && (
        <div style={{ maxWidth: 700 }}>
          <div className="mb-3 d-flex flex-wrap gap-1">
            {['text_single', 'text_multi', 'number', 'link', 'boolean'].map(type => (
              <button key={type} className="btn btn-sm btn-outline-primary" onClick={() => addField(type)}>
                <i className="bi bi-plus me-1" />{t(type)}
              </button>
            ))}
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleFieldDragEnd}>
            <SortableContext items={form.fields.map(f => f.id || f._tempId)} strategy={verticalListSortingStrategy}>
              {form.fields.map((field, idx) => (
                <SortableField key={field.id || field._tempId} field={field}
                  onUpdate={f => updateField(idx, f)}
                  onRemove={() => removeField(idx)} />
              ))}
            </SortableContext>
          </DndContext>
          {!form.fields.length && <p className="text-muted">No fields yet. Add fields using the buttons above.</p>}
        </div>
      )}

      {/* --- ACCESS TAB --- */}
      {activeTab === 'access' && manageAccess && (
        <div style={{ maxWidth: 600 }}>
          <div className="mb-3 position-relative">
            <label className="form-label">{t('addUserAccess')}</label>
            <input className="form-control" value={userSearch}
              onChange={e => setUserSearch(e.target.value)} placeholder="Search by name or email..." />
            {userResults.length > 0 && (
              <ul className="dropdown-menu show w-100" style={{ zIndex: 1000 }}>
                {userResults.map(u => (
                  <li key={u.id}>
                    <button className="dropdown-item" onClick={() => addAccess(u.id)}>
                      {u.username} <small className="text-muted">({u.email})</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr><th>{t('username')}</th><th>{t('email')}</th><th></th></tr>
              </thead>
              <tbody>
                {accessList.map(a => (
                  <tr key={a.userId}>
                    <td><Link to={`/profile/${a.userId}`}>{a.user?.username}</Link></td>
                    <td><small>{a.user?.email}</small></td>
                    <td>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeAccess(a.userId)}>
                        <i className="bi bi-x" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- STATS TAB --- */}
      {activeTab === 'stats' && stats && (
        <div>
          <p><strong>{t('total')} {t('items')}:</strong> {stats.totalItems}</p>
          {Object.entries(stats.fields).map(([label, data]) => (
            <div key={label} className="card mb-2" style={{ maxWidth: 400 }}>
              <div className="card-body py-2">
                <h6 className="card-title mb-1">{label}</h6>
          {data.type === 'number' && (
            <div className="d-flex gap-3 flex-wrap">
            <span><small className="text-muted">{t('count')}</small><br /><strong>{data.count}</strong></span>
            <span><small className="text-muted">Sum</small><br /><strong>{data.sum}</strong></span>
            <span><small className="text-muted">{t('avg')}</small><br /><strong>{data.avg}</strong></span>
            <span><small className="text-muted">{t('min')}</small><br /><strong>{data.min}</strong></span>
            <span><small className="text-muted">{t('max')}</small><br /><strong>{data.max}</strong></span>
          </div>  
)}
                {data.type === 'text' && (
                  <div>
                    <small className="text-muted">{t('topValues')}:</small>
                    {data.topValues.map(([val, cnt]) => (
                      <div key={val} className="d-flex gap-2">
                        <span className="flex-grow-1 text-truncate">{val}</span>
                        <span className="badge bg-secondary">{cnt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
