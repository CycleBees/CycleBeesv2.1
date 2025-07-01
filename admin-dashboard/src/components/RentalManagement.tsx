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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchBicycles = async () => {
    try {
      setLoading(true);
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

      fetchRentalRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createBicycle = async () => {
    try {
      setUploading(true);
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
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create bicycle');
      }

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

      setEditingBicycle(null);
      fetchBicycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteBicycle = async (bicycleId: number) => {
    if (!window.confirm('Are you sure you want to delete this bicycle?')) return;

    try {
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

      fetchBicycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'waiting_payment': return 'blue';
      case 'arranging_delivery': return 'purple';
      case 'active_rental': return 'green';
      case 'completed': return 'gray';
      case 'expired': return 'red';
      default: return 'black';
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
    
    // Validate file count (max 5 photos)
    if (selectedFiles.length + files.length > 5) {
      alert('Maximum 5 photos allowed per bicycle');
      return;
    }
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      alert('Only JPEG, PNG, and GIF images are allowed');
      return;
    }
    
    // Validate file size (max 5MB each)
    const maxSize = 5 * 1024 * 1024; // 5MB
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

  const openRequestModal = (request: RentalRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setSelectedRequest(null);
    setShowRequestModal(false);
  };

  const deleteRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this rental request?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/rental/admin/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rental request');
      }

      fetchRentalRequests();
      closeRequestModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="rental-management">
      <h2>Rental Management</h2>
      
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Rental Request Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Manage Bicycle Inventory
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="requests-section">
          <h3>Rental Request Management</h3>
          <button onClick={fetchRentalRequests} className="refresh-btn">
            🔄 Refresh
          </button>
          
          <div className="requests-list">
            {requests.length === 0 ? (
              <p>No rental requests found.</p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <h4>Request #{request.id}</h4>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(request.status) }}
                    >
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="request-summary">
                    <div className="summary-row">
                      <span className="summary-label">Customer:</span>
                      <span className="summary-value">{request.user_name}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Phone:</span>
                      <span className="summary-value">{request.user_phone}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Bicycle:</span>
                      <span className="summary-value">{request.bicycle_name}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Duration:</span>
                      <span className="summary-value">{request.duration_count} {request.duration_type}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Address:</span>
                      <span className="summary-value" title={request.delivery_address}>
                        {request.delivery_address.length > 25 ? request.delivery_address.substring(0, 25) + '...' : request.delivery_address}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Amount:</span>
                      <span className="summary-value amount">₹{request.net_amount || request.total_amount}</span>
                    </div>
                  </div>

                  <div className="request-actions">
                    <button 
                      onClick={() => openRequestModal(request)}
                      className="action-btn view"
                    >
                      View Details
                    </button>
                    
                    {request.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => updateRequestStatus(request.id, 'waiting_payment')}
                          className="action-btn approve"
                        >
                          Approve (Online)
                        </button>
                        <button 
                          onClick={() => updateRequestStatus(request.id, 'arranging_delivery')}
                          className="action-btn approve"
                        >
                          Approve (Cash)
                        </button>
                        <button 
                          onClick={() => deleteRequest(request.id)}
                          className="action-btn delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {request.status === 'waiting_payment' && (
                      <button 
                        onClick={() => updateRequestStatus(request.id, 'arranging_delivery')}
                        className="action-btn approve"
                      >
                        Payment Received
                      </button>
                    )}
                    {request.status === 'arranging_delivery' && (
                      <button 
                        onClick={() => updateRequestStatus(request.id, 'active_rental')}
                        className="action-btn complete"
                      >
                        Mark Delivered
                      </button>
                    )}
                    {request.status === 'active_rental' && (
                      <button 
                        onClick={() => updateRequestStatus(request.id, 'completed')}
                        className="action-btn complete"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="inventory-section">
          <h3>Manage Bicycle Inventory</h3>
          <button 
            onClick={() => setShowBicycleForm(!showBicycleForm)} 
            className="add-btn"
          >
            {showBicycleForm ? 'Cancel' : 'Add New Bicycle'}
          </button>

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

          <div className="bicycles-list">
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
                        onClick={() => deleteBicycle(bicycle.id)}
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

      {/* Rental Request Details Modal */}
      {showRequestModal && selectedRequest && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rental Request #{selectedRequest.id}</h3>
              <button className="close-btn" onClick={closeRequestModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Request Status & Timeline */}
              <div className="detail-section">
                <h4>Request Status & Timeline</h4>
                <div className="status-row">
                  <span className="status-label">Status:</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
                  >
                    {selectedRequest.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p><strong>Created:</strong> {new Date(selectedRequest.created_at).toLocaleString()}</p>
                {selectedRequest.updated_at && (
                  <p><strong>Last Updated:</strong> {new Date(selectedRequest.updated_at).toLocaleString()}</p>
                )}
                {selectedRequest.status === 'pending' && selectedRequest.expires_at && (
                  <p><strong>Expires:</strong> {new Date(selectedRequest.expires_at).toLocaleString()}</p>
                )}
              </div>

              {/* Customer Information */}
              <div className="detail-section">
                <h4>Customer Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedRequest.user_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{selectedRequest.user_phone}</span>
                  </div>
                  {selectedRequest.alternate_number && (
                    <div className="info-item">
                      <span className="info-label">Alternate:</span>
                      <span className="info-value">{selectedRequest.alternate_number}</span>
                    </div>
                  )}
                  {selectedRequest.email && (
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{selectedRequest.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rental Details */}
              <div className="detail-section">
                <h4>Rental Details</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Bicycle:</span>
                    <span className="info-value">{selectedRequest.bicycle_name}</span>
                  </div>
                  {selectedRequest.bicycle_model && (
                    <div className="info-item">
                      <span className="info-label">Model:</span>
                      <span className="info-value">{selectedRequest.bicycle_model}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Duration:</span>
                    <span className="info-value">{selectedRequest.duration_count} {selectedRequest.duration_type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Payment Method:</span>
                    <span className="info-value">{selectedRequest.payment_method}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div className="detail-section">
                <h4>Delivery Information</h4>
                <div className="info-grid">
                  <div className="info-item full-width">
                    <span className="info-label">Delivery Address:</span>
                    <span className="info-value address-text">{selectedRequest.delivery_address}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Delivery Charge:</span>
                    <span className="info-value">₹{selectedRequest.delivery_charge}</span>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="detail-section">
                <h4>Financial Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Total Amount:</span>
                    <span className="info-value amount">₹{selectedRequest.total_amount}</span>
                  </div>
                  {selectedRequest.coupon_code && (
                    <>
                      <div className="info-item">
                        <span className="info-label">Coupon Applied:</span>
                        <span className="info-value coupon-code">{selectedRequest.coupon_code}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Discount:</span>
                        <span className="info-value discount">
                          {selectedRequest.coupon_discount_type === 'percentage' 
                            ? `${selectedRequest.coupon_discount_value}%`
                            : `₹${selectedRequest.coupon_discount_value}`
                          }
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Discount Amount:</span>
                        <span className="info-value discount-amount">-₹{selectedRequest.coupon_discount_amount || 0}</span>
                      </div>
                    </>
                  )}
                  <div className="info-item">
                    <span className="info-label">Net Amount:</span>
                    <span className="info-value net-amount">₹{selectedRequest.net_amount || selectedRequest.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {selectedRequest.special_instructions && (
                <div className="detail-section">
                  <h4>Special Instructions</h4>
                  <div className="notes-container">
                    <p className="notes-text">{selectedRequest.special_instructions}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              {selectedRequest.status === 'pending' && (
                <div className="approval-actions">
                  {selectedRequest.payment_method === 'online' ? (
                    <button 
                      onClick={() => updateRequestStatus(selectedRequest.id, 'waiting_payment')}
                      className="action-btn approve"
                    >
                      Approve (Online Payment)
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateRequestStatus(selectedRequest.id, 'arranging_delivery')}
                      className="action-btn approve"
                    >
                      Approve (Cash Payment)
                    </button>
                  )}
                </div>
              )}
              
              {selectedRequest.status === 'waiting_payment' && (
                <button 
                  onClick={() => updateRequestStatus(selectedRequest.id, 'arranging_delivery')}
                  className="action-btn approve"
                >
                  Payment Received - Start Delivery
                </button>
              )}
              
              {selectedRequest.status === 'arranging_delivery' && (
                <button 
                  onClick={() => updateRequestStatus(selectedRequest.id, 'active_rental')}
                  className="action-btn complete"
                >
                  Mark Delivered
                </button>
              )}
              
              {selectedRequest.status === 'active_rental' && (
                <button 
                  onClick={() => updateRequestStatus(selectedRequest.id, 'completed')}
                  className="action-btn complete"
                >
                  Mark Completed
                </button>
              )}
              
              <button 
                onClick={() => deleteRequest(selectedRequest.id)}
                className="action-btn delete"
              >
                Delete Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalManagement; 