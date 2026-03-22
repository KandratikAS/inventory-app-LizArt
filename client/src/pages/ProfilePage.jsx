import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PAGE_SIZE = 10;

function Pagination({ page, total, limit, onPage }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-2">
      <ul className="pagination pagination-sm justify-content-center mb-0">
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPage(page - 1)}>
            <i className="bi bi-chevron-left" />
          </button>
        </li>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => Math.abs(p - page) <= 2)
          .map((p) => (
            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => onPage(p)}>{p}</button>
            </li>
          ))}
        <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPage(page + 1)}>
            <i className="bi bi-chevron-right" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

function SortableInventoryTable({ items, title, navigate, t }) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const toggleSort = (field) => {
    setPage(1);
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = items
    .filter((i) => !filter || i.title.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const Th = ({ field, label }) => (
    <th style={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }} onClick={() => toggleSort(field)}>
      {label}{' '}{sortField === field && <i className={`bi bi-sort-${sortDir === 'asc' ? 'up' : 'down'}`} />}
    </th>
  );

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="fw-semibold mb-0">{title}</h6>
        <input className="form-control form-control-sm" style={{ width: 180 }}
          placeholder={t('filterPlaceholder')} value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }} />
      </div>
      <div className="table-responsive rounded border">
        <table className="table table-hover table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <Th field="title" label={t('title')} />
              <Th field="updatedAt" label={t('updatedAt')} />
              <th className="text-center">{t('items')}</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((inv) => (
              <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/inventories/${inv.id}`)}>
                <td>
                  <span className="fw-semibold">{inv.title}</span>
                  {inv.isPublic && <span className="badge bg-success-subtle text-success ms-2 small">Public</span>}
                </td>
                <td><small className="text-muted">{new Date(inv.updatedAt).toLocaleDateString()}</small></td>
                <td className="text-center"><span className="badge bg-secondary">{inv._count?.items ?? 0}</span></td>
              </tr>
            ))}
            {!displayed.length && (
              <tr><td colSpan={3} className="text-muted text-center py-3">{t('noInventories')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} limit={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

function SortableItemTable({ items, title, navigate, t }) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const toggleSort = (field) => {
    setPage(1);
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = items
    .filter((i) => !filter ||
      (i.name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (i.inventory?.title || '').toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const displayed = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const Th = ({ field, label }) => (
    <th style={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }} onClick={() => toggleSort(field)}>
      {label}{' '}{sortField === field && <i className={`bi bi-sort-${sortDir === 'asc' ? 'up' : 'down'}`} />}
    </th>
  );

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="fw-semibold mb-0">{title}</h6>
        <input className="form-control form-control-sm" style={{ width: 180 }}
          placeholder={t('filterPlaceholder')} value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }} />
      </div>
      <div className="table-responsive rounded border">
        <table className="table table-hover table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <Th field="name" label={t('title')} />
              <Th field="createdAt" label={t('createdAt')} />
              <th>{t('inventory')}</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((item) => (
              <tr key={item.id} style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/inventories/${item.inventoryId}/items/${item.id}`)}>
                <td><span className="fw-semibold">{item.name || '—'}</span></td>
                <td><small className="text-muted">{new Date(item.createdAt).toLocaleDateString()}</small></td>
                <td>
                  <Link to={`/inventories/${item.inventoryId}`} onClick={e => e.stopPropagation()}
                    className="text-decoration-none small text-muted">
                    {item.inventory?.title}
                  </Link>
                </td>
              </tr>
            ))}
            {!displayed.length && (
              <tr><td colSpan={3} className="text-muted text-center py-3">{t('noItems')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={filtered.length} limit={PAGE_SIZE} onPage={setPage} />
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const profileId = id || currentUser?.id;
  const isOwn = !id || id === currentUser?.id;

  const [profile, setProfile] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [accessInvs, setAccessInvs] = useState([]);
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeProfileTab, setActiveProfileTab] = useState('items');

  const [sfForm, setSfForm] = useState({ firstName: '', lastName: '', phone: '', company: '' });
  const [sfLoading, setSfLoading] = useState(false);
  const [sfMsg, setSfMsg] = useState('');
  const [sfSuccess, setSfSuccess] = useState(false);
  const [showSfForm, setShowSfForm] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    const reqs = [api.get(`/users/${profileId}/profile`).then((r) => setProfile(r.data.user))];
    if (isOwn) {
      reqs.push(api.get('/items/my/created').then((r) => setMyItems(r.data.items)));
      reqs.push(api.get('/inventories/accessible').then((r) => setAccessInvs(r.data.inventories)));
    }
    Promise.all(reqs).finally(() => setLoading(false));
  }, [profileId, isOwn]);

  useEffect(() => {
    if (currentUser) setEditUsername(currentUser.username);
  }, [currentUser]);

  const saveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const { data } = await api.put('/auth/me', { username: editUsername });
      updateUser(data.user);
      setProfile(data.user);
      setSaveMsg(t('success'));
    } catch (e) {
      setSaveMsg(e.response?.data?.error || t('error'));
    } finally {
      setSaving(false);
    }
  };

  const syncToSalesforce = async () => {
    setSfLoading(true);
    setSfMsg('');
    setSfSuccess(false);
    try {
      await api.post('/salesforce/sync', { ...sfForm });
      setSfSuccess(true);
      setSfMsg(t('sfSuccess'));
      setShowSfForm(false);
    } catch (e) {
      setSfMsg(e.response?.data?.error || t('error'));
    } finally {
      setSfLoading(false);
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    );

  return (
    <div className="container-xl">
      {profile && (
        <div className="d-flex align-items-center gap-3 mb-4">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.username} className="rounded-circle border"
              width={72} height={72} style={{ objectFit: 'cover' }} />
          ) : (
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-4"
              style={{ width: 72, height: 72 }}>
              {profile.username ? profile.username[0].toUpperCase() : '?'}
            </div>
          )}
          <div>
            <h4 className="mb-1">{profile.username}</h4>
            <div className="text-muted small">
              <i className="bi bi-calendar me-1" />{t('joinedAt')}: {new Date(profile.createdAt).toLocaleDateString()}
              <span className="mx-2">·</span>
              <i className="bi bi-collection me-1" />{t('totalInventories')}: {profile._count?.inventories ?? 0}
              <span className="mx-2">·</span>
              <i className="bi bi-box me-1" />{t('totalItems')}: {profile._count?.items ?? 0}
            </div>
          </div>
        </div>
      )}

      {isOwn && currentUser && (
        <div className="card mb-4">
          <div className="card-header fw-semibold">
            <i className="bi bi-gear me-2" />{t('settings')}
          </div>
          <div className="card-body">
            <div className="row g-2 align-items-end" style={{ maxWidth: 500 }}>
              <div className="col">
                <label className="form-label small">{t('username')}</label>
                <input className="form-control" value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)} />
              </div>
              <div className="col-auto">
                <button className="btn btn-primary" onClick={saveProfile}
                  disabled={saving || !editUsername.trim()}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1" />{t('saving')}</> : t('save')}
                </button>
              </div>
            </div>
            {saveMsg && (
              <div className={`mt-2 small ${saveMsg === t('success') ? 'text-success' : 'text-danger'}`}>
                {saveMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {isOwn && currentUser && (
        <div className="card mb-4">
          <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
            <span>
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg"
                alt="Salesforce" height={18} className="me-2" />
              Salesforce CRM
              {sfSuccess && <span className="badge bg-success ms-2 small"><i className="bi bi-check2 me-1" />{t('synced')}</span>}
            </span>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { setShowSfForm(v => !v); setSfMsg(''); }}>
              {showSfForm ? t('cancel') : t('syncWithSalesforce')}
            </button>
          </div>
          {showSfForm && (
            <div className="card-body">
              <p className="text-muted small mb-3">{t('sfDescription')}</p>
              <div className="row g-2" style={{ maxWidth: 500 }}>
                <div className="col-6">
                  <label className="form-label small fw-semibold">{t('firstName')} *</label>
                  <input className="form-control" value={sfForm.firstName}
                    onChange={e => setSfForm(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">{t('lastName')} *</label>
                  <input className="form-control" value={sfForm.lastName}
                    onChange={e => setSfForm(p => ({ ...p, lastName: e.target.value }))} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">{t('phone')}</label>
                  <input className="form-control" value={sfForm.phone}
                    placeholder="+1 234 567 8900"
                    onChange={e => setSfForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">{t('company')}</label>
                  <input className="form-control" value={sfForm.company}
                    onChange={e => setSfForm(p => ({ ...p, company: e.target.value }))} />
                </div>
                <div className="col-12 mt-1">
                  <small className="text-muted">
                    <i className="bi bi-envelope me-1" />{t('email')}: <strong>{currentUser.email}</strong>
                  </small>
                </div>
                <div className="col-12">
                  <button className="btn btn-primary btn-sm"
                    disabled={sfLoading || !sfForm.firstName.trim() || !sfForm.lastName.trim()}
                    onClick={syncToSalesforce}>
                    {sfLoading
                      ? <><span className="spinner-border spinner-border-sm me-1" />{t('syncing')}</>
                      : <><i className="bi bi-cloud-upload me-1" />{t('syncWithSalesforce')}</>}
                  </button>
                </div>
                {sfMsg && (
                  <div className={`col-12 small ${sfSuccess ? 'text-success' : 'text-danger'}`}>
                    {sfSuccess ? <><i className="bi bi-check2-circle me-1" />{sfMsg}</> : sfMsg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isOwn && (
        <>
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button className={`nav-link ${activeProfileTab === 'items' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('items')}>
                <i className="bi bi-box me-1" />{t('myItems')}
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeProfileTab === 'shared' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('shared')}>
                <i className="bi bi-people me-1" />{t('sharedInventories')}
              </button>
            </li>
          </ul>

          {activeProfileTab === 'items' && (
            <SortableItemTable items={myItems} title="" navigate={navigate} t={t} />
          )}

          {activeProfileTab === 'shared' && (
            <SortableInventoryTable items={accessInvs} title="" navigate={navigate} t={t} />
          )}
        </>
      )}
    </div>
  );
}
