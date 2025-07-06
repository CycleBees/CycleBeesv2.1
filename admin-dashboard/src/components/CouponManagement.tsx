import React, { useState, useEffect } from 'react';

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_amount: number;
  max_discount: number;
  usage_limit: number;
  used_count: number;
  expiry_date: string;
  applicable_items: string;
  is_active: boolean;
}

const CouponManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_amount: 0,
    max_discount: 0,
    usage_limit: 1,
    expiry_date: '',
    applicable_items: 'all'
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/coupon/admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Coupon fetch response:', data);

      if (!response.ok || !Array.isArray(data.data?.coupons)) {
        setError(data.message || 'Failed to fetch coupons');
        setCoupons([]);
        return;
      }

      setCoupons(data.data.coupons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async () => {
    try {
      // Clear any previous messages
      setError(null);
      setSuccess(null);
      
      // Validate required fields before sending
      if (!newCoupon.code.trim()) {
        setError('Coupon code is required');
        return;
      }
      
      if (newCoupon.code.length < 3) {
        setError('Coupon code must be at least 3 characters long');
        return;
      }
      
      if (newCoupon.discount_value <= 0) {
        setError('Discount value must be greater than 0');
        return;
      }
      
      if (newCoupon.usage_limit < 1) {
        setError('Usage limit must be at least 1');
        return;
      }
      
      if (!newCoupon.expiry_date) {
        setError('Expiry date is required');
        return;
      }
      
      const token = localStorage.getItem('adminToken');
      
      // Transform the data to match backend expectations
      const couponData = {
        code: newCoupon.code.trim(),
        discountType: newCoupon.discount_type,
        discountValue: newCoupon.discount_value,
        minAmount: newCoupon.min_amount || 0,
        maxDiscount: newCoupon.max_discount || 0,
        usageLimit: newCoupon.usage_limit,
        expiresAt: newCoupon.expiry_date,
        applicableItems: [newCoupon.applicable_items], // Backend expects an array
        description: `Coupon ${newCoupon.code.trim()}` // Add description as it's required
      };

      const response = await fetch('http://localhost:3000/api/coupon/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(couponData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (response.status === 400 && responseData.errors) {
          const errorMessages = responseData.errors.map((err: any) => err.msg).join(', ');
          throw new Error(`Validation error: ${errorMessages}`);
        } else {
          throw new Error(responseData.message || 'Failed to create coupon');
        }
      }

      // Reset form and refresh list
      setNewCoupon({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        min_amount: 0,
        max_discount: 0,
        usage_limit: 1,
        expiry_date: '',
        applicable_items: 'all'
      });
      setShowCreateModal(false);
      fetchCoupons();
      setSuccess('Coupon created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/coupon/admin/${couponToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete coupon');
      }

      fetchCoupons();
      setShowDeleteModal(false);
      setCouponToDelete(null);
      setSuccess('Coupon deleted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  const getApplicableItemsText = (items: string) => {
    switch (items) {
      case 'all': return 'All Items';
      case 'repair_services': return 'Repair Services';
      case 'rental_bicycles': return 'Rental Bicycles';
      case 'delivery_charges': return 'Delivery Charges';
      default: return items;
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="coupon-management">
      <div className="page-header">
        <h2>Coupon Management</h2>
        <div className="header-actions">
          <button onClick={fetchCoupons} className="refresh-btn">
            <span>🔄</span> Refresh
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="add-coupon-btn"
          >
            <span>➕</span> Add New Coupon
          </button>
        </div>
      </div>

      {success && (
        <div className="success-message">
          <span>✅</span> {success}
        </div>
      )}

      <div className="coupons-overview">
        <div className="overview-stats">
          <div className="stat-card">
            <div className="stat-number">{coupons.length}</div>
            <div className="stat-label">Total Coupons</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {coupons.filter(c => !isExpired(c.expiry_date)).length}
            </div>
            <div className="stat-label">Active Coupons</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {coupons.filter(c => isExpired(c.expiry_date)).length}
            </div>
            <div className="stat-label">Expired Coupons</div>
          </div>
        </div>
      </div>

      <div className="coupons-section">
        <h3>All Coupons</h3>
        {!Array.isArray(coupons) ? (
          <div className="empty-state">
            <div className="empty-icon">❌</div>
            <p>Failed to load coupons.</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <p>No coupons found.</p>
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="create-first-btn"
            >
              Create Your First Coupon
            </button>
          </div>
        ) : (
          <div className="coupons-grid">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="coupon-card">
                <div className="coupon-header">
                  <div className="coupon-code">
                    <span className="code-text">{coupon.code}</span>
                    {isExpired(coupon.expiry_date) ? (
                      <span className="status-badge expired">EXPIRED</span>
                    ) : (
                      <span className="status-badge active">ACTIVE</span>
                    )}
                  </div>
                  <div className="coupon-discount">
                    <span className="discount-value">
                      {coupon.discount_value}
                      {coupon.discount_type === 'percentage' ? '%' : '₹'}
                    </span>
                    <span className="discount-label">OFF</span>
                  </div>
                </div>
                
                <div className="coupon-body">
                  <div className="coupon-details">
                    <div className="detail-row">
                      <span className="detail-label">Min Amount:</span>
                      <span className="detail-value">₹{coupon.min_amount || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Max Discount:</span>
                      <span className="detail-value">₹{coupon.max_discount || 'No limit'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Usage:</span>
                      <span className="detail-value">
                        {coupon.used_count}/{coupon.usage_limit}
                        <span className="usage-percentage">
                          ({getUsagePercentage(coupon.used_count, coupon.usage_limit)}%)
                        </span>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Expires:</span>
                      <span className="detail-value">
                        {new Date(coupon.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail-row full-width">
                      <span className="detail-label">Applicable:</span>
                      <span className="detail-value">
                        {getApplicableItemsText(coupon.applicable_items)}
                      </span>
                    </div>
                  </div>

                  <div className="usage-bar">
                    <div 
                      className="usage-progress" 
                      style={{ width: `${getUsagePercentage(coupon.used_count, coupon.usage_limit)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="coupon-actions">
                  <button 
                    onClick={() => deleteCoupon(coupon)}
                    className="delete-btn"
                    title="Delete Coupon"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Coupon</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {error && (
                <div className="error-message">
                  <span>⚠️</span> {error}
                </div>
              )}
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Coupon Code *</label>
                  <input
                    type="text"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                    placeholder="e.g., WELCOME10 (min 3 characters)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Discount Type *</label>
                  <select
                    value={newCoupon.discount_type}
                    onChange={(e) => setNewCoupon({...newCoupon, discount_type: e.target.value})}
                    required
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Discount Value *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({...newCoupon, discount_value: Number(e.target.value)})}
                    placeholder={newCoupon.discount_type === 'percentage' ? '10 (for 10%)' : '100 (for ₹100)'}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Minimum Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={newCoupon.min_amount}
                    onChange={(e) => setNewCoupon({...newCoupon, min_amount: Number(e.target.value)})}
                    placeholder="0 (no minimum)"
                  />
                </div>

                <div className="form-group">
                  <label>Maximum Discount</label>
                  <input
                    type="number"
                    min="0"
                    value={newCoupon.max_discount}
                    onChange={(e) => setNewCoupon({...newCoupon, max_discount: Number(e.target.value)})}
                    placeholder="0 (no maximum)"
                  />
                </div>

                <div className="form-group">
                  <label>Usage Limit *</label>
                  <input
                    type="number"
                    min="1"
                    value={newCoupon.usage_limit}
                    onChange={(e) => setNewCoupon({...newCoupon, usage_limit: Number(e.target.value)})}
                    placeholder="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="date"
                    value={newCoupon.expiry_date}
                    onChange={(e) => setNewCoupon({...newCoupon, expiry_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Applicable Items *</label>
                  <select
                    value={newCoupon.applicable_items}
                    onChange={(e) => setNewCoupon({...newCoupon, applicable_items: e.target.value})}
                    required
                  >
                    <option value="all">All Items</option>
                    <option value="repair_services">Repair Services</option>
                    <option value="rental_bicycles">Rental Bicycles</option>
                    <option value="delivery_charges">Delivery Charges</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCreateModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={createCoupon} className="submit-btn">
                Create Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && couponToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Coupon</h3>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <p>Are you sure you want to delete this coupon?</p>
                <div className="coupon-to-delete">
                  <strong>{couponToDelete.code}</strong>
                  <span className="coupon-desc">
                    {couponToDelete.discount_value}
                    {couponToDelete.discount_type === 'percentage' ? '%' : '₹'} off
                  </span>
                </div>
                <p className="warning-text">
                  This action cannot be undone. The coupon will be permanently removed.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={confirmDelete} className="delete-confirm-btn">
                Delete Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagement; 