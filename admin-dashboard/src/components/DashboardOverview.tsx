import React, { useState, useEffect } from 'react';

interface DashboardStats {
  totalUsers: number;
  totalRepairRequests: number;
  totalRentalRequests: number;
  totalRevenue: number;
  activeUsers: number;
  pendingRequests: number;
}

const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard stats...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!stats) return <div className="error">No data available</div>;

  return (
    <div className="dashboard-overview">
      <h2>Dashboard Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <h3>Repair Requests</h3>
            <p className="stat-number">{stats.totalRepairRequests}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚲</div>
          <div className="stat-content">
            <h3>Rental Requests</h3>
            <p className="stat-number">{stats.totalRentalRequests}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p className="stat-number">₹{stats.totalRevenue}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Active Users</h3>
            <p className="stat-number">{stats.activeUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending Requests</h3>
            <p className="stat-number">{stats.pendingRequests}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={fetchDashboardStats} className="refresh-btn">
          🔄 Refresh Stats
        </button>
      </div>
    </div>
  );
};

export default DashboardOverview; 