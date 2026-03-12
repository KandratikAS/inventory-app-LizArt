import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');

    if (!token) {
      navigate('/login?error=oauth');
      return;
    }

    sessionStorage.setItem('token', token);
    if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);

    api.get('/auth/me')
      .then(({ data }) => {
        login(data.user, token, refreshToken);
        navigate('/');
      })
      .catch(() => navigate('/login?error=oauth'));
  }, []);

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" />
    </div>
  );
}