import React, { useState, useEffect } from 'react';

interface RepairRequest {
  id: number;
  user_name: string;
  user_phone: string;
  services: string[];
  total_amount: number;
  status: string;
  created_at: string;
  preferred_date: string;
  preferred_time_slot: string;
  notes: string;
  payment_method: string;
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
    if (!window.confirm('Are you sure you want to delete this service?')) return;

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
      console.log('Updating mechanic charge to:', mechanicCharge);
      
      const response = await fetch('http://localhost:3000/api/repair/admin/mechanic-charge', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ charge: mechanicCharge })
      });

      const data = await response.json();
      console.log('Update mechanic charge response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update mechanic charge');
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
    if (!window.confirm('Are you sure you want to delete this time slot?')) return;

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
      case 'pending': return 'orange';
      case 'waiting_payment': return 'blue';
      case 'active': return 'green';
      case 'completed': return 'gray';
      case 'expired': return 'red';
      default: return 'black';
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="repair-management">
      <h2>Repair Management</h2>
      
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Repair Request Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Edit Repair Categories Catalog
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="requests-section">
          <h3>Repair Requests</h3>
          <button onClick={fetchRepairRequests} className="refresh-btn">
            🔄 Refresh
          </button>
          
          <div className="requests-list">
            {requests.length === 0 ? (
              <p>No repair requests found.</p>
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
                    <p><strong>Services:</strong> {Array.isArray(request.services) ? request.services.join(', ') : request.services}</p>
                    <p><strong>Total Amount:</strong> ₹{request.total_amount}</p>
                    <p><strong>Payment Method:</strong> {request.payment_method}</p>
                    <p><strong>Preferred Date:</strong> {request.preferred_date}</p>
                    <p><strong>Time Slot:</strong> {request.preferred_time_slot}</p>
                    {request.notes && <p><strong>Notes:</strong> {request.notes}</p>}
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
                          onClick={() => updateRequestStatus(request.id, 'active')}
                          className="action-btn approve"
                        >
                          Approve (Cash Payment)
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
    </div>
  );
};

export default RepairManagement; 