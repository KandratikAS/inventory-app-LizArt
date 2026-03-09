import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function SortableTable({ items, title, navigate, t }) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const displayed = items
    .filter((i) =>
      !filter ||
      i.title.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const Th = ({ field, label }) => (
    <th
      style={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
      onClick={() => toggleSort(field)}
    >
      {label}{' '}
      {sortField === field && (
        <i className={`bi bi-sort-${sortDir === 'asc' ? 'up' : 'down'}`} />
      )}
    </th>
  );

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 className="fw-semibold mb-0">{title}</h6>
        <input
          className="form-control form-control-sm"
          style={{ width: 180 }}
          placeholder={t('filterPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
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
              <tr
                key={inv.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/inventories/${inv.id}`)}
              >
                <td>
                  <span className="fw-semibold">{inv.title}</span>
                  {inv.isPublic && (
                    <span className="badge bg-success-subtle text-success ms-2 small">Public</span>
                  )}
                </td>
                <td>
                  <small className="text-muted">{new Date(inv.updatedAt).toLocaleDateString()}</small>
                </td>
                <td className="text-center">
                  <span className="badge bg-secondary">{inv._count?.items ?? 0}</span>
                </td>
              </tr>
            ))}
            {!displayed.length && (
              <tr>
                <td colSpan={3} className="text-muted text-center py-3">
                  {t('noInventories')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
  const [myInvs, setMyInvs] = useState([]);
  const [accessInvs, setAccessInvs] = useState([]);
  const [editUsername, setEditUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    const reqs = [api.get(`/users/${profileId}/profile`).then((r) => setProfile(r.data.user))];
    if (isOwn) {
      reqs.push(api.get('/inventories/my').then((r) => setMyInvs(r.data.inventories)));
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

  if (loading)
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    );

  return (
    <div className="container-xl">
      {/* Profile header */}
      {profile && (
        <div className="d-flex align-items-center gap-3 mb-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="rounded-circle border"
              width={72}
              height={72}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold fs-4"
              style={{ width: 72, height: 72 }}
            >
              {profile.username ? profile.username[0].toUpperCase() : '?'}
            </div>
          )}
          <div>
            <h4 className="mb-1">{profile.username}</h4>
            <div className="text-muted small">
              <i className="bi bi-calendar me-1" />{t('joinedAt')}:{' '}
              {new Date(profile.createdAt).toLocaleDateString()}
              <span className="mx-2">·</span>
              <i className="bi bi-collection me-1" />
              {t('totalInventories')}: {profile._count?.inventories ?? 0}
              <span className="mx-2">·</span>
              <i className="bi bi-box me-1" />
              {t('totalItems')}: {profile._count?.items ?? 0}
            </div>
          </div>
        </div>
      )}

      {/* Own profile settings */}
      {isOwn && currentUser && (
        <div className="card mb-4">
          <div className="card-header fw-semibold">
            <i className="bi bi-gear me-2" />{t('settings')}
          </div>
          <div className="card-body">
            <div className="row g-2 align-items-end" style={{ maxWidth: 500 }}>
              <div className="col">
                <label className="form-label small">{t('username')}</label>
                <input
                  className="form-control"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </div>
              <div className="col-auto">
                <button
                  className="btn btn-primary"
                  onClick={saveProfile}
                  disabled={saving || !editUsername.trim()}
                >
                  {saving
                    ? <><span className="spinner-border spinner-border-sm me-1" />{t('saving')}</>
                    : t('save')}
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

      {/* Inventory tables */}
      {isOwn && (
        <>
          <SortableTable items={myInvs} title={t('myInventories')} navigate={navigate} t={t} />
          <SortableTable items={accessInvs} title={t('sharedInventories')} navigate={navigate} t={t} />
        </>
      )}
    </div>
  );
}