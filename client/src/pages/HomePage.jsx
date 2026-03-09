import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const defaultRecent = [
    { id: 'm1', icon: "🖥️", title: "Curved Monitor", owner: {username: "Emma"}, description: "27-inch 4K curved monitors", category: "electronics", _count: {items: 12} },
    { id: 'm2', icon: "🗂️", title: "HR Dossiers", owner: {username: "Paul"}, description: "Employee performance records", category: "hr", _count: {items: 45} },
    { id: 'm3', icon: "📖", title: "Reference Books", owner: {username: "Artur"}, description: "Technical manuals", category: "books", _count: {items: 8} },
    { id: 'm4', icon: "💻", title: "Work Laptops", owner: {username: "Norbert"}, description: "Laptops for developers", category: "electronics", _count: {items: 15} },
    { id: 'm5', icon: "📦", title: "Supplies Kit", owner: {username: "Lizaveta"}, description: "Office essentials", category: "office", _count: {items: 100} },
    { id: 'm6', icon: "📱", title: "Smartphones", owner: {username: "Ihar"}, description: "Latest models", category: "electronics", _count: {items: 20} },
    { id: 'm7', icon: "📝", title: "Office Supplies", owner: {username: "Lizaveta"}, description: "Stationery items", category: "office", _count: {items: 100} },
    { id: 'm8', icon: "📱", title: "Smartphones", owner: {username: "Ron"}, description: "Latest models", category: "electronics", _count: {items: 20} },
  ];

  const defaultPopular = [
    { id: 'p1', title: "Office Supplies", _count: { items: 100 } },
    { id: 'p2', title: "Phones", _count: { items: 80 } },
    { id: 'p3', title: "Employees", _count: { items: 67 } },
    { id: 'p4', title: "Supplies Kits", _count: { items: 50 } },
    { id: 'p5', title: "Reference Books", _count: { items: 16 } },
  ];

  const [recent, setRecent] = useState(defaultRecent);
  const [popular, setPopular] = useState(defaultPopular);
  const [tags, setTags] = useState([{id: 1, name: 'office'}, {id: 2, name: 'tech'}, {id: 3, name: 'electronics'}, {id: 4, name: 'books'}, {id: 5, name: 'hr'}]);
  const [stats, setStats] = useState({ totalInventories: 124, totalItems: 1540, activeUsers: 42 });
  const [loading, setLoading] = useState(true);
  const [recentSort, setRecentSort] = useState({ column: 'owner', asc: true });

  const categoryColors = {
    electronics: "table-success",
    books: "table-primary",
    hr: "table-warning",
    office: "table-secondary",
  };

  useEffect(() => {
    Promise.all([
      api.get('/inventories?limit=10'),
      api.get('/inventories?limit=5&sort=popular'),
      api.get('/users/tags'),
      api.get('/inventories/stats')
    ])
      .then(([recentRes, popularRes, tagsRes, statsRes]) => {
        if (recentRes?.data?.inventories?.length) setRecent(recentRes.data.inventories);
        if (popularRes?.data?.inventories?.length) setPopular(popularRes.data.inventories);
        if (tagsRes?.data?.tags?.length) setTags(tagsRes.data.tags);
        if (statsRes?.data) setStats(statsRes.data);
      })
      .catch(err => console.error("API Error:", err))
      .finally(() => setLoading(false));
  }, []);

  const sortItems = (items, config) => {
    return [...items].sort((a, b) => {
      let valA, valB;
      if (config.column === 'owner') {
        valA = a.owner?.username?.toLowerCase() || '';
        valB = b.owner?.username?.toLowerCase() || '';
      } else if (config.column === 'count') {
        valA = a._count?.items ?? 0;
        valB = b._count?.items ?? 0;
      } else {
        valA = (a[config.column] || '').toString().toLowerCase();
        valB = (b[config.column] || '').toString().toLowerCase();
      }
      if (valA < valB) return config.asc ? -1 : 1;
      if (valA > valB) return config.asc ? 1 : -1;
      return 0;
    });
  };

  const toggleSort = (col) => {
    setRecentSort(prev => ({ column: col, asc: prev.column === col ? !prev.asc : true }));
  };

  const maxCount = Math.max(...popular.map(i => i._count?.items ?? 0), 1);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ minHeight: '100vh' }}>

      {/* --- 1. Статыстыка --- */}
      <div className="row g-3 mb-5">
        {[
          { label: t('totalInventories'), value: stats.totalInventories, icon: 'bi-collection', color: '#0d6efd' },
          { label: t('totalItems'), value: stats.totalItems, icon: 'bi-box-seam', color: '#6610f2' },
          { label: t('activeUsers'), value: stats.activeUsers, icon: 'bi-people', color: '#198754' }
        ].map((s, i) => (
          <div key={i} className="col-12 col-md-4">
            <div className="card border-0 shadow-sm rounded-4 p-3 h-100 d-flex flex-row align-items-center">
              <i className={`bi ${s.icon} fs-1 me-3`} style={{ color: s.color }} />
              <div>
                <h6 className="text-muted small mb-1">{s.label}</h6>
                <h4 className="fw-bold mb-0">{s.value}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* --- 2. Галоўная табліца --- */}
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="card-header py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold">{t('recentInventories')}</h5>
              <Link to="/inventories" className="btn btn-sm btn-outline-secondary">{t('inventories')}</Link>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase fw-bold">
                    <th className="ps-4 py-3" onClick={() => toggleSort('owner')} style={{ cursor: 'pointer', width: '25%' }}>
                      <div className="d-flex align-items-center">
                        {t('owner')}
                        <i className={`bi bi-chevron-${recentSort.column === 'owner' ? (recentSort.asc ? 'up' : 'down') : 'expand'} ms-1 opacity-50`} />
                      </div>
                    </th>
                    <th className="py-3" onClick={() => toggleSort('title')} style={{ cursor: 'pointer', width: '55%' }}>
                      <div className="d-flex align-items-center justify-content-center">
                        {t('title')}
                        <i className={`bi bi-chevron-${recentSort.column === 'title' ? (recentSort.asc ? 'up' : 'down') : 'expand'} ms-1 opacity-50`} />
                      </div>
                    </th>
                    <th className="text-center py-3" onClick={() => toggleSort('count')} style={{ cursor: 'pointer', width: '20%' }}>
                      <div className="d-flex align-items-center justify-content-center">
                        {t('items')}
                        <i className={`bi bi-chevron-${recentSort.column === 'count' ? (recentSort.asc ? 'up' : 'down') : 'expand'} ms-1 opacity-50`} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {sortItems(recent, recentSort).map(inv => (
                    <tr key={inv.id} onClick={() => navigate(`/inventories/${inv.id}`)} className={categoryColors[inv.category] || ''} style={{ cursor: 'pointer' }}>
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-2"
                            style={{ width: 30, height: 30, fontSize: '0.75rem', flexShrink: 0 }}>
                            {inv.owner?.username?.charAt(0).toUpperCase()}
                          </div>
                          <span className="fw-semibold small">{inv.owner?.username}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center ms-md-4">
                          <span className="fs-4 me-3">{inv.icon || '📦'}</span>
                          <div>
                            <div className="fw-bold mb-0">{inv.title}</div>
                            <small className="text-muted d-block text-truncate" style={{ maxWidth: 250 }}>
                              {inv.description}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <span className="badge bg-secondary bg-opacity-25 text-body border px-3 py-2 rounded-pill fw-bold">
                          {inv._count?.items ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* --- 3. Бакавая панэль --- */}
        <div className="col-12 col-xl-4 d-flex flex-column gap-4">

          {/* Popular */}
          <div className="card border-0 shadow-sm rounded-4 p-3">
            <h6 className="fw-bold mb-3">{t('popularInventories')}</h6>
            {popular.map((inv, idx) => {
              const count = inv._count?.items ?? 0;
              const percent = (count / maxCount) * 100;
              return (
                <div key={inv.id} className="mb-3" onClick={() => navigate(`/inventories/${inv.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-medium">{inv.title}</span>
                    <span className="text-muted">{count}</span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: 6 }}>
                    <div className="progress-bar bg-primary" style={{ width: `${percent}%`, opacity: 1 - idx * 0.15 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tags */}
          <div className="card border-0 shadow-sm rounded-4 p-3">
            <h6 className="fw-bold mb-3 text-center">{t('tagCloud')}</h6>
            <div className="d-flex flex-wrap justify-content-center gap-2">
              {tags.map(tag => (
                <Link key={tag.id} to={`/inventories?tag=${tag.name}`}
                  className="badge border text-primary border-primary-subtle text-decoration-none px-3 py-2 rounded-pill shadow-sm-hover">
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .shadow-sm-hover:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.1) !important; transform: translateY(-1px); transition: 0.3s; }
      `}</style>
    </div>
  );
}
