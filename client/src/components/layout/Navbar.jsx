import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import i18n from '../../i18n';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const switchLang = async (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    if (user) {
      try { await api.put('/auth/me', { language: lang }); } catch {}
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const apiBase = import.meta.env.VITE_API_URL || '';

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom shadow-sm">
      <div className="container-fluid">
        {/* Brand */}
    <Link className="navbar-brand fw-bold fs-4 d-flex align-items-center gap-2" to="/">
    <span style={{ fontSize: 28 }}>🦎</span>
    {t('appName')}
    </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          {/* Global search */}
          <form
            className="d-flex mx-auto my-2 my-lg-0"
            style={{ maxWidth: 420, width: '100%' }}
            onSubmit={handleSearch}
          >
            <div className="input-group">
              <input
                className="form-control"
                type="search"
                placeholder={t('searchPlaceholder')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="btn btn-outline-secondary" type="submit" title={t('search')}>
                <i className="bi bi-search" />
              </button>
            </div>
          </form>

          <ul className="navbar-nav ms-auto align-items-center gap-1">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                <i className="bi bi-house me-1" />{t('home')}
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/inventories">
                <i className="bi bi-collection me-1" />{t('inventories')}
              </Link>
            </li>

            {/* Theme toggle */}
            <li className="nav-item">
              <button
                className="btn btn-link nav-link px-2"
                onClick={toggle}
                title={theme === 'light' ? t('dark') : t('light')}
              >
                <i className={`bi bi-${theme === 'light' ? 'moon-stars' : 'sun'}`} />
              </button>
            </li>

            {/* Language */}
            <li className="nav-item dropdown">
              <button
                className="btn btn-link nav-link dropdown-toggle px-2"
                data-bs-toggle="dropdown"
                title={t('language')}
              >
                <i className="bi bi-translate" />
                <span className="ms-1 d-none d-lg-inline text-uppercase small">
                  {i18n.language}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <button
                    className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
                    onClick={() => switchLang('en')}
                  >
                    🇬🇧 English
                  </button>
                </li>
                <li>
                  <button
                    className={`dropdown-item ${i18n.language === 'be' ? 'active' : ''}`}
                    onClick={() => switchLang('be')}
                  >
                    🇧🇾 Беларуская
                  </button>
                </li>
              </ul>
            </li>

            {user ? (
              <>
                {user.isAdmin && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin">
                      <i className="bi bi-shield-shaded me-1" />
                      <span className="d-none d-lg-inline">{t('admin')}</span>
                    </Link>
                  </li>
                )}

                <li className="nav-item dropdown">
                  <button
                    className="btn btn-link nav-link dropdown-toggle d-flex align-items-center gap-1 px-2"
                    data-bs-toggle="dropdown"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="rounded-circle border"
                        width={28}
                        height={28}
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <i className="bi bi-person-circle fs-5" />
                    )}
                    <span className="d-none d-lg-inline">{user.username}</span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="bi bi-person me-2" />{t('profile')}
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2" />{t('logout')}
                      </button>
                    </li>
                  </ul>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">{t('login')}</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-primary btn-sm" to="/register">
                    {t('register')}
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}