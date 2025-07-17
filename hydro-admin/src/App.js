import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './index.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="spinner w-8 h-8 text-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

// Public Route component (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="spinner w-8 h-8 text-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated() ? <Navigate to="/" replace /> : children;
};

// Placeholder components for other pages
const Customers = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Customers</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Customer management coming soon...</p>
    </div>
  </div>
);

const Orders = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Orders</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Order management coming soon...</p>
    </div>
  </div>
);

const Subscriptions = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Subscriptions</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Subscription management coming soon...</p>
    </div>
  </div>
);

const Drivers = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Drivers</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Driver management coming soon...</p>
    </div>
  </div>
);

const RoutesPage = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Routes</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Route management coming soon...</p>
    </div>
  </div>
);

const Inventory = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Inventory</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Inventory management coming soon...</p>
    </div>
  </div>
);

const Analytics = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Analytics</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Analytics dashboard coming soon...</p>
    </div>
  </div>
);

const Profile = () => (
  <div className="card">
    <div className="card-header">
      <h2 className="text-xl font-semibold text-secondary-900">Profile Settings</h2>
    </div>
    <div className="card-body">
      <p className="text-secondary-600">Profile settings coming soon...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="orders" element={<Orders />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#374151',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;