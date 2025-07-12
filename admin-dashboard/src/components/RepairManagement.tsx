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
  notes: string;
  payment_method: string;
  alternate_number?: string;
  email?: string;
  address?: string;
  rejection_note?: string;
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
  const [success, setSuccess] = useState<string | null>(null);
  
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

  // Confirmation modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  const [showDeleteTimeSlotModal, setShowDeleteTimeSlotModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    type: 'status' | 'delete' | 'deleteService' | 'deleteTimeSlot' | 'reject';
    requestId?: number;
    serviceId?: number;
    timeSlotId?: number;
    newStatus?: string;
    currentStatus?: string;
  } | null>(null);

  // Status filter state
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('pending');

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
      setError(null);
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
      setSuccess('Repair requests loaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepairServices = async () => {
    try {
      setLoading(true);
      setError(null);
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
        setMechanicCharge(data.data?.charge || 0);
      }
    } catch (err) {
      console.error('Failed to fetch mechanic charge:', err);
    }
  };

  const updateRequestStatus = async (requestId: number, status: string, rejectionNote?: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('adminToken');
      
      const requestBody: any = { status };
      if (status === 'rejected' && rejectionNote) {
        requestBody.rejectionNote = rejectionNote;
      }
      
      const response = await fetch(`http://localhost:3000/api/repair/admin/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      setSuccess(`Request status updated to ${status}`);
      fetchRepairRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteRequest = async (requestId: number) => {
    try {
      setError(null);
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

      setSuccess('Request deleted successfully');
      fetchRepairRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createService = async () => {
    try {
      setError(null);
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

      setSuccess('Service created successfully');
      clearServiceForm();
      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateService = async (serviceId: number) => {
    if (!editingService) return;

    try {
      setError(null);
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

      setSuccess('Service updated successfully');
      setEditingService(null);
      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteService = async (serviceId: number) => {
    try {
      setError(null);
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

      setSuccess('Service deleted successfully');
      fetchRepairServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateMechanicCharge = async () => {
    try {
      setError(null);
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

      setSuccess('Mechanic charge updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const createTimeSlot = async () => {
    try {
      setError(null);
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

      setSuccess('Time slot created successfully');
      clearTimeSlotForm();
      fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteTimeSlot = async (timeSlotId: number) => {
    try {
      setError(null);
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

      setSuccess('Time slot deleted successfully');
      fetchTimeSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleStatusChange = (requestId: number, newStatus: string) => {
    const currentRequest = requests.find(r => r.id === requestId);
    setPendingAction({ 
      type: 'status', 
      requestId, 
      newStatus, 
      currentStatus: currentRequest?.status 
    });
    setShowStatusModal(true);
  };

  const handleDeleteRequest = (requestId: number) => {
    setPendingAction({ type: 'delete', requestId });
    setShowDeleteModal(true);
  };

  const handleDeleteService = (serviceId: number) => {
    setPendingAction({ type: 'deleteService', serviceId });
    setShowDeleteServiceModal(true);
  };

  const handleDeleteTimeSlot = (timeSlotId: number) => {
    setPendingAction({ type: 'deleteTimeSlot', timeSlotId });
    setShowDeleteTimeSlotModal(true);
  };

  const handleRejectRequest = (requestId: number) => {
    setPendingAction({ type: 'reject', requestId });
    setRejectionNote('');
    setShowRejectModal(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'status' && pendingAction.requestId && pendingAction.newStatus) {
      await updateRequestStatus(pendingAction.requestId, pendingAction.newStatus);
    } else if (pendingAction.type === 'delete' && pendingAction.requestId) {
      await deleteRequest(pendingAction.requestId);
    } else if (pendingAction.type === 'deleteService' && pendingAction.serviceId) {
      await deleteService(pendingAction.serviceId);
    } else if (pendingAction.type === 'deleteTimeSlot' && pendingAction.timeSlotId) {
      await deleteTimeSlot(pendingAction.timeSlotId);
    } else if (pendingAction.type === 'reject' && pendingAction.requestId) {
      await updateRequestStatus(pendingAction.requestId, 'rejected', rejectionNote);
    }

    setShowStatusModal(false);
    setShowDeleteModal(false);
    setShowDeleteServiceModal(false);
    setShowDeleteTimeSlotModal(false);
    setShowRejectModal(false);
    setPendingAction(null);
    setRejectionNote('');
  };

  const clearServiceForm = () => {
    setNewService({
      name: '',
      description: '',
      special_instructions: '',
      price: 0
    });
    setShowServiceForm(false);
  };

  const clearTimeSlotForm = () => {
    setNewTimeSlot({
      start_time: '',
      end_time: ''
    });
    setShowTimeSlotForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#ffc107';
      case 'approved': return '#28a745';
      case 'waiting_payment': return '#17a2b8';
      case 'active': return '#28a745';
      case 'completed': return '#6c757d';
      case 'expired': return '#dc3545';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'waiting_payment': return 'Waiting for Payment';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'expired': return 'Expired';
      case 'rejected': return 'Rejected';
      default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

  const getPendingRequests = () => requests.filter(r => r.status.toLowerCase() === 'pending').length;
  const getActiveRequests = () => requests.filter(r => r.status.toLowerCase() === 'active').length;
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

  if (loading && requests.length === 0 && services.length === 0) return <div className="loading">Loading...</div>;
  if (error && requests.length === 0 && services.length === 0) return <div className="error">Error: {error}</div>;

  return (
    <div className="repair-management">
      <div className="page-header">
      <h2>Repair Management</h2>
        <div className="header-actions">
          <button onClick={activeTab === 'requests' ? fetchRepairRequests : fetchRepairServices} className="refresh-btn">
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
          Repair Requests
        </button>
        <button 
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Service Catalog
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
                <div className="stat-number">{getActiveRequests()}</div>
                <div className="stat-label">Active</div>
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
                className={`status-tab ${activeStatusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('active')}
                          >
                Active ({getStatusCount('active')})
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
              <button 
                className={`status-tab ${activeStatusFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setActiveStatusFilter('rejected')}
              >
                Rejected ({getStatusCount('rejected')})
              </button>
                    </div>
            
            {getFilteredRequests().length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔧</div>
                <h3>No {activeStatusFilter === 'all' ? '' : activeStatusFilter} Requests</h3>
                <p>
                  {activeStatusFilter === 'all' 
                    ? 'No repair requests have been made yet.' 
                    : `No ${activeStatusFilter} repair requests found.`
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
                        <span className="quick-info-value">₹{request.net_amount}</span>
                  </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Services</span>
                        <span className="quick-info-value">
                          {request.services.length} service{request.services.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                      <div className="quick-info-item">
                        <span className="quick-info-label">Date</span>
                        <span className="quick-info-value">
                          {new Date(request.preferred_date).toLocaleDateString()}
                    </span>
                </div>
              </div>

                    <div className="request-summary">
                      <div className="summary-row">
                        <span className="summary-label">Phone:</span>
                        <span className="summary-value">{request.user_phone}</span>
                  </div>
                      <div className="summary-row">
                        <span className="summary-label">Time:</span>
                        <span className="summary-value">
                          {request.start_time && request.end_time 
                            ? `${request.start_time} - ${request.end_time}`
                            : 'Time slot not available'
                          }
                        </span>
                      </div>
                      <div className="summary-row">
                        <span className="summary-label">Payment:</span>
                        <span className="summary-value">{request.payment_method}</span>
                      </div>
                      {request.files.length > 0 && (
                        <div className="summary-row">
                          <span className="summary-label">Files:</span>
                          <span className="summary-value">{request.files.length} attached</span>
                      </div>
                  )}
              </div>

                    <div className="request-actions">
                    <button 
                        onClick={() => setSelectedRequest(request)}
                        className="action-btn view"
                    >
                        View Details
                    </button>
                      
                                            {request.status.toLowerCase() === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(request.id, 'approved')}
                            className="action-btn approve"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectRequest(request.id)}
                            className="action-btn reject"
                          >
                            Reject
                          </button>
                        </>
                      )}
              
                      {request.status.toLowerCase() === 'approved' && (
                <button 
                          onClick={() => handleStatusChange(request.id, 'active')}
                          className="action-btn progress"
                >
                          Start Work
                </button>
              )}
              
                      {request.status.toLowerCase() === 'waiting_payment' && (
              <button 
                          onClick={() => handleStatusChange(request.id, 'active')}
                          className="action-btn progress"
              >
                          Payment Received
              </button>
      )}

                      {request.status.toLowerCase() === 'active' && (
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

      {activeTab === 'catalog' && (
        <div className="catalog-section">
          {/* Services Management */}
          <div className="services-management">
            <div className="section-header">
              <h3>Repair Services</h3>
            <button 
              onClick={() => setShowServiceForm(!showServiceForm)} 
              className="add-btn"
            >
              {showServiceForm ? 'Cancel' : 'Add New Service'}
            </button>
            </div>

            {showServiceForm && (
              <div className="service-form">
                <h4>Add New Service</h4>
                <div className="form-grid">
                <div className="form-group">
                  <label>Service Name:</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({...newService, name: e.target.value})}
                      placeholder="e.g., Brake Repair"
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
                </div>
                <button 
                  onClick={createService} 
                  className="submit-btn"
                >
                  Create Service
                </button>
              </div>
            )}

            <div className="services-grid">
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
                      <div className="service-header">
                        <h4>{service.name}</h4>
                        <span className="price">₹{service.price}</span>
                      </div>
                      
                      <div className="service-details">
                        <p><strong>Description:</strong> {service.description}</p>
                        {service.special_instructions && (
                          <p><strong>Special Instructions:</strong> {service.special_instructions}</p>
                        )}
                      </div>

                      <div className="service-actions">
                        <button 
                          onClick={() => setEditingService(service)}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteService(service.id)}
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

          {/* Time Slots Management */}
          <div className="time-slots-management">
            <div className="section-header">
              <h3>Time Slots</h3>
              <button 
                onClick={() => setShowTimeSlotForm(!showTimeSlotForm)} 
                className="add-btn"
              >
                {showTimeSlotForm ? 'Cancel' : 'Add New Time Slot'}
              </button>
            </div>

            {showTimeSlotForm && (
              <div className="time-slot-form">
                <h4>Add New Time Slot</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Start Time:</label>
                    <input
                      type="time"
                      value={newTimeSlot.start_time}
                      onChange={(e) => setNewTimeSlot({...newTimeSlot, start_time: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time:</label>
                    <input
                      type="time"
                      value={newTimeSlot.end_time}
                      onChange={(e) => setNewTimeSlot({...newTimeSlot, end_time: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={createTimeSlot} 
                  className="submit-btn"
                >
                  Create Time Slot
                </button>
        </div>
      )}

            <div className="time-slots-grid">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot.id} className="time-slot-card">
                  <div className="time-slot-header">
                    <h4>{timeSlot.start_time} - {timeSlot.end_time}</h4>
                  </div>
                  
                  <div className="time-slot-actions">
                    <button 
                      onClick={() => handleDeleteTimeSlot(timeSlot.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mechanic Charge Management */}
          <div className="mechanic-charge-management">
            <div className="section-header">
              <h3>Mechanic Charge</h3>
            </div>
            <div className="mechanic-charge-form">
              <div className="form-group">
                <label>Base Mechanic Charge (₹):</label>
                <input
                  type="number"
                  value={mechanicCharge}
                  onChange={(e) => setMechanicCharge(Number(e.target.value))}
                  min="0"
                  step="10"
                />
              </div>
              <button 
                onClick={updateMechanicCharge} 
                className="submit-btn"
              >
                Update Charge
              </button>
            </div>
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
              <div className="status-change-info">
                <div className="current-status">
                  <span className="status-label">Current Status:</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(pendingAction?.currentStatus || '') }}
                  >
                    {getStatusText(pendingAction?.currentStatus || '')}
                  </span>
                </div>
                <div className="status-arrow">→</div>
                <div className="new-status">
                  <span className="status-label">New Status:</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(pendingAction?.newStatus || '') }}
                  >
                    {getStatusText(pendingAction?.newStatus || '')}
                  </span>
                </div>
              </div>
              <p className="confirmation-text">Are you sure you want to change the status?</p>
              <p className="warning-text">This action cannot be undone.</p>
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
              <p>Are you sure you want to delete this repair request?</p>
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

      {showDeleteServiceModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteServiceModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={() => setShowDeleteServiceModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete this service?</p>
              <p><strong>This action cannot be undone.</strong></p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteServiceModal(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={confirmAction}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteTimeSlotModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteTimeSlotModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button className="close-btn" onClick={() => setShowDeleteTimeSlotModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to delete this time slot?</p>
              <p><strong>This action cannot be undone.</strong></p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDeleteTimeSlotModal(false)}>
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
              <h3>Repair Request Details</h3>
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
                  <label>Preferred Date:</label>
                  <p>{new Date(selectedRequest.preferred_date).toLocaleDateString()}</p>
                </div>
                <div className="detail-group">
                  <label>Time Slot:</label>
                  <p>
                    {selectedRequest.start_time && selectedRequest.end_time 
                      ? `${selectedRequest.start_time} - ${selectedRequest.end_time}`
                      : 'Time slot not available'
                    }
                  </p>
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
                {selectedRequest.address && (
                  <div className="detail-group full-width">
                    <label>Address:</label>
                    <p>{selectedRequest.address}</p>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div className="detail-group full-width">
                    <label>Notes:</label>
                    <p>{selectedRequest.notes}</p>
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
                {selectedRequest.rejection_note && (
                  <div className="detail-group full-width">
                    <label>Rejection Note:</label>
                    <p className="rejection-note">{selectedRequest.rejection_note}</p>
                  </div>
                )}
              </div>

              {/* Services Section */}
              <div className="services-section">
                <h4>Requested Services</h4>
                <div className="services-list">
                  {selectedRequest.services.map((service, index) => (
                    <div key={index} className="service-item">
                      <div className="service-header">
                        <h5>{service.name}</h5>
                        <span className="service-price">₹{service.price}</span>
                      </div>
                      <p className="service-description">{service.description}</p>
                      {service.special_instructions && (
                        <p className="service-instructions">
                          <strong>Instructions:</strong> {service.special_instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Files Section */}
              {selectedRequest.files.length > 0 && (
                <div className="files-section">
                  <h4>Attached Files ({selectedRequest.files.length})</h4>
                  <div className="files-grid">
                    {selectedRequest.files.map((file, index) => (
                      <div key={file.id} className="file-item">
                        <button 
                          onClick={() => {
                            setSelectedMedia({ files: selectedRequest.files, currentIndex: index });
                            setShowMediaModal(true);
                          }}
                          className="file-preview"
                        >
                          {file.file_type.startsWith('image/') ? (
                      <img 
                              src={`http://localhost:3000/${file.file_url}`} 
                              alt={`File ${index + 1}`}
                              className="file-image"
                      />
                    ) : (
                            <div className="file-icon">📄</div>
                    )}
                        </button>
                  </div>
                ))}
              </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && selectedMedia && (
        <div className="modal-overlay" onClick={() => setShowMediaModal(false)}>
          <div className="modal-content media-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Media Viewer</h3>
              <button className="close-btn" onClick={() => setShowMediaModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="media-viewer">
                {selectedMedia.files[selectedMedia.currentIndex]?.file_type.startsWith('image/') ? (
                  <img 
                    src={`http://localhost:3000/${selectedMedia.files[selectedMedia.currentIndex].file_url}`}
                    alt={`Media ${selectedMedia.currentIndex + 1}`}
                    className="media-image"
                  />
                ) : (
                  <div className="media-placeholder">
                    <div className="file-icon-large">📄</div>
                    <p>File: {selectedMedia.files[selectedMedia.currentIndex]?.file_url.split('/').pop()}</p>
                  </div>
                )}
              </div>
              {selectedMedia.files.length > 1 && (
              <div className="media-navigation">
                <button 
                  onClick={() => setSelectedMedia({
                    ...selectedMedia,
                    currentIndex: selectedMedia.currentIndex > 0 ? selectedMedia.currentIndex - 1 : selectedMedia.files.length - 1
                  })}
                    className="nav-btn"
                >
                    ‹ Previous
                </button>
                <span className="media-counter">
                  {selectedMedia.currentIndex + 1} of {selectedMedia.files.length}
                </span>
                <button 
                  onClick={() => setSelectedMedia({
                    ...selectedMedia,
                    currentIndex: selectedMedia.currentIndex < selectedMedia.files.length - 1 ? selectedMedia.currentIndex + 1 : 0
                  })}
                    className="nav-btn"
                >
                    Next ›
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Repair Request</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">⚠️</div>
              <p>Are you sure you want to reject this repair request?</p>
              <p><strong>This action cannot be undone.</strong></p>
              
              <div className="form-group">
                <label htmlFor="rejectionNote">Rejection Note (Required):</label>
                <textarea
                  id="rejectionNote"
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={4}
                  required
                  className="rejection-note-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button 
                className="reject-confirm-btn" 
                onClick={confirmAction}
                disabled={!rejectionNote.trim()}
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairManagement; 