import React, { useState, useEffect } from 'react';
import './PromotionalCards.css';

interface PromotionalCard {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  externalLink: string;
  displayOrder: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export default function PromotionalCards() {
  const [cards, setCards] = useState<PromotionalCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<PromotionalCard | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    externalLink: '',
    displayOrder: 1,
    startsAt: '',
    endsAt: '',
    isActive: true,
    image: null as File | null
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/promotional/admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCards(Array.isArray(data.data?.cards) ? data.data.cards : []);
      }
    } catch (error) {
      console.error('Error fetching promotional cards:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('externalLink', formData.externalLink);
      formDataToSend.append('displayOrder', formData.displayOrder.toString());
      formDataToSend.append('startsAt', formData.startsAt);
      formDataToSend.append('endsAt', formData.endsAt);
      formDataToSend.append('isActive', formData.isActive.toString());
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const url = editingCard 
        ? `http://localhost:3000/api/promotional/admin/${editingCard.id}`
        : 'http://localhost:3000/api/promotional/admin';
      
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend
      });

      if (response.ok) {
        alert(editingCard ? 'Card updated successfully!' : 'Card created successfully!');
        setShowForm(false);
        setEditingCard(null);
        resetForm();
        fetchCards();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save card');
      }
    } catch (error) {
      alert('Network error. Please try again.');
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
      startsAt: card.startsAt,
      endsAt: card.endsAt,
      isActive: card.isActive,
      image: null
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this promotional card?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3000/api/promotional/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Card deleted successfully!');
        fetchCards();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete card');
      }
    } catch (error) {
      alert('Network error. Please try again.');
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
      startsAt: '',
      endsAt: '',
      isActive: true,
      image: null
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, image: e.target.files[0] });
    }
  };

  return (
    <div className="promotional-cards">
      <div className="promotional-cards-header">
        <h2>Promotional Cards Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingCard(null);
            resetForm();
          }}
        >
          Add New Card
        </button>
      </div>

      {showForm && (
        <div className="form-overlay">
          <div className="form-modal">
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
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter card title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter card description"
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>External Link (Optional)</label>
                <input
                  type="url"
                  value={formData.externalLink}
                  onChange={(e) => setFormData({...formData, externalLink: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value)})}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({...formData, startsAt: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.endsAt}
                    onChange={(e) => setFormData({...formData, endsAt: e.target.value})}
                  />
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
                  className="btn btn-secondary"
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
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (editingCard ? 'Update Card' : 'Create Card')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="cards-grid">
        {loading ? (
          <div className="loading">Loading promotional cards...</div>
        ) : cards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📢</div>
            <h3>No Promotional Cards</h3>
            <p>Create your first promotional card to display on the mobile app home screen.</p>
            <button 
              className="btn btn-primary"
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
          cards.map((card) => (
            <div key={card.id} className="card-item">
              <div className="card-image">
                {card.imageUrl ? (
                  <img 
                    src={`http://localhost:3000/${card.imageUrl}`} 
                    alt={card.title}
                  />
                ) : (
                  <div className="no-image">No Image</div>
                )}
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
                      <a href={card.externalLink} target="_blank" rel="noopener noreferrer" className="detail-link">
                        View Link
                      </a>
                    </div>
                  )}
                  
                  <div className="detail-item">
                    <span className="detail-label">Schedule:</span>
                    <span className="detail-value">
                      {card.startsAt} to {card.endsAt}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(card)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(card.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 