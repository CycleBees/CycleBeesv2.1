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
  const [showCreateForm, setShowCreateForm] = useState(false);
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
      setShowCreateForm(false);
      fetchCoupons();
      setSuccess('Coupon created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const deleteCoupon = async (couponId: number) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/coupon/admin/${couponId}`, {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="coupon-management">
      <h2>Coupon Management</h2>
      
      <div className="coupon-actions">
        <button onClick={fetchCoupons} className="refresh-btn">
          🔄 Refresh
        </button>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)} 
          className="create-btn"
        >
          {showCreateForm ? 'Cancel' : 'Create New Coupon'}
        </button>
      </div>

      {showCreateForm && (
        <div className="create-coupon-form">
          <h3>Create New Coupon</h3>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-grid">
            <div className="form-group">
              <label>Coupon Code: *</label>
              <input
                type="text"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                placeholder="e.g., WELCOME10 (min 3 characters)"
                required
              />
            </div>

            <div className="form-group">
              <label>Discount Type: *</label>
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
              <label>Discount Value: *</label>
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
              <label>Minimum Amount:</label>
              <input
                type="number"
                min="0"
                value={newCoupon.min_amount}
                onChange={(e) => setNewCoupon({...newCoupon, min_amount: Number(e.target.value)})}
                placeholder="0 (no minimum)"
              />
            </div>

            <div className="form-group">
              <label>Maximum Discount:</label>
              <input
                type="number"
                min="0"
                value={newCoupon.max_discount}
                onChange={(e) => setNewCoupon({...newCoupon, max_discount: Number(e.target.value)})}
                placeholder="0 (no maximum)"
              />
            </div>

            <div className="form-group">
              <label>Usage Limit: *</label>
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
              <label>Expiry Date: *</label>
              <input
                type="date"
                value={newCoupon.expiry_date}
                onChange={(e) => setNewCoupon({...newCoupon, expiry_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label>Applicable Items: *</label>
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

          <div className="form-actions">
            <button onClick={createCoupon} className="submit-btn">
              Create Coupon
            </button>
            <button onClick={() => {
              setShowCreateForm(false);
              setError(null); // Clear errors when canceling
            }} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="coupons-list">
        <h3>Existing Coupons</h3>
        {!Array.isArray(coupons) ? (
          <p>Failed to load coupons.</p>
        ) : coupons.length === 0 ? (
          <p>No coupons found.</p>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="coupon-card">
              <div className="coupon-header">
                <h4>{coupon.code}</h4>
                <div className="coupon-status">
                  {isExpired(coupon.expiry_date) ? (
                    <span className="status expired">EXPIRED</span>
                  ) : (
                    <span className="status active">ACTIVE</span>
                  )}
                </div>
              </div>
              
              <div className="coupon-details">
                <p><strong>Discount:</strong> {coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : '₹'}</p>
                <p><strong>Min Amount:</strong> ₹{coupon.min_amount}</p>
                <p><strong>Max Discount:</strong> ₹{coupon.max_discount}</p>
                <p><strong>Usage:</strong> {coupon.used_count}/{coupon.usage_limit}</p>
                <p><strong>Expires:</strong> {new Date(coupon.expiry_date).toLocaleDateString()}</p>
                <p><strong>Applicable:</strong> {coupon.applicable_items}</p>
              </div>

              <div className="coupon-actions">
                <button 
                  onClick={() => deleteCoupon(coupon.id)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CouponManagement; 