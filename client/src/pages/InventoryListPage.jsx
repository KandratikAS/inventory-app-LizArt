import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function InventoryListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tag = searchParams.get('tag');

  const [inventories, setInventories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page, limit: LIMIT });
    if (tag) qs.set('tag', tag);
    api
      .get(`/inventories?${qs}`)
      .then((r) => {
        setInventories(r.data.inventories);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  }, [page, tag]);

  const displayed = filter
    ? inventories.filter((i) =>
        i.title.toLowerCase().includes(filter.toLowerCase()) ||
        i.owner?.username.toLowerCase().includes(filter.toLowerCase())
      )
    : inventories;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="container-xl">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <h4 className="mb-0">
          {tag ? (
            <>
              <i className="bi bi-tag me-2" />#{tag}
            </>
          ) : (
            <>
              <i className="bi bi-collection me-2" />{t('inventories')}
            </>
          )}
          <span className="text-muted fs-6 ms-2">({total})</span>
        </h4>

        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm"
            style={{ width: 200 }}
            placeholder={t('filterPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <div className="table-responsive rounded border">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>{t('title')}</th>
                <th>{t('category')}</th>
                <th>{t('tags')}</th>
                <th>{t('owner')}</th>
                <th className="text-center">{t('items')}</th>
                <th>{t('createdAt')}</th>
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
                    <div className="d-flex align-items-center gap-2">
                      {inv.imageUrl && (
                        <img
                          src={inv.imageUrl}
                          alt=""
                          className="rounded"
                          style={{ width: 32, height: 32, objectFit: 'cover' }}
                        />
                      )}
                      <div>
                        <span className="fw-semibold">{inv.title}</span>
                        {inv.isPublic && (
                          <span className="badge bg-success-subtle text-success ms-2 small">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <small className="text-muted">{inv.category?.name || '—'}</small>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {inv.tags?.slice(0, 4).map((it) => (
                        <span
                          key={it.tagId}
                          className="badge"
                          style={{ background: 'var(--bs-secondary-bg)', color: 'var(--bs-body-color)', border: '1px solid var(--bs-border-color)', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/inventories?tag=${encodeURIComponent(it.tag.name)}`);
                          }}
                        >
                          #{it.tag.name}
                        </span>
                      ))}
                      {(inv.tags?.length ?? 0) > 4 && (
                        <span className="badge bg-secondary">+{inv.tags.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <small className="text-muted">{inv.owner?.username}</small>
                  </td>
                  <td className="text-center">
                    <span className="badge bg-secondary">{inv._count?.items ?? 0}</span>
                  </td>
                  <td>
                    <small className="text-muted">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </small>
                  </td>
                </tr>
              ))}
              {!displayed.length && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    {t('noInventories')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-3">
          <ul className="pagination pagination-sm justify-content-center">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => p - 1)}>
                <i className="bi bi-chevron-left" />
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>
                    {p}
                  </button>
                </li>
              ))}
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => p + 1)}>
                <i className="bi bi-chevron-right" />
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}