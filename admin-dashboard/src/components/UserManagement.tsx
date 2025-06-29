import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  pincode: string;
  address: string;
  profile_photo: string;
  created_at: string;
  last_login: string;
  total_repair_requests: number;
  total_rental_requests: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/dashboard/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success && data.data && Array.isArray(data.data.users)) {
        setUsers(data.data.users);
      } else {
        setUsers([]);
        setError('Invalid data format received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/dashboard/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const data = await response.json();
      if (data.success && data.data && data.data.user) {
        setSelectedUser(data.data.user);
      } else {
        setError('Invalid user data format received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  ) : [];

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="user-management">
      <h2>User Management</h2>
      
      <div className="user-actions">
        <button onClick={fetchUsers} className="refresh-btn">
          🔄 Refresh
        </button>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search users by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="users-overview">
        <h3>Users Overview ({filteredUsers.length} users)</h3>
        
        <div className="users-list">
          {filteredUsers.length === 0 ? (
            <p>No users found.</p>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-header">
                  <div className="user-avatar">
                    {user.profile_photo ? (
                      <img 
                        src={`http://localhost:3000/${user.profile_photo}`} 
                        alt={user.full_name}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <h4>{user.full_name}</h4>
                    <p>{user.email}</p>
                    <p>{user.phone}</p>
                  </div>
                  <button 
                    onClick={() => fetchUserDetails(user.id)}
                    className="view-details-btn"
                  >
                    View Details
                  </button>
                </div>
                
                <div className="user-stats">
                  <div className="stat">
                    <span className="stat-label">Repair Requests:</span>
                    <span className="stat-value">{user.total_repair_requests}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Rental Requests:</span>
                    <span className="stat-value">{user.total_rental_requests}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Member Since:</span>
                    <span className="stat-value">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedUser && (
        <div className="user-details-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>User Details - {selectedUser.full_name}</h3>
              <button 
                onClick={() => setSelectedUser(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="user-details-grid">
                <div className="detail-group">
                  <label>Full Name:</label>
                  <p>{selectedUser.full_name}</p>
                </div>
                
                <div className="detail-group">
                  <label>Email:</label>
                  <p>{selectedUser.email}</p>
                </div>
                
                <div className="detail-group">
                  <label>Phone:</label>
                  <p>{selectedUser.phone}</p>
                </div>
                
                <div className="detail-group">
                  <label>Age:</label>
                  <p>{selectedUser.age} years</p>
                </div>
                
                <div className="detail-group">
                  <label>Pincode:</label>
                  <p>{selectedUser.pincode}</p>
                </div>
                
                <div className="detail-group">
                  <label>Address:</label>
                  <p>{selectedUser.address}</p>
                </div>
                
                <div className="detail-group">
                  <label>Member Since:</label>
                  <p>{new Date(selectedUser.created_at).toLocaleString()}</p>
                </div>
                
                <div className="detail-group">
                  <label>Last Login:</label>
                  <p>{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}</p>
                </div>
                
                <div className="detail-group">
                  <label>Total Repair Requests:</label>
                  <p>{selectedUser.total_repair_requests}</p>
                </div>
                
                <div className="detail-group">
                  <label>Total Rental Requests:</label>
                  <p>{selectedUser.total_rental_requests}</p>
                </div>
              </div>
              
              {selectedUser.profile_photo && (
                <div className="profile-photo">
                  <label>Profile Photo:</label>
                  <img 
                    src={`http://localhost:3000/${selectedUser.profile_photo}`} 
                    alt={selectedUser.full_name}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 