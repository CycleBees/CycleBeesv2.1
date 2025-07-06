import React, { useState, useEffect } from 'react';

interface RentalRequest {
  id: number;
  user_name: string;
  user_phone: string;
  bicycle_name: string;
  bicycle_model?: string;
  duration_type: string;
  duration_count: number;
  total_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  delivery_address: string;
  delivery_charge: number;
  payment_method: string;
  special_instructions?: string;
  alternate_number?: string;
  email?: string;
  // Coupon information
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
  coupon_discount_amount?: number;
}

interface Bicycle {
  id: number;
  name: string;
  model: string;
  description: string;
  special_instructions: string;
  daily_rate: number;
  weekly_rate: number;
  delivery_charge: number;
  specifications: string;
  photos: string[];
  is_available: boolean;
}

const RentalManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [bicycles, setBicycles] = useState<Bicycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Bicycle management states
  const [showBicycleForm, setShowBicycleForm] = useState(false);
  const [editingBicycle, setEditingBicycle] = useState<Bicycle | null>(null);
  const [newBicycle, setNewBicycle] = useState({
    name: '',
    model: '',
    description: '',
    special_instructions: '',
    daily_rate: 0,
    weekly_rate: 0,
    delivery_charge: 0,
    specifications: '{}',
    photos: [] as string[]
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Request details modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);

  // Confirmation modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteBicycleModal, setShowDeleteBicycleModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'status' | 'delete' | 'deleteBicycle';
    requestId?: number;
    bicycleId?: number;
    newStatus?: string;
  } | null>(null);

  // Status filter state
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('pending');

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRentalRequests();
    } else if (activeTab === 'inventory') {
      fetchBicycles();
    }
  }, [activeTab]);

  const fetchRentalRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/rental/admin/requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rental requests');
      }

      const data = await response.json();
      setRequests(Array.isArray(data.data?.requests) ? data.data.requests : []);
      setSuccess('Rental requests loaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchBicycles = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/rental/admin/bicycles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bicycles');
      }

      const data = await response.json();
      setBicycles(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: number, status: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/rental/admin/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      setSuccess(`Request status updated to ${status}`);
      fetchRentalRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteRequest = async (requestId: number) => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/rental/admin/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete request');
      }

      setSuccess('Request deleted successfully');
      fetchRentalRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createBicycle = async () => {
    try {
      setUploading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', newBicycle.name);
      formData.append('model', newBicycle.model);
      formData.append('description', newBicycle.description);
      formData.append('specialInstructions', newBicycle.special_instructions);
      formData.append('dailyRate', newBicycle.daily_rate.toString());
      formData.append('weeklyRate', newBicycle.weekly_rate.toString());
      formData.append('deliveryCharge', newBicycle.delivery_charge.toString());
      formData.append('specifications', newBicycle.specifications);
      
      // Add photos
      selectedFiles.forEach((file, index) => {
        formData.append('photos', file);
      });
      
      const response = await fetch('http://localhost:3000/api/rental/admin/bicycles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create bicycle');
      }

      setSuccess('Bicycle created successfully');
      clearForm();
      fetchBicycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  const updateBicycle = async (bicycleId: number) => {
    if (!editingBicycle) return;
    
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/rental/admin/bicycles/${bicycleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingBicycle.name,
          model: editingBicycle.model,
          description: editingBicycle.description,
          specialInstructions: editingBicycle.special_instructions,
          dailyRate: editingBicycle.daily_rate,
          weeklyRate: editingBicycle.weekly_rate,
          deliveryCharge: editingBicycle.delivery_charge,
          specifications: editingBicycle.specifications
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update bicycle');
      }

      setSuccess('Bicycle updated successfully');
      setEditingBicycle(null);
      fetchBicycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteBicycle = async (bicycleId: number) => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/rental/admin/bicycles/${bicycleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete bicycle');
      }

      setSuccess('Bicycle deleted successfully');
      fetchBicycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleStatusChange = (requestId: number, newStatus: string) => {
    setPendingAction({ type: 'status', requestId, newStatus });
    setShowStatusModal(true);
  };

  const handleDeleteRequest = (requestId: number) => {
    setPendingAction({ type: 'delete', requestId });
    setShowDeleteModal(true);
  };

  const handleDeleteBicycle = (bicycleId: number) => {
    setPendingAction({ type: 'deleteBicycle', bicycleId });
    setShowDeleteBicycleModal(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'status' && pendingAction.requestId && pendingAction.newStatus) {
      await updateRequestStatus(pendingAction.requestId, pendingAction.newStatus);
    } else if (pendingAction.type === 'delete' && pendingAction.requestId) {
      await deleteRequest(pendingAction.requestId);
    } else if (pendingAction.type === 'deleteBicycle' && pendingAction.bicycleId) {
      await deleteBicycle(pendingAction.bicycleId);
    }

    setShowStatusModal(false);
    setShowDeleteModal(false);
    setShowDeleteBicycleModal(false);
    setPendingAction(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'waiting_payment': return '#17a2b8';
      case 'arranging_delivery': return '#6f42c1';
      case 'active_rental': return '#28a745';
      case 'completed': return '#6c757d';
      case 'expired': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'waiting_payment': return 'Waiting for Payment';
      case 'arranging_delivery': return 'Arranging Delivery';
      case 'active_rental': return 'Active Rental';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

  const parseSpecifications = (specs: string) => {
    try {
      return JSON.parse(specs);
    } catch {
      return {};
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (selectedFiles.length + files.length > 5) {
      alert('Maximum 5 photos allowed per bicycle');
      return;
    }
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      alert('Only JPEG, PNG, and GIF images are allowed');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      alert('Each image must be less than 5MB');
      return;
    }
    
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const clearForm = () => {
    setNewBicycle({
      name: '',
      model: '',
      description: '',
      special_instructions: '',
      daily_rate: 0,
      weekly_rate: 0,
      delivery_charge: 0,
      specifications: '{}',
      photos: []
    });
    setSelectedFiles([]);
    setShowBicycleForm(false);
  };

  const getPendingRequests = () => requests.filter(r => r.status.toLowerCase() === 'pending').length;
  const getActiveRentals = () => requests.filter(r => r.status.toLowerCase() === 'active_rental').length;
  const getCompletedRequests = () => requests.filter(r => r.status.toLowerCase() === 'completed').length;
  const getTotalRequests = () => requests.length;

  // Filter functions
  const getFilteredRequests = () => {
    if (activeStatusFilter === 'all') {
      return requests;
    }
    return requests.filter(r => r.status.toLowerCase() === activeStatusFilter);
  };

  const getStatusCount = (status: string) => {
    return requests.filter(r => r.status.toLowerCase() === status).length;
  };

  if (loading && requests.length === 0 && bicycles.length === 0) return <div className="loading">Loading...</div>;
  if (error && requests.length === 0 && bicycles.length === 0) return <div className="error">Error: {error}</div>;

  return (
    <div className="rental-management">
      <div className="page-header">
      <h2>Rental Management</h2>
        <div className="header-actions">
          <button onClick={activeTab === 'requests' ? fetchRentalRequests : fetchBicycles} className="refresh-btn">
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {success && (
        <div className="success-message">
          <span>✅</span> {success}
        </div>
      )}
      
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Rental Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Bicycle Inventory
        </button>
      </div>

      {activeTab === 'requests' && (
        <>
          <div className="requests-overview">
            <div className="overview-stats">
              <div className="stat-card">
                <div className="stat-number">{getTotalRequests()}</div>
                <div className="stat-label">Total Requests</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{getPendingRequests()}</div>
                <div className="stat-label">Pending Requests</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{getActiveRentals()}</div>
                <div className="stat-label">Active Rentals</div>
              </div>
            </div>
          </div>

        <div className="requests-section">
            <div className="status-filter-tabs">
              <button 
                className={`status-tab ${activeStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('all')}
              >
                All Requests ({getTotalRequests()})
          </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('pending')}
              >
                Pending ({getStatusCount('pending')})
              </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'approved' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('approved')}
              >
                Approved ({getStatusCount('approved')})
              </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'waiting_payment' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('waiting_payment')}
              >
                Waiting Payment ({getStatusCount('waiting_payment')})
              </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'arranging_delivery' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('arranging_delivery')}
              >
                Arranging Delivery ({getStatusCount('arranging_delivery')})
              </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'active_rental' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('active_rental')}
              >
                Active Rental ({getStatusCount('active_rental')})
              </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('completed')}
              >
                Completed ({getStatusCount('completed')})
              </button>
              <button 
                className={`status-tab ${activeStatusFilter === 'expired' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('expired')}
              >
                Expired ({getStatusCount('expired')})
              </button>
            </div>
            
            {getFilteredRequests().length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🚲</div>
                <h3>No {activeStatusFilter === 'all' ? '' : activeStatusFilter} Requests</h3>
                <p>
                  {activeStatusFilter === 'all' 
                    ? 'No rental requests have been made yet.' 
                    : `No ${activeStatusFilter} rental requests found.`
                  }
                </p>
              </div>
            ) : (
              <div className="requests-grid">
                {getFilteredRequests().map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <h4>Request #{request.id}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(request.status) }}
                    >
                        {getStatusText(request.status)}
                    </span>
                  </div>
                    
                    <div className="quick-info">
                      <div className="quick-info-item">
                        <span className="quick-info-label">Customer</span>
                        <span className="quick-info-value">{request.user_name}</span>
                      </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Amount</span>
                        <span className="quick-info-value">₹{request.net_amount || request.total_amount}</span>
                      </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Bicycle</span>
                        <span className="quick-info-value">{request.bicycle_name}</span>
                      </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Duration</span>
                        <span className="quick-info-value">{request.duration_count} {request.duration_type}</span>
                      </div>
                    </div>
                  
                  <div className="request-summary">
                    <div className="summary-row">
                      <span className="summary-label">Phone:</span>
                      <span className="summary-value">{request.user_phone}</span>
                    </div>
                    <div className="summary-row">
                        <span className="summary-label">Payment:</span>
                        <span className="summary-value">{request.payment_method}</span>
                    </div>
                    <div className="summary-row">
                        <span className="summary-label">Date:</span>
                        <span className="summary-value">
                          {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="request-actions">
                    <button 
                        onClick={() => setSelectedRequest(request)}
                      className="action-btn view"
                    >
                      View Details
                    </button>
                    
                      {request.status.toLowerCase() === 'pending' && (
                        <button 
                          onClick={() => handleStatusChange(request.id, 'approved')}
                          className="action-btn approve"
                        >
                          Approve
                        </button>
                      )}
                      
                      {request.status.toLowerCase() === 'approved' && (
                        <button 
                          onClick={() => handleStatusChange(request.id, 'arranging_delivery')}
                          className="action-btn progress"
                        >
                          Arrange Delivery
                        </button>
                      )}
                      
                      {request.status.toLowerCase() === 'waiting_payment' && (
                        <button 
                          onClick={() => handleStatusChange(request.id, 'arranging_delivery')}
                          className="action-btn progress"
                        >
                          Payment Received
                        </button>
                    )}
                      
                      {request.status.toLowerCase() === 'arranging_delivery' && (
                      <button 
                          onClick={() => handleStatusChange(request.id, 'active_rental')}
                          className="action-btn progress"
                      >
                          Delivered
                      </button>
                    )}
                      
                      {request.status.toLowerCase() === 'active_rental' && (
                      <button 
                          onClick={() => handleStatusChange(request.id, 'completed')}
                        className="action-btn complete"
                      >
                          Complete
                      </button>
                    )}
                      
                      <button 
                        onClick={() => handleDeleteRequest(request.id)}
                        className="action-btn delete"
                      >
                        Delete
                      </button>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'inventory' && (
        <div className="inventory-section">
          <div className="section-header">
          <h3>Manage Bicycle Inventory</h3>
          <button 
            onClick={() => setShowBicycleForm(!showBicycleForm)} 
            className="add-btn"
          >
            {showBicycleForm ? 'Cancel' : 'Add New Bicycle'}
          </button>
          </div>

          {showBicycleForm && (
            <div className="bicycle-form">
              <h4>Add New Bicycle</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Bicycle Name:</label>
                  <input
                    type="text"
                    value={newBicycle.name}
                    onChange={(e) => setNewBicycle({...newBicycle, name: e.target.value})}
                    placeholder="e.g., Mountain Bike Pro"
                  />
                </div>
                <div className="form-group">
                  <label>Model:</label>
                  <input
                    type="text"
                    value={newBicycle.model}
                    onChange={(e) => setNewBicycle({...newBicycle, model: e.target.value})}
                    placeholder="e.g., MTB-2024"
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={newBicycle.description}
                    onChange={(e) => setNewBicycle({...newBicycle, description: e.target.value})}
                    placeholder="Bicycle description"
                  />
                </div>
                <div className="form-group">
                  <label>Special Instructions:</label>
                  <textarea
                    value={newBicycle.special_instructions}
                    onChange={(e) => setNewBicycle({...newBicycle, special_instructions: e.target.value})}
                    placeholder="Special instructions for users"
                  />
                </div>
                <div className="form-group">
                  <label>Daily Rate (₹):</label>
                  <input
                    type="number"
                    value={newBicycle.daily_rate}
                    onChange={(e) => setNewBicycle({...newBicycle, daily_rate: Number(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
                <div className="form-group">
                  <label>Weekly Rate (₹):</label>
                  <input
                    type="number"
                    value={newBicycle.weekly_rate}
                    onChange={(e) => setNewBicycle({...newBicycle, weekly_rate: Number(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Charge (₹):</label>
                  <input
                    type="number"
                    value={newBicycle.delivery_charge}
                    onChange={(e) => setNewBicycle({...newBicycle, delivery_charge: Number(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
                <div className="form-group">
                  <label>Specifications (JSON):</label>
                  <textarea
                    value={newBicycle.specifications}
                    onChange={(e) => setNewBicycle({...newBicycle, specifications: e.target.value})}
                    placeholder='{"frame": "Aluminum", "wheels": "26 inch", "gears": "21-speed"}'
                  />
                </div>
                <div className="form-group">
                  <label>Bicycle Photos (Max 5):</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="file-input"
                  />
                  <small>Select up to 5 images (JPEG, PNG, GIF, max 5MB each)</small>
                  
                  {selectedFiles.length > 0 && (
                    <div className="photo-preview">
                      <h5>Selected Photos ({selectedFiles.length}/5):</h5>
                      <div className="preview-grid">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="preview-item">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Preview ${index + 1}`}
                              className="preview-image"
                            />
                            <button 
                              type="button"
                              onClick={() => removeFile(index)}
                              className="remove-photo"
                            >
                              ×
                            </button>
                            <span className="file-name">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={createBicycle} 
                className="submit-btn"
                disabled={uploading}
              >
                {uploading ? 'Creating...' : 'Create Bicycle'}
              </button>
            </div>
          )}

          <div className="bicycles-grid">
            {bicycles.map((bicycle) => (
              <div key={bicycle.id} className="bicycle-card">
                {editingBicycle?.id === bicycle.id ? (
                  <div className="bicycle-edit-form">
                    <input
                      type="text"
                      value={editingBicycle.name}
                      onChange={(e) => setEditingBicycle({...editingBicycle, name: e.target.value})}
                    />
                    <input
                      type="text"
                      value={editingBicycle.model}
                      onChange={(e) => setEditingBicycle({...editingBicycle, model: e.target.value})}
                    />
                    <textarea
                      value={editingBicycle.description}
                      onChange={(e) => setEditingBicycle({...editingBicycle, description: e.target.value})}
                    />
                    <textarea
                      value={editingBicycle.special_instructions}
                      onChange={(e) => setEditingBicycle({...editingBicycle, special_instructions: e.target.value})}
                    />
                    <input
                      type="number"
                      value={editingBicycle.daily_rate}
                      onChange={(e) => setEditingBicycle({...editingBicycle, daily_rate: Number(e.target.value)})}
                    />
                    <input
                      type="number"
                      value={editingBicycle.weekly_rate}
                      onChange={(e) => setEditingBicycle({...editingBicycle, weekly_rate: Number(e.target.value)})}
                    />
                    <input
                      type="number"
                      value={editingBicycle.delivery_charge}
                      onChange={(e) => setEditingBicycle({...editingBicycle, delivery_charge: Number(e.target.value)})}
                    />
                    <textarea
                      value={editingBicycle.specifications}
                      onChange={(e) => setEditingBicycle({...editingBicycle, specifications: e.target.value})}
                    />
                    <div className="edit-actions">
                      <button onClick={() => updateBicycle(bicycle.id)} className="save-btn">
                        Save
                      </button>
                      <button onClick={() => setEditingBicycle(null)} className="cancel-btn">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bicycle-header">
                      <h4>{bicycle.name}</h4>
                      <span className="model">{bicycle.model}</span>
                    </div>
                    
                    <div className="bicycle-details">
                      <p><strong>Description:</strong> {bicycle.description}</p>
                      {bicycle.special_instructions && (
                        <p><strong>Special Instructions:</strong> {bicycle.special_instructions}</p>
                      )}
                      
                      <div className="rates">
                        <p><strong>Daily Rate:</strong> ₹{bicycle.daily_rate}</p>
                        <p><strong>Weekly Rate:</strong> ₹{bicycle.weekly_rate}</p>
                        <p><strong>Delivery Charge:</strong> ₹{bicycle.delivery_charge}</p>
                      </div>
                      
                      {bicycle.specifications && (
                        <div className="specifications">
                          <strong>Specifications:</strong>
                          <pre>{JSON.stringify(parseSpecifications(bicycle.specifications), null, 2)}</pre>
                        </div>
                      )}
                      
                      {bicycle.photos && bicycle.photos.length > 0 && (
                        <div className="photos">
                          <strong>Photos:</strong>
                          <div className="photo-grid">
                            {bicycle.photos.map((photo, index) => (
                              <img 
                                key={index} 
                                src={`http://localhost:3000/${photo}`} 
                                alt={`Bicycle ${index + 1}`}
                                className="bicycle-photo"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bicycle-actions">
                      <button 
                        onClick={() => setEditingBicycle(bicycle)}
                        className="edit-btn"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteBicycle(bicycle.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Status Change</h3>
              <button className="close-btn" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to change the status to <strong>{pendingAction?.newStatus}</strong>?</p>
              <p>This action cannot be undone.</p>
                </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmAction}>
                Confirm
              </button>
              </div>
                  </div>
                    </div>
                  )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
                    </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete this rental request?</p>
              <p><strong>This action cannot be undone.</strong></p>
                </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={confirmAction}>
                Delete
              </button>
              </div>
                  </div>
                    </div>
                  )}

      {showDeleteBicycleModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteBicycleModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={() => setShowDeleteBicycleModal(false)}>×</button>
                  </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete this bicycle?</p>
              <p><strong>This action cannot be undone.</strong></p>
                  </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteBicycleModal(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={confirmAction}>
                Delete
              </button>
                </div>
              </div>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rental Request Details</h3>
              <button className="close-btn" onClick={() => setSelectedRequest(null)}>×</button>
                  </div>
            <div className="modal-body">
              <div className="request-details-grid">
                <div className="detail-group">
                  <label>Customer Name:</label>
                  <p>{selectedRequest.user_name}</p>
                  </div>
                <div className="detail-group">
                  <label>Phone:</label>
                  <p>{selectedRequest.user_phone}</p>
                </div>
                <div className="detail-group">
                  <label>Email:</label>
                  <p>{selectedRequest.email || 'Not provided'}</p>
              </div>
                <div className="detail-group">
                  <label>Bicycle:</label>
                  <p>{selectedRequest.bicycle_name} {selectedRequest.bicycle_model && `(${selectedRequest.bicycle_model})`}</p>
                  </div>
                <div className="detail-group">
                  <label>Duration:</label>
                  <p>{selectedRequest.duration_count} {selectedRequest.duration_type}{selectedRequest.duration_count > 1 ? 's' : ''}</p>
                      </div>
                <div className="detail-group">
                  <label>Total Amount:</label>
                  <p>₹{selectedRequest.total_amount}</p>
                      </div>
                <div className="detail-group">
                  <label>Net Amount:</label>
                  <p>₹{selectedRequest.net_amount}</p>
                      </div>
                <div className="detail-group">
                  <label>Payment Method:</label>
                  <p>{selectedRequest.payment_method}</p>
                  </div>
                <div className="detail-group full-width">
                  <label>Delivery Address:</label>
                  <p>{selectedRequest.delivery_address}</p>
                </div>
              {selectedRequest.special_instructions && (
                  <div className="detail-group full-width">
                    <label>Special Instructions:</label>
                    <p>{selectedRequest.special_instructions}</p>
                </div>
              )}
                {selectedRequest.coupon_code && (
                  <div className="detail-group">
                    <label>Coupon Used:</label>
                    <p>{selectedRequest.coupon_code} (₹{selectedRequest.coupon_discount_amount} off)</p>
            </div>
                )}
                <div className="detail-group">
                  <label>Status:</label>
                  <p>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
                    >
                      {getStatusText(selectedRequest.status)}
                    </span>
                  </p>
                </div>
                <div className="detail-group">
                  <label>Created:</label>
                  <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalManagement; 