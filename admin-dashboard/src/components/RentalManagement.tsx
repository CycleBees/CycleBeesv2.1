import React, { useState, useEffect } from 'react';

interface RentalRequest {
  id: number;
  user_name: string;
  user_phone: string;
  bicycle_name: string;
  duration_type: string;
  duration_count: number;
  total_amount: number;
  status: string;
  created_at: string;
  delivery_address: string;
  delivery_charge: number;
  payment_method: string;
  special_instructions: string;
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
                  
                  <div className="request-details">
                    <p><strong>Customer:</strong> {request.user_name}</p>
                    <p><strong>Phone:</strong> {request.user_phone}</p>
                    <p><strong>Bicycle:</strong> {request.bicycle_name}</p>
                    <p><strong>Duration:</strong> {request.duration_count} {request.duration_type}</p>
                    <p><strong>Total Amount:</strong> ₹{request.total_amount}</p>
                    <p><strong>Payment Method:</strong> {request.payment_method}</p>
                    <p><strong>Delivery Address:</strong> {request.delivery_address}</p>
                    <p><strong>Delivery Charge:</strong> ₹{request.delivery_charge}</p>
                    {request.special_instructions && (
                      <p><strong>Special Instructions:</strong> {request.special_instructions}</p>
                    )}
                    <p><strong>Created:</strong> {new Date(request.created_at).toLocaleString()}</p>
                  </div>

                  <div className="request-actions">
                    {request.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => updateRequestStatus(request.id, 'waiting_payment')}
                          className="action-btn approve"
                        >
                          Approve (Online Payment)
                        </button>
                        <button 
                          onClick={() => updateRequestStatus(request.id, 'arranging_delivery')}
                          className="action-btn approve"
                        >
                          Approve (Cash Payment)
                        </button>
                      </>
                    )}
                    {request.status === 'waiting_payment' && (
                      <button 
                        onClick={() => updateRequestStatus(request.id, 'arranging_delivery')}
                        className="action-btn approve"
                      >
                        Payment Received - Start Delivery
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
    </div>
  );
};

export default RentalManagement; 