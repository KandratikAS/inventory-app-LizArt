import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.user, data.token, data.refreshToken);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-secondary px-3">
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-4">
          <h4 className="card-title text-center mb-4 fw-bold">
            <i className="bi bi-boxes text-primary me-2" />
            {t('register')}
          </h4>

          {error && (
            <div className="alert alert-danger py-2 small">
              <i className="bi bi-exclamation-triangle me-1" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">{t('username')}</label>
              <input
                className="form-control"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                minLength={3}
                maxLength={30}
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="form-label">{t('email')}</label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">{t('password')}</label>
              <input
                className="form-control"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <button className="btn btn-primary w-100 mb-3" type="submit" disabled={loading}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-1" />{t('loading')}</>
                : t('register')}
            </button>
          </form>

          <div className="text-center my-2 text-muted small">{t('orSignIn')}</div>
          <a href={`${apiBase}/api/auth/google`} className="btn btn-outline-danger w-100 mb-2">
            <i className="bi bi-google me-2" />{t('loginWithGoogle')}
          </a>
          <a href={`${apiBase}/api/auth/github`} className="btn btn-outline-dark w-100 mb-3">
            <i className="bi bi-github me-2" />{t('loginWithGitHub')}
          </a>

          <div className="text-center small">
            {t('haveAccount')} <Link to="/login">{t('login')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}