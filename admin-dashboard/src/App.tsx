import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './config/api';
import './App.css';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import RepairManagement from './components/RepairManagement';
import RentalManagement from './components/RentalManagement';
import CouponManagement from './components/CouponManagement';
import PromotionalCards from './components/PromotionalCards';
import ContactSettings from './components/ContactSettings';
import UserManagement from './components/UserManagement';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('${API_BASE_URL}/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('adminToken', data.data.token);
      setIsLoggedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Logout is now handled in the Sidebar component

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'repair':
        return <RepairManagement />;
      case 'rental':
        return <RentalManagement />;
      case 'coupons':
        return <CouponManagement />;
      case 'promotional':
        return <PromotionalCards />;
      case 'contact':
        return <ContactSettings />;
      case 'users':
        return <UserManagement />;
      default:
        return <DashboardOverview />;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="login-card">
          <div className="login-header">
            <h1>
              <span style={{ fontSize: '3rem', display: 'inline-block', marginRight: '0.5rem' }}>🚲</span>
              Cycle-Bees
            </h1>
            <h2>Admin Dashboard</h2>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="admin"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="admin123"
                required
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" disabled={loading} className="login-btn">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="login-info">
            <p><strong>Default Credentials:</strong></p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-body">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App; 