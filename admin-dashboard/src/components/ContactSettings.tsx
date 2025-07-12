import React, { useState, useEffect } from 'react';
import './ContactSettings.css';

interface ContactSettings {
  id?: number;
  type: 'phone' | 'email' | 'link';
  value: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function ContactSettings() {
  const [settings, setSettings] = useState<ContactSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'phone' | 'email' | 'link'>('phone');
  const [value, setValue] = useState('');

  useEffect(() => {
    fetchContactSettings();
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

  const fetchContactSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/contact/admin/contact-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings(data.data);
          setType(data.data.type);
          setValue(data.data.value);
        }
      } else {
        setError('Failed to fetch contact settings');
      }
    } catch (error) {
      setError('Error loading contact settings');
      console.error('Error fetching contact settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!value.trim()) {
      setError('Please enter a value');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3000/api/contact/admin/contact-settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, value: value.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Contact settings updated successfully');
        setSettings(data.data);
      } else {
        setError(data.message || 'Failed to update settings');
      }
    } catch (error) {
      setError('Failed to save settings');
      console.error('Error saving contact settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return '📞';
      case 'email':
        return '✉️';
      case 'link':
        return '🔗';
      default:
        return '❓';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'phone':
        return 'Phone Number';
      case 'email':
        return 'Email Address';
      case 'link':
        return 'Website Link';
      default:
        return 'Unknown';
    }
  };

  const getPreviewText = () => {
    if (!value.trim()) return 'No value set';
    switch (type) {
      case 'phone':
        return `Will open phone dialer with: ${value}`;
      case 'email':
        return `Will open email client with: ${value}`;
      case 'link':
        return `Will open browser with: ${value}`;
      default:
        return 'Invalid type';
    }
  };

  if (loading) {
    return <div className="loading">Loading contact settings...</div>;
  }

  return (
    <div className="contact-settings">
      <div className="page-header">
        <h2>Contact Settings</h2>
        <div className="header-actions">
          <button onClick={fetchContactSettings} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          <span>✅</span>
          {success}
        </div>
      )}

      <div className="contact-overview">
        <div className="overview-stats">
          <div className="stat-card">
            <div className="stat-icon">⚙️</div>
            <div className="stat-content">
              <h3>Contact Type</h3>
              <p className="stat-number">
                {settings ? getTypeLabel(settings.type) : 'Not Set'}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📱</div>
            <div className="stat-content">
              <h3>Mobile App</h3>
              <p className="stat-number">
                {settings?.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <h3>Last Updated</h3>
              <p className="stat-number">
                {settings?.updated_at ? new Date(settings.updated_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="contact-content">
        <div className="current-settings-section">
          <h3>Current Configuration</h3>
          {settings ? (
            <div className="settings-card">
              <div className="setting-item">
                <div className="setting-icon">{getTypeIcon(settings.type)}</div>
                <div className="setting-info">
                  <div className="setting-label">Contact Type</div>
                  <div className="setting-value">{getTypeLabel(settings.type)}</div>
                </div>
              </div>
              <div className="setting-item">
                <div className="setting-icon">ℹ️</div>
                <div className="setting-info">
                  <div className="setting-label">Contact Value</div>
                  <div className="setting-value">{settings.value}</div>
                </div>
              </div>
              <div className="setting-item">
                <div className="setting-icon">{settings.is_active ? '✅' : '⏸️'}</div>
                <div className="setting-info">
                  <div className="setting-label">Status</div>
                  <div className="setting-value" style={{ color: settings.is_active ? '#28a745' : '#6c757d' }}>
                    {settings.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <h3>No Contact Settings</h3>
              <p>Configure contact settings below to enable the contact button in the mobile app.</p>
            </div>
          )}
        </div>

        <div className="update-settings-section">
          <h3>Update Settings</h3>
          <div className="settings-form">
            <div className="form-group">
              <label>Contact Type</label>
              <div className="type-selector">
                {(['phone', 'email', 'link'] as const).map((option) => (
                  <button
                    key={option}
                    className={`type-option${type === option ? ' active' : ''}`}
                    onClick={() => setType(option)}
                    type="button"
                  >
                    <span className="type-icon">{getTypeIcon(option)}</span>
                    <span className="type-label">{getTypeLabel(option)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Contact Value</label>
              <input
                className="form-input"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={
                  type === 'phone' ? 'Enter phone number (e.g., +1234567890)' :
                  type === 'email' ? 'Enter email address (e.g., support@cyclebees.com)' :
                  'Enter website URL (e.g., https://cyclebees.com)'
                }
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div className="preview-section">
              <div className="preview-label">Preview</div>
              <div className="preview-text">{getPreviewText()}</div>
            </div>

            <div className="form-actions">
              <button
                className="submit-btn"
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 