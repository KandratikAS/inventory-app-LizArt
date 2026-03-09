import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import InventoryListPage from './pages/InventoryListPage';
import InventoryPage from './pages/InventoryPage';
import ItemPage from './pages/ItemPage';
import SearchPage from './pages/SearchPage';
import AdminPage from './pages/AdminPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { loading } = useAuth();
  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border" />
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/inventories" element={<InventoryListPage />} />
          <Route path="/inventories/:id" element={<InventoryPage />} />
          <Route path="/inventories/:inventoryId/items/:id" element={<ItemPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile/:id?" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
      </Routes>
    </BrowserRouter>
  );
}