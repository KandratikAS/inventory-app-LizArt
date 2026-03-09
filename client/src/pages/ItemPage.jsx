import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ItemPage() {
  const { t } = useTranslation();
  const { inventoryId, id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [inventory, setInventory] = useState(null);
  const [item, setItem] = useState(null);
  const [writeAccess, setWriteAccess] = useState(false);
  const [form, setForm] = useState({ customId: '', name: '', fieldValues: {} });
  const [version, setVersion] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/inventories/${inventoryId}`).then(r => {
      setInventory(r.data.inventory);
      setWriteAccess(r.data.writeAccess);
    });

    if (!isNew) {
      api.get(`/items/${id}`).then(r => {
        const item = r.data.item;
        setItem(item);
        setVersion(item.version);
        setForm({ customId: item.customId, name: item.name || '', fieldValues: item.fieldValues || {} });
      });
    }
  }, [inventoryId, id, isNew]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const r = await api.post(`/items/inventory/${inventoryId}`, form);
        navigate(`/inventories/${inventoryId}/items/${r.data.item.id}`);
      } else {
        await api.put(`/items/${id}`, { ...form, version });
        navigate(`/inventories/${inventoryId}`);
      }
    } catch (e) {
      const msg = e.response?.data?.error;
      if (msg === 'Version conflict') setError(t('versionConflict'));
      else if (e.response?.data?.field === 'customId') setError(t('customIdConflict'));
      else setError(msg || t('error'));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirm'))) return;
    await api.delete(`/items/${id}`);
    navigate(`/inventories/${inventoryId}`);
  };

  const fields = inventory?.fields || [];

  const setFieldValue = (fieldId, value) => {
    setForm(f => ({ ...f, fieldValues: { ...f.fieldValues, [fieldId]: value } }));
  };

  const readOnly = !isNew && !writeAccess && !user?.isAdmin;


  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to={`/inventories/${inventoryId}`} className="btn btn-link p-0">
          <i className="bi bi-arrow-left" /> {inventory?.title}
        </Link>
        <span className="text-muted">/</span>
        <h5 className="mb-0">{isNew ? t('addItem') : form.customId}</h5>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          {/* Custom ID */}
          <div className="mb-3">
            <label className="form-label fw-semibold">{t('customId')}</label>
            <input className="form-control" value={form.customId} disabled={readOnly}
              onChange={e => setForm(f => ({ ...f, customId: e.target.value }))}
              placeholder={isNew ? 'Will be auto-generated' : ''} />
          </div>

          {/* Name / Title */}
          <div className="mb-3">
            <label className="form-label fw-semibold">{t('title')}</label>
            <input
              className="form-control"
              value={form.name}
              disabled={readOnly}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Custom Fields */}
          {fields.map(field => {
            const val = form.fieldValues[field.id] ?? '';
            return (
              <div key={field.id} className="mb-3">
                <label className="form-label">
                  {field.label}
                  {field.description && (
                    <i className="bi bi-question-circle ms-1 text-muted" title={field.description} />
                  )}
                </label>
                {field.fieldType === 'text_single' && (
                  <input className="form-control" value={val} disabled={readOnly}
                    onChange={e => setFieldValue(field.id, e.target.value)} />
                )}
                {field.fieldType === 'text_multi' && (
                  <textarea className="form-control" rows={3} value={val} disabled={readOnly}
                    onChange={e => setFieldValue(field.id, e.target.value)} />
                )}
                {field.fieldType === 'number' && (
                  <input className="form-control" type="number" value={val} disabled={readOnly}
                    onChange={e => setFieldValue(field.id, e.target.value)} />
                )}
                {field.fieldType === 'link' && (
                  <div className="d-flex gap-2">
                    <input className="form-control" value={val} disabled={readOnly}
                      onChange={e => setFieldValue(field.id, e.target.value)} placeholder="https://..." />
                    {val && <a href={val} target="_blank" rel="noreferrer" className="btn btn-outline-secondary"><i className="bi bi-box-arrow-up-right" /></a>}
                  </div>
                )}
                {field.fieldType === 'boolean' && (
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id={`field_${field.id}`}
                      checked={!!val} disabled={readOnly}
                      onChange={e => setFieldValue(field.id, e.target.checked)} />
                    <label className="form-check-label" htmlFor={`field_${field.id}`}>{field.label}</label>
                  </div>
                )}
              </div>
            );
          })}

          {/* Fixed fields (read-only display) */}
          {!isNew && item && (
            <div className="mt-3 pt-3 border-top text-muted small">
              <div><strong>{t('createdBy')}:</strong> <Link to={`/profile/${item.createdById}`}>{item.createdBy?.username}</Link></div>
              <div><strong>{t('createdAt')}:</strong> {new Date(item.createdAt).toLocaleString()}</div>
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="card-footer d-flex gap-2">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
              {t('save')}
            </button>
            <Link className="btn btn-outline-secondary" to={`/inventories/${inventoryId}`}>{t('cancel')}</Link>
            {!isNew && <button className="btn btn-outline-danger ms-auto" onClick={handleDelete}>{t('deleteItem')}</button>}
          </div>
        )}
      </div>
    </div>
  );
}