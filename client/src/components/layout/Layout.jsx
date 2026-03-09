import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1 container-fluid py-4 px-3 px-md-4">
        <Outlet />
      </main>
      <footer className="border-top py-3 text-center text-muted small">
        © {new Date().getFullYear()} LizArt Company
      </footer>
    </div>
  );
}