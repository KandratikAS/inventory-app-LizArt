import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Users
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [catLoading, setCatLoading] = useState(false);

  // Items per category
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryItems, setCategoryItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Inventories
  const [inventories, setInventories] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invFilter, setInvFilter] = useState('');
  const [showCreateInv, setShowCreateInv] = useState(false);
  const [newInv, setNewInv] = useState({ title: '', description: '', isPublic: false, ownerId: '' });
  const [invSaving, setInvSaving] = useState(false);

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/'); return; }
    api.get('/users').then((r) => setUsers(r.data.users)).finally(() => setLoading(false));
    api.get('/inventories/categories').then((r) => setCategories(r.data.categories));
  }, [user, navigate]);

  const reload = () => api.get('/users').then((r) => setUsers(r.data.users));

  // ── Users ──────────────────────────────────────────────────────────────────
  const doAction = async (userId, action) => {
    if (action === 'delete' && !window.confirm(t('confirm'))) return;
    setActionLoading(userId + action);
    try {
      if (action === 'block') await api.put(`/users/${userId}/block`);
      if (action === 'unblock') await api.put(`/users/${userId}/unblock`);
      if (action === 'delete') await api.delete(`/users/${userId}`);
      if (action === 'makeAdmin') await api.put(`/users/${userId}/admin`, { isAdmin: true });
      if (action === 'removeAdmin') await api.put(`/users/${userId}/admin`, { isAdmin: false });
      if (userId === user.id && (action === 'removeAdmin' || action === 'delete')) {
        logout(); navigate('/'); return;
      }
      await reload();
    } catch (e) {
      alert(e.response?.data?.error || t('error'));
    } finally {
      setActionLoading(null);
    }
  };

  // ── Categories ─────────────────────────────────────────────────────────────
  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCatLoading(true);
    try {
      const r = await api.post('/inventories/categories', { name: newCategoryName.trim() });
      setCategories((prev) => [...prev, r.data.category]);
      setNewCategoryName('');
    } catch (e) {
      alert(e.response?.data?.error || t('error'));
    } finally {
      setCatLoading(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm(t('confirm'))) return;
    try {
      await api.delete(`/inventories/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategory?.id === id) { setSelectedCategory(null); setCategoryItems([]); }
    } catch (e) {
      alert(e.response?.data?.error || t('error'));
    }
  };

  const loadCategoryItems = async (category) => {
    setSelectedCategory(category);
    setItemsLoading(true);
    try {
      const r = await api.get(`/inventories?category=${category.id}&limit=100`);
      const inventoriesList = r.data.inventories;
      const allItems = [];
      for (const inv of inventoriesList) {
        const ir = await api.get(`/items/inventory/${inv.id}`);
        ir.data.items.forEach((item) => allItems.push({ ...item, inventoryTitle: inv.title, inventoryId: inv.id }));
      }
      setCategoryItems(allItems);
    } catch (e) {
      alert(e.response?.data?.error || t('error'));
    } finally {
      setItemsLoading(false);
    }
  };

  // ── Inventories ────────────────────────────────────────────────────────────
  const loadInventories = async () => {
    setInvLoading(true);
    try {
      const r = await api.get('/inventories?limit=100');
      setInventories(r.data.inventories);
    } catch (e) {
      alert(e.response?.data?.error || t('error'));
    } finally {
      setInvLoading(false);
    }
  };

  const createInventory = async () => {
    if (!newInv.title.trim()) return alert('Title required');
    setInvSaving(true);
    try {
      await api.post('/inventories', newInv);
      setShowCreateInv(false);
      setNewInv({ title: '', description: '', isPublic: false, ownerId: '' });
      await loadInventories();
    } catch (e) {
      alert(e.response?.data?.error || t('error'));
    } finally {
      setInvSaving(false);
    }
  };

  const deleteInventory = async (id) => {
    if (!window.confirm(t('confirm'))) return;
    try {
      await api.delete(`/inventories/${id}`);
      setInventories(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert(e.response?.data?.error || t('error'));
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase())
  );

  if (!user?.isAdmin) return null;

  return (
    <div className="container-xl">
      <h4 className="mb-4">
        <i className="bi bi-shield-shaded me-2 text-warning" />
        {t('admin')}
      </h4>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <i className="bi bi-people me-1" />{t('users')}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <i className="bi bi-grid me-1" />Categories
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'inventories' ? 'active' : ''}`}
            onClick={() => { setActiveTab('inventories'); loadInventories(); }}>
            <i className="bi bi-collection me-1" />Inventories
          </button>
        </li>
      </ul>

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <>
          <div className="mb-3" style={{ maxWidth: 300 }}>
            <input className="form-control" placeholder={t('filterPlaceholder')}
              value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          {loading ? (
            <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
          ) : (
            <div className="table-responsive rounded border">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('username')}</th>
                    <th>{t('email')}</th>
                    <th className="text-center">Admin</th>
                    <th className="text-center">{t('blocked')}</th>
                    <th>{t('joinedAt')}</th>
                    <th>{t('totalInventories')}</th>
                    <th style={{ minWidth: 340 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isSelf = u.id === user.id;
                    return (
                      <tr key={u.id} className={u.isBlocked ? 'table-danger' : ''}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {u.avatarUrl && <img src={u.avatarUrl} alt="" className="rounded-circle" width={28} height={28} style={{ objectFit: 'cover' }} />}
                            {u.username}
                            {isSelf && <span className="badge bg-info text-dark small">You</span>}
                          </div>
                        </td>
                        <td><small className="text-muted">{u.email}</small></td>
                        <td className="text-center">{u.isAdmin && <i className="bi bi-shield-fill text-warning" />}</td>
                        <td className="text-center">{u.isBlocked && <span className="badge bg-danger">{t('blocked')}</span>}</td>
                        <td><small>{new Date(u.createdAt).toLocaleDateString()}</small></td>
                        <td className="text-center"><span className="badge bg-secondary">{u._count?.inventories ?? 0}</span></td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {u.isBlocked
                              ? <button className="btn btn-sm btn-success" disabled={actionLoading === u.id + 'unblock'} onClick={() => doAction(u.id, 'unblock')}><i className="bi bi-unlock me-1" />{t('unblockUser')}</button>
                              : <button className="btn btn-sm btn-warning" disabled={actionLoading === u.id + 'block'} onClick={() => doAction(u.id, 'block')}><i className="bi bi-slash-circle me-1" />{t('blockUser')}</button>}
                            {u.isAdmin
                              ? <button className="btn btn-sm btn-outline-secondary" disabled={actionLoading === u.id + 'removeAdmin'} onClick={() => doAction(u.id, 'removeAdmin')}><i className="bi bi-shield-x me-1" />{t('removeAdmin')}</button>
                              : <button className="btn btn-sm btn-outline-primary" disabled={actionLoading === u.id + 'makeAdmin'} onClick={() => doAction(u.id, 'makeAdmin')}><i className="bi bi-shield-plus me-1" />{t('makeAdmin')}</button>}
                            <button className="btn btn-sm btn-outline-danger" disabled={actionLoading === u.id + 'delete'} onClick={() => doAction(u.id, 'delete')}><i className="bi bi-trash me-1" />{t('deleteUser')}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── CATEGORIES TAB ── */}
      {activeTab === 'categories' && (
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card">
              <div className="card-header fw-semibold">Categories</div>
              <div className="card-body">
                <div className="d-flex gap-2 mb-3">
                  <input className="form-control form-control-sm" placeholder="Category name..."
                    value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createCategory()} />
                  <button className="btn btn-primary btn-sm" onClick={createCategory} disabled={catLoading}>
                    <i className="bi bi-plus-lg" />
                  </button>
                </div>
                <ul className="list-group list-group-flush">
                  {categories.map((cat) => (
                    <li key={cat.id}
                      className={`list-group-item d-flex justify-content-between align-items-center px-0 ${selectedCategory?.id === cat.id ? 'fw-semibold text-primary' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => loadCategoryItems(cat)}>
                      <span><i className="bi bi-grid me-2 text-muted" />{cat.name}</span>
                      <button className="btn btn-sm btn-outline-danger"
                        onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}>
                        <i className="bi bi-trash" />
                      </button>
                    </li>
                  ))}
                  {!categories.length && <li className="list-group-item text-muted px-0">No categories yet</li>}
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            {selectedCategory ? (
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Items in "{selectedCategory.name}"</span>
                  <Link className="btn btn-primary btn-sm" to={`/inventories?category=${selectedCategory.id}`}>
                    <i className="bi bi-collection me-1" />View Inventories
                  </Link>
                </div>
                <div className="card-body p-0">
                  {itemsLoading ? (
                    <div className="d-flex justify-content-center py-4"><div className="spinner-border" /></div>
                  ) : (
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Item</th>
                          <th>Inventory</th>
                          <th>Custom ID</th>
                          <th>Created</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name || '—'}</td>
                            <td><small className="text-muted">{item.inventoryTitle}</small></td>
                            <td><code className="small">{item.customId}</code></td>
                            <td><small>{new Date(item.createdAt).toLocaleDateString()}</small></td>
                            <td>
                              <Link className="btn btn-sm btn-outline-secondary"
                                to={`/inventories/${item.inventoryId}/items/${item.id}`}>
                                <i className="bi bi-box-arrow-up-right" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {!categoryItems.length && (
                          <tr><td colSpan={5} className="text-center text-muted py-3">No items in this category</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted" style={{ minHeight: 200 }}>
                <div className="text-center">
                  <i className="bi bi-grid fs-1 d-block mb-2" />
                  Select a category to view its items
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INVENTORIES TAB ── */}
      {activeTab === 'inventories' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
            <input className="form-control" style={{ maxWidth: 300 }} placeholder="Filter by title..."
              value={invFilter} onChange={e => setInvFilter(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateInv(v => !v)}>
              <i className="bi bi-plus me-1" />Create Inventory
            </button>
          </div>

          {showCreateInv && (
            <div className="card mb-4" style={{ maxWidth: 500 }}>
              <div className="card-body">
                <h6 className="fw-bold mb-3"><i className="bi bi-collection me-2" />New Inventory</h6>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Title *</label>
                  <input className="form-control form-control-sm" value={newInv.title}
                    onChange={e => setNewInv(p => ({ ...p, title: e.target.value }))}
                    placeholder="Inventory title..." />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Description</label>
                  <textarea className="form-control form-control-sm" rows={2} value={newInv.description}
                    onChange={e => setNewInv(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description..." />
                </div>
                <div className="mb-2">
                  <label className="form-label small fw-semibold">Owner *</label>
                  <select className="form-select form-select-sm" value={newInv.ownerId}
                    onChange={e => setNewInv(p => ({ ...p, ownerId: e.target.value }))}>
                    <option value="">— select user —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" id="invPublic"
                    checked={newInv.isPublic} onChange={e => setNewInv(p => ({ ...p, isPublic: e.target.checked }))} />
                  <label className="form-check-label small" htmlFor="invPublic">Public</label>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={createInventory} disabled={invSaving}>
                    {invSaving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                    Save
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowCreateInv(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {invLoading ? (
            <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
          ) : (
            <div className="table-responsive rounded border">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Title</th>
                    <th>Owner</th>
                    <th className="text-center">Items</th>
                    <th className="text-center">Public</th>
                    <th className="text-center">Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {inventories
                    .filter(i => i.title.toLowerCase().includes(invFilter.toLowerCase()))
                    .map(inv => (
                      <tr key={inv.id}>
                        <td>
                          <Link to={`/inventories/${inv.id}`} className="fw-semibold text-decoration-none">
                            {inv.title}
                          </Link>
                          {inv.description && <small className="text-muted d-block text-truncate" style={{ maxWidth: 250 }}>{inv.description}</small>}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            {inv.owner?.avatarUrl && <img src={inv.owner.avatarUrl} alt="" className="rounded-circle" width={22} height={22} style={{ objectFit: 'cover' }} />}
                            <small>{inv.owner?.username}</small>
                          </div>
                        </td>
                        <td className="text-center"><span className="badge bg-secondary">{inv._count?.items ?? 0}</span></td>
                        <td className="text-center">{inv.isPublic ? <i className="bi bi-globe text-success" /> : <i className="bi bi-lock text-muted" />}</td>
                        <td className="text-center"><small>{new Date(inv.createdAt).toLocaleDateString()}</small></td>
                        <td>
                          <div className="d-flex gap-1">
                            <Link className="btn btn-sm btn-outline-secondary" to={`/inventories/${inv.id}`}>
                              <i className="bi bi-pencil" />
                            </Link>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteInventory(inv.id)}>
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!inventories.filter(i => i.title.toLowerCase().includes(invFilter.toLowerCase())).length && (
                    <tr><td colSpan={6} className="text-center text-muted py-3">No inventories found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
