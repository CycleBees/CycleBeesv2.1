import React, { useState, useEffect } from 'react';

interface RepairRequest {
  id: number;
  user_name: string;
  user_phone: string;
  services: Array<{
    id: number;
    name: string;
    description: string;
    special_instructions: string;
    price: number;
    discount_amount: number;
  }>;
  files: Array<{
    id: number;
    file_url: string;
    file_type: string;
    display_order: number;
  }>;
  total_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  preferred_date: string;
  preferred_time_slot: string;
  notes: string;
  payment_method: string;
  alternate_number?: string;
  email?: string;
  address?: string;
  // Additional fields for better admin view
  contact_number?: string;
  start_time?: string;
  end_time?: string;
  expires_at?: string;
  updated_at?: string;
  // Coupon information
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
  coupon_discount_amount?: number;
}

interface RepairService {
  id: number;
  name: string;
  description: string;
  special_instructions: string;
  price: number;
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
}

const RepairManagement: React.FC = () => {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [mechanicCharge, setMechanicCharge] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Request details modal
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{files: any[], currentIndex: number} | null>(null);
  
  // Service management states
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<RepairService | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    special_instructions: '',
    price: 0
  });

  // Time slot management states
  const [showTimeSlotForm, setShowTimeSlotForm] = useState(false);
  const [newTimeSlot, setNewTimeSlot] = useState({
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRepairRequests();
    } else if (activeTab === 'catalog') {
      fetchRepairServices();
      fetchTimeSlots();
      fetchMechanicCharge();
    }
  }, [activeTab]);

  const fetchRepairRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/repair/admin/requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repair requests');
      }

      const data = await response.json();
      setRequests(Array.isArray(data.data?.requests) ? data.data.requests : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepairServices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/repair/admin/services', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repair services');
      }

      const data = await response.json();
      setServices(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/repair/admin/time-slots', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTimeSlots(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch time slots:', err);
    }
  };

  const fetchMechanicCharge = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/repair/admin/mechanic-charge', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Mechanic charge response:', data);
        setMechanicCharge(data.data?.charge || 0);
      } else {
        console.error('Failed to fetch mechanic charge:', response.status);
      }
    } catch (err) {
      console.error('Failed to fetch mechanic charge:', err);
    }
  };

  const updateRequestStatus = async (requestId: number, status: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/repair/admin/requests/${requestId}/status`, {
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

      fetchRepairRequests();
      setShowRequestModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/repair/admin/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete request');
      }

      fetchRepairRequests();
      setShowRequestModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createService = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/repair/admin/services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newService)
      });

      if (!response.ok) {
        throw new Error('Failed to create service');
      }

      setNewService({ name: '', description: '', special_instructions: '', price: 0 });
      setShowServiceForm(false);
      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateService = async (serviceId: number) => {
    if (!editingService) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/repair/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingService)
      });

      if (!response.ok) {
        throw new Error('Failed to update service');
      }

      setEditingService(null);
      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/repair/admin/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete service');
      }

      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateMechanicCharge = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/repair/admin/mechanic-charge', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ charge: mechanicCharge })
      });

      if (!response.ok) {
        throw new Error('Failed to update mechanic charge');
      }

      alert('Mechanic charge updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createTimeSlot = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/repair/admin/time-slots', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTimeSlot)
      });

      if (!response.ok) {
        throw new Error('Failed to create time slot');
      }

      setNewTimeSlot({ start_time: '', end_time: '' });
      setShowTimeSlotForm(false);
      fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteTimeSlot = async (timeSlotId: number) => {
    if (!confirm('Are you sure you want to delete this time slot?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/repair/admin/time-slots/${timeSlotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete time slot');
      }

      fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'waiting_payment': return '#17a2b8';
      case 'active': return '#28a745';
      case 'completed': return '#6c757d';
      case 'expired': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'waiting_payment': return 'Waiting Payment';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  const openRequestModal = (request: RepairRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
  };

  const openMediaModal = (files: any[], currentIndex: number) => {
    setSelectedMedia({ files, currentIndex });
    setShowMediaModal(true);
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedMedia(null);
  };

  const getFilteredRequests = () => {
    return requests.filter(request => {
      if (activeTab === 'requests') return true;
      return request.status === activeTab;
    });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="repair-management">
      <h2>Repair Management</h2>
      
      <div className="tab-buttons">
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          All Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending
        </button>
        <button 
          className={`tab-btn ${activeTab === 'waiting_payment' ? 'active' : ''}`}
          onClick={() => setActiveTab('waiting_payment')}
        >
          Waiting Payment
        </button>
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
        <button 
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Edit Catalog
        </button>
      </div>

      {activeTab !== 'catalog' && (
        <div className="requests-section">
          <div className="section-header">
            <h3>{activeTab === 'requests' ? 'All Repair Requests' : `${activeTab.replace('_', ' ').toUpperCase()} Requests`}</h3>
            <button onClick={fetchRepairRequests} className="refresh-btn">
              🔄 Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <div className="requests-grid">
              {getFilteredRequests().length === 0 ? (
                <p className="no-requests">No repair requests found.</p>
              ) : (
                getFilteredRequests().map((request) => (
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
                    
                    <div className="request-summary">
                      <div className="summary-row">
                        <span className="summary-label">Customer:</span>
                        <span className="summary-value">{request.user_name}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Phone:</span>
                        <span className="summary-value">{request.contact_number || request.user_phone}</span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Services:</span>
                        <span className="summary-value">
                          {Array.isArray(request.services) && request.services.length > 0 
                            ? request.services.map(s => s.name).join(', ')
                            : 'No services'
                          }
                        </span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Date:</span>
                        <span className="summary-value">{request.preferred_date}</span>
                      </div>
                      {request.address && (
                        <div className="summary-row">
                          <span className="summary-label">Address:</span>
                          <span className="summary-value" title={request.address}>
                            {request.address.length > 25 ? request.address.substring(0, 25) + '...' : request.address}
                          </span>
                        </div>
                      )}
                      <div className="summary-row">
                        <span className="summary-label">Amount:</span>
                        <span className="summary-value amount">₹{request.net_amount || request.total_amount}</span>
                      </div>
                    </div>

                    {/* Media Files Display */}
                    {request.files && request.files.length > 0 && (
                      <div className="media-section">
                        <div className="media-header">
                          <span className="media-label">Media Files:</span>
                          <span className="media-count">
                            {request.files.filter(f => f.file_type === 'image').length} photos, 
                            {request.files.filter(f => f.file_type === 'video').length} video
                          </span>
                        </div>
                        <div className="media-preview">
                          {request.files.slice(0, 3).map((file, index) => (
                            <div key={file.id} className="media-item">
                              {file.file_type === 'image' ? (
                                <img 
                                  src={`http://localhost:3000${file.file_url}`} 
                                  alt={`Photo ${index + 1}`}
                                  className="media-thumbnail"
                                  onClick={() => openMediaModal(request.files, index)}
                                />
                              ) : (
                                <div 
                                  className="video-thumbnail"
                                  onClick={() => openMediaModal(request.files, index)}
                                >
                                  <div className="video-icon">▶</div>
                                  <span>Video</span>
                                </div>
                              )}
                            </div>
                          ))}
                          {request.files.length > 3 && (
                            <div className="media-more">
                              +{request.files.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="request-actions">
                      <button 
                        onClick={() => openRequestModal(request)}
                        className="action-btn view"
                      >
                        View Details
                      </button>
                      
                      {request.status === 'pending' && (
                        <>
                          {request.payment_method === 'online' ? (
                            <button 
                              onClick={() => updateRequestStatus(request.id, 'waiting_payment')}
                              className="action-btn approve"
                            >
                              Approve (Online)
                            </button>
                          ) : (
                            <button 
                              onClick={() => updateRequestStatus(request.id, 'active')}
                              className="action-btn approve"
                            >
                              Approve (Cash)
                            </button>
                          )}
                          <button 
                            onClick={() => deleteRequest(request.id)}
                            className="action-btn delete"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {request.status === 'active' && (
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
          )}
        </div>
      )}

      {/* Request Details Modal */}
      {showRequestModal && selectedRequest && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Repair Request #{selectedRequest.id}</h3>
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
                    {getStatusText(selectedRequest.status)}
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
                    <span className="info-value">{selectedRequest.contact_number || selectedRequest.user_phone}</span>
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
                  {selectedRequest.address && (
                    <div className="info-item full-width">
                      <span className="info-label">Address:</span>
                      <span className="info-value address-text">{selectedRequest.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="detail-section">
                <h4>Service Details</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Services:</span>
                    <span className="info-value">
                      {Array.isArray(selectedRequest.services) && selectedRequest.services.length > 0 
                        ? selectedRequest.services.map(s => s.name).join(', ')
                        : 'No services'
                      }
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Preferred Date:</span>
                    <span className="info-value">{selectedRequest.preferred_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Time Slot:</span>
                    <span className="info-value">
                      {selectedRequest.start_time && selectedRequest.end_time 
                        ? `${selectedRequest.start_time} - ${selectedRequest.end_time}`
                        : selectedRequest.preferred_time_slot
                      }
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Payment Method:</span>
                    <span className="info-value">{selectedRequest.payment_method}</span>
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
                        <span className="info-value discount-amount">₹{selectedRequest.coupon_discount_amount}</span>
                      </div>
                    </>
                  )}
                  <div className="info-item">
                    <span className="info-label">Net Amount:</span>
                    <span className="info-value net-amount">₹{selectedRequest.net_amount || selectedRequest.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Media Files */}
              {selectedRequest.files && selectedRequest.files.length > 0 && (
                <div className="detail-section">
                  <h4>Media Files</h4>
                  <div className="media-detail-grid">
                    {selectedRequest.files.map((file, index) => (
                      <div key={file.id} className="media-detail-item">
                        {file.file_type === 'image' ? (
                          <img 
                            src={`http://localhost:3000${file.file_url}`} 
                            alt={`Media ${index + 1}`}
                            className="media-detail-thumbnail"
                            onClick={() => openMediaModal(selectedRequest.files, index)}
                          />
                        ) : (
                          <div 
                            className="video-detail-thumbnail"
                            onClick={() => openMediaModal(selectedRequest.files, index)}
                          >
                            <div className="video-icon">▶</div>
                            <span>Video</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <div className="notes-container">
                    <p className="notes-text">{selectedRequest.notes}</p>
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
                      onClick={() => updateRequestStatus(selectedRequest.id, 'active')}
                      className="action-btn approve"
                    >
                      Approve (Cash Payment)
                    </button>
                  )}
                </div>
              )}
              
              {selectedRequest.status === 'active' && (
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

      {activeTab === 'catalog' && (
        <div className="catalog-section">
          <h3>Edit Repair Categories Catalog</h3>
          
          {/* Service Mechanic Charge Management */}
          <div className="mechanic-charge-section">
            <h4>Service Mechanic Charge</h4>
            <div className="charge-input">
              <label>Current Charge: ₹</label>
              <input
                type="number"
                value={mechanicCharge}
                onChange={(e) => setMechanicCharge(Number(e.target.value))}
                min="0"
                step="10"
              />
              <button onClick={updateMechanicCharge} className="update-btn">
                Update Charge
              </button>
            </div>
          </div>

          {/* Time Slots Management */}
          <div className="time-slots-section">
            <h4>Time Slots Management</h4>
            <button 
              onClick={() => setShowTimeSlotForm(!showTimeSlotForm)} 
              className="add-btn"
            >
              {showTimeSlotForm ? 'Cancel' : 'Add Time Slot'}
            </button>

            {showTimeSlotForm && (
              <div className="time-slot-form">
                <input
                  type="time"
                  value={newTimeSlot.start_time}
                  onChange={(e) => setNewTimeSlot({...newTimeSlot, start_time: e.target.value})}
                  placeholder="Start Time"
                />
                <input
                  type="time"
                  value={newTimeSlot.end_time}
                  onChange={(e) => setNewTimeSlot({...newTimeSlot, end_time: e.target.value})}
                  placeholder="End Time"
                />
                <button onClick={createTimeSlot} className="submit-btn">
                  Add Time Slot
                </button>
              </div>
            )}

            <div className="time-slots-list">
              {timeSlots.map((slot) => (
                <div key={slot.id} className="time-slot-item">
                  <span>{slot.start_time} - {slot.end_time}</span>
                  <button 
                    onClick={() => deleteTimeSlot(slot.id)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Repair Services Management */}
          <div className="services-section">
            <h4>Repair Services Management</h4>
            <button 
              onClick={() => setShowServiceForm(!showServiceForm)} 
              className="add-btn"
            >
              {showServiceForm ? 'Cancel' : 'Add New Service'}
            </button>

            {showServiceForm && (
              <div className="service-form">
                <div className="form-group">
                  <label>Service Name:</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({...newService, name: e.target.value})}
                    placeholder="e.g., Tire Puncture Repair"
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                    placeholder="Service description"
                  />
                </div>
                <div className="form-group">
                  <label>Special Instructions:</label>
                  <textarea
                    value={newService.special_instructions}
                    onChange={(e) => setNewService({...newService, special_instructions: e.target.value})}
                    placeholder="Special instructions for mechanics"
                  />
                </div>
                <div className="form-group">
                  <label>Price (₹):</label>
                  <input
                    type="number"
                    value={newService.price}
                    onChange={(e) => setNewService({...newService, price: Number(e.target.value)})}
                    min="0"
                    step="10"
                  />
                </div>
                <button onClick={createService} className="submit-btn">
                  Create Service
                </button>
              </div>
            )}

            <div className="services-list">
              {services.map((service) => (
                <div key={service.id} className="service-card">
                  {editingService?.id === service.id ? (
                    <div className="service-edit-form">
                      <input
                        type="text"
                        value={editingService.name}
                        onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                      />
                      <textarea
                        value={editingService.description}
                        onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                      />
                      <textarea
                        value={editingService.special_instructions}
                        onChange={(e) => setEditingService({...editingService, special_instructions: e.target.value})}
                      />
                      <input
                        type="number"
                        value={editingService.price}
                        onChange={(e) => setEditingService({...editingService, price: Number(e.target.value)})}
                      />
                      <div className="edit-actions">
                        <button onClick={() => updateService(service.id)} className="save-btn">
                          Save
                        </button>
                        <button onClick={() => setEditingService(null)} className="cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="service-info">
                        <h5>{service.name}</h5>
                        <p>{service.description}</p>
                        {service.special_instructions && (
                          <p><em>Instructions: {service.special_instructions}</em></p>
                        )}
                        <strong>₹{service.price}</strong>
                      </div>
                      <div className="service-actions">
                        <button 
                          onClick={() => setEditingService(service)}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteService(service.id)}
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
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && selectedMedia && (
        <div className="modal-overlay" onClick={closeMediaModal}>
          <div className="modal-content media-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Media Files</h3>
              <button className="close-btn" onClick={closeMediaModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="media-gallery">
                {selectedMedia.files.map((file, index) => (
                  <div key={file.id} className={`media-item ${index === selectedMedia.currentIndex ? 'active' : ''}`}>
                    {file.file_type === 'image' ? (
                      <img 
                        src={`http://localhost:3000${file.file_url}`} 
                        alt={`Media ${index + 1}`}
                        className="media-full"
                      />
                    ) : (
                      <video 
                        src={`http://localhost:3000${file.file_url}`} 
                        controls
                        className="media-full"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="media-navigation">
                <button 
                  onClick={() => setSelectedMedia({
                    ...selectedMedia,
                    currentIndex: selectedMedia.currentIndex > 0 ? selectedMedia.currentIndex - 1 : selectedMedia.files.length - 1
                  })}
                  disabled={selectedMedia.files.length <= 1}
                >
                  ← Previous
                </button>
                <span className="media-counter">
                  {selectedMedia.currentIndex + 1} of {selectedMedia.files.length}
                </span>
                <button 
                  onClick={() => setSelectedMedia({
                    ...selectedMedia,
                    currentIndex: selectedMedia.currentIndex < selectedMedia.files.length - 1 ? selectedMedia.currentIndex + 1 : 0
                  })}
                  disabled={selectedMedia.files.length <= 1}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairManagement; 