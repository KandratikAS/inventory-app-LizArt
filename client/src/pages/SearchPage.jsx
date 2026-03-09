import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function SearchPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState({ inventories: [], items: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    api
      .get(`/search?q=${encodeURIComponent(q)}`)
      .then((r) => setResults(r.data))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="container-xl">
      <h4 className="mb-4">
        <i className="bi bi-search me-2" />
        {t('search')}: <em className="text-primary">{q}</em>
      </h4>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      )}

      {!loading && (
        <>
          {/* Inventories */}
          <h5 className="mb-3">
            <i className="bi bi-collection me-2" />
            {t('inventories')}
            <span className="badge bg-secondary ms-2">{results.inventories.length}</span>
          </h5>
          <div className="table-responsive mb-4 rounded border">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t('title')}</th>
                  <th>{t('description')}</th>
                  <th>{t('owner')}</th>
                </tr>
              </thead>
              <tbody>
                {results.inventories.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/inventories/${inv.id}`} className="fw-semibold">
                        {inv.title}
                      </Link>
                    </td>
                    <td>
                      <small className="text-muted text-truncate d-block" style={{ maxWidth: 400 }}>
                        {String(inv.description || '').slice(0, 120)}
                      </small>
                    </td>
                    <td>
                      <small>{inv.ownerUsername}</small>
                    </td>
                  </tr>
                ))}
                {!results.inventories.length && (
                  <tr>
                    <td colSpan={3} className="text-muted text-center py-3">
                      {t('noInventories')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Items */}
          <h5 className="mb-3">
            <i className="bi bi-box me-2" />
            {t('items')}
            <span className="badge bg-secondary ms-2">{results.items.length}</span>
          </h5>
          <div className="table-responsive rounded border">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t('customId')}</th>
                  <th>{t('inventories')}</th>
                </tr>
              </thead>
              <tbody>
                {results.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/inventories/${item.inventoryId}/items/${item.id}`}>
                        {item.customId}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/inventories/${item.inventoryId}`} className="text-muted small">
                        {item.inventoryTitle}
                      </Link>
                    </td>
                  </tr>
                ))}
                {!results.items.length && (
                  <tr>
                    <td colSpan={2} className="text-muted text-center py-3">
                      {t('noItems')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}