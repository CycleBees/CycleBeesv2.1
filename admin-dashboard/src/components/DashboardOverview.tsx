import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

interface DashboardStats {
  totalUsers: number;
  totalRepairRequests: number;
  totalRentalRequests: number;
  totalRevenue: number;
  activeUsers: number;
  pendingRequests: number;
}

interface RecentActivity {
  id: number;
  type: 'repair' | 'rental' | 'user';
  action: string;
  timestamp: string;
  details: string;
}

const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivities();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/dashboard/overview`, {
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

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/dashboard/recent-activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivities(data.data || []);
      }
    } catch (err) {
      // Don't show error for activities, just use empty array
      setRecentActivities([]);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'repair': return '🔧';
      case 'rental': return '🚲';
      case 'user': return '👤';
      default: return '📝';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) return <div className="loading">Loading dashboard stats...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!stats) return <div className="error">No data available</div>;

  return (
    <div className="dashboard-overview">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <button onClick={() => { fetchDashboardStats(); fetchRecentActivities(); }} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>
      
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

      <div className="dashboard-content">
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          {recentActivities.length > 0 ? (
            <ul className="activity-list">
              {recentActivities.slice(0, 5).map((activity) => (
                <li key={activity.id} className="activity-item">
                  <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                  <div className="activity-content">
                    <div className="activity-text">{activity.details}</div>
                    <div className="activity-time">{formatTime(activity.timestamp)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-activity">
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview; 