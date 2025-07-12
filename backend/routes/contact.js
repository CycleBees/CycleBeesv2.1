const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/contact/settings - Get current contact settings (public)
router.get('/settings', async (req, res) => {
  try {
    const query = `
      SELECT type, value, is_active 
      FROM contact_settings 
      WHERE is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    db.get(query, (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }
      
      if (!row) {
        return res.json({
          success: true,
          data: null,
          message: 'No contact settings configured'
        });
      }
      
      res.json({
        success: true,
        data: {
          type: row.type,
          value: row.value,
          is_active: row.is_active
        }
      });
    });
  } catch (error) {
    console.error('Contact settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/admin/contact-settings - Get contact settings (admin only)
router.get('/admin/contact-settings', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    const query = `
      SELECT id, type, value, is_active, created_at, updated_at
      FROM contact_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    db.get(query, (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }
      
      res.json({
        success: true,
        data: row || null
      });
    });
  } catch (error) {
    console.error('Admin contact settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/admin/contact-settings - Update contact settings (admin only)
router.post('/admin/contact-settings', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    const { type, value } = req.body;
    
    // Validation
    if (!type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Type and value are required'
      });
    }
    
    if (!['phone', 'email', 'link'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be phone, email, or link'
      });
    }
    
    // Validate based on type
    if (type === 'phone') {
      // Basic phone validation
      if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(value)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
    } else if (type === 'email') {
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
    } else if (type === 'link') {
      // Basic URL validation
      try {
        new URL(value);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
      }
    }
    
    // Deactivate all existing settings
    const deactivateQuery = `UPDATE contact_settings SET is_active = 0`;
    
    db.run(deactivateQuery, function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }
      
      // Insert new setting
      const insertQuery = `
        INSERT INTO contact_settings (type, value, is_active) 
        VALUES (?, ?, 1)
      `;
      
      db.run(insertQuery, [type, value], function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error occurred'
          });
        }
        
        res.json({
          success: true,
          message: 'Contact settings updated successfully',
          data: {
            id: this.lastID,
            type,
            value,
            is_active: 1
          }
        });
      });
    });
  } catch (error) {
    console.error('Update contact settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 