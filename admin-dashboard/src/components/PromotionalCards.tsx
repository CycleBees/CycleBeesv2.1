import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import './PromotionalCards.css';

interface PromotionalCard {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  externalLink: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PromotionalCards() {
  const [cards, setCards] = useState<PromotionalCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<PromotionalCard | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    externalLink: '',
    displayOrder: 1,
    isActive: true,
    image: null as File | null
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/promotional/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCards(Array.isArray(data.data?.cards) ? data.data.cards : []);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch promotional cards');
      }
    } catch (error) {
      console.error('Error fetching promotional cards:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    if (formData.description && formData.description.trim().length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    if (formData.externalLink && formData.externalLink.trim()) {
      const link = formData.externalLink.trim();
      
      // Check if it's an internal route (starts with /)
      if (link.startsWith('/')) {
        // Validate internal route format
        if (!/^\/[a-zA-Z0-9\-_\/]+$/.test(link)) {
          errors.externalLink = 'Invalid internal route format. Use format like /profile, /book-repair';
        }
      } else {
        // Check if it's a valid external URL
        if (!isValidUrl(link)) {
          errors.externalLink = 'Please enter a valid URL (https://example.com) or internal route (like /profile)';
        }
      }
    }

    if (formData.displayOrder < 0) {
      errors.displayOrder = 'Display order must be 0 or greater';
    }

    if (formData.image && formData.image.size > 5 * 1024 * 1024) {
      errors.image = 'Image size must be less than 5MB';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('externalLink', formData.externalLink.trim());
      formDataToSend.append('displayOrder', formData.displayOrder.toString());
      formDataToSend.append('isActive', formData.isActive.toString());
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const url = editingCard 
        ? `${API_BASE_URL}/api/promotional/admin/${editingCard.id}`
        : `${API_BASE_URL}/api/promotional/admin`;
      
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccess(editingCard ? 'Card updated successfully!' : 'Card created successfully!');
        setShowForm(false);
        setEditingCard(null);
        resetForm();
        fetchCards();
      } else {
        throw new Error(responseData.message || 'Failed to save card');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (card: PromotionalCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      description: card.description,
      externalLink: card.externalLink,
      displayOrder: card.displayOrder,
      isActive: card.isActive,
      image: null
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this promotional card?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/promotional/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccess('Card deleted successfully!');
        fetchCards();
      } else {
        throw new Error(responseData.message || 'Failed to delete card');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      externalLink: '',
      displayOrder: 1,
      isActive: true,
      image: null
    });
    setFormErrors({});
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setFormErrors({...formErrors, image: 'Please select a valid image file (JPEG, PNG, GIF)'});
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors({...formErrors, image: 'Image size must be less than 5MB'});
        return;
      }
      
      setFormData({ ...formData, image: file });
      setFormErrors({...formErrors, image: ''});
    }
  };

  const getActiveCardsCount = () => {
    return cards.filter(card => card.isActive).length;
  };

  const getInactiveCardsCount = () => {
    return cards.filter(card => !card.isActive).length;
  };

  if (loading && cards.length === 0) return <div className="loading">Loading promotional cards...</div>;
  if (error && cards.length === 0) return <div className="error">Error: {error}</div>;

  return (
    <div className="promotional-cards">
      <div className="promotional-cards-header">
        <h2>Promotional Cards Management</h2>
        <div className="header-actions">
          <button onClick={fetchCards} className="refresh-btn">
            <span>🔄</span> Refresh
          </button>
          <button 
            className="add-card-btn"
            onClick={() => {
              setShowForm(true);
              setEditingCard(null);
              resetForm();
            }}
          >
            <span>➕</span> Add New Card
          </button>
        </div>
      </div>

      {success && (
        <div className="success-message">
          <span>✅</span> {success}
        </div>
      )}

      <div className="cards-overview">
        <div className="overview-stats">
          <div className="stat-card">
            <div className="stat-number">{cards.length}</div>
            <div className="stat-label">Total Cards</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getActiveCardsCount()}</div>
            <div className="stat-label">Active Cards</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getInactiveCardsCount()}</div>
            <div className="stat-label">Inactive Cards</div>
          </div>
        </div>
      </div>

      <div className="cards-section">
        <h3>All Promotional Cards</h3>
        {!Array.isArray(cards) ? (
          <div className="empty-state">
            <div className="empty-icon">❌</div>
            <h3>Failed to load cards</h3>
            <p>There was an error loading the promotional cards.</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📢</div>
            <h3>No Promotional Cards</h3>
            <p>Create your first promotional card to display on the mobile app home screen.</p>
            <button 
              className="create-first-btn"
              onClick={() => {
                setShowForm(true);
                setEditingCard(null);
                resetForm();
              }}
            >
              Create First Card
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {cards.map((card) => (
              <div key={card.id} className="card-item">
                <div className="card-image">
                  {card.imageUrl ? (
                    <img 
                      src={`${API_BASE_URL}/${card.imageUrl}`} 
                      alt={card.title}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`no-image ${card.imageUrl ? 'hidden' : ''}`}>
                    No Image
                  </div>
                  <div className="card-status">
                    <span className={`status-badge ${card.isActive ? 'active' : 'inactive'}`}>
                      {card.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="card-content">
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-description">{card.description}</p>
                  
                  <div className="card-details">
                    <div className="detail-item">
                      <span className="detail-label">Order:</span>
                      <span className="detail-value">{card.displayOrder}</span>
                    </div>
                    
                    {card.externalLink && (
                      <div className="detail-item">
                        <span className="detail-label">Link:</span>
                        {card.externalLink.startsWith('/') ? (
                          <span className="detail-value">
                            Internal: {card.externalLink}
                          </span>
                        ) : (
                          <a href={card.externalLink} target="_blank" rel="noopener noreferrer" className="detail-link">
                            External Link
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Updated:</span>
                      <span className="detail-value">
                        {new Date(card.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => handleEdit(card)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-danger btn-sm"
                    onClick={() => handleDelete(card.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Card Modal */}
      {showForm && (
        <div className="form-overlay" onClick={() => setShowForm(false)}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h3>{editingCard ? 'Edit Promotional Card' : 'Add New Promotional Card'}</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingCard(null);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="promotional-form">
              {error && (
                <div className="error-message">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({...formData, title: e.target.value});
                    if (formErrors.title) setFormErrors({...formErrors, title: ''});
                  }}
                  placeholder="Enter card title"
                  maxLength={100}
                  required
                  className={formErrors.title ? 'error' : ''}
                />
                {formErrors.title && <span className="field-error">{formErrors.title}</span>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({...formData, description: e.target.value});
                    if (formErrors.description) setFormErrors({...formErrors, description: ''});
                  }}
                  placeholder="Enter card description"
                  rows={3}
                  maxLength={500}
                  className={formErrors.description ? 'error' : ''}
                />
                {formErrors.description && <span className="field-error">{formErrors.description}</span>}
              </div>

              <div className="form-group">
                <label>Link (Optional)</label>
                <input
                  type="text"
                  value={formData.externalLink}
                  onChange={(e) => {
                    setFormData({...formData, externalLink: e.target.value});
                    if (formErrors.externalLink) setFormErrors({...formErrors, externalLink: ''});
                  }}
                  placeholder="https://example.com or /profile or leave empty"
                  className={formErrors.externalLink ? 'error' : ''}
                />
                {formErrors.externalLink && <span className="field-error">{formErrors.externalLink}</span>}
                <small>
                  <strong>Link Options:</strong><br/>
                  • <strong>External URL:</strong> https://example.com<br/>
                  • <strong>Internal Route:</strong> /profile, /book-repair, /my-requests<br/>
                  • <strong>No Link:</strong> Leave empty for cards without navigation
                </small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => {
                      setFormData({...formData, displayOrder: parseInt(e.target.value) || 0});
                      if (formErrors.displayOrder) setFormErrors({...formErrors, displayOrder: ''});
                    }}
                    min="0"
                    className={formErrors.displayOrder ? 'error' : ''}
                  />
                  {formErrors.displayOrder && <span className="field-error">{formErrors.displayOrder}</span>}
                </div>

                <div className="form-group">
                  <label>Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className={formErrors.image ? 'error' : ''}
                  />
                  {formErrors.image && <span className="field-error">{formErrors.image}</span>}
                  <small>Max size: 5MB. Supported formats: JPEG, PNG, GIF</small>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  Active (Visible to users)
                </label>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCard(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="add-card-btn"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingCard ? 'Update Card' : 'Create Card')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 