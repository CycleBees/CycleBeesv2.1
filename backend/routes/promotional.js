const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Database connection
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database/cyclebees.db';
const db = new sqlite3.Database(dbPath);

// Helper function to transform snake_case to camelCase
const transformToCamelCase = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(transformToCamelCase);
    }
    if (obj && typeof obj === 'object') {
        const transformed = {};
        Object.keys(obj).forEach(key => {
            const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            transformed[camelKey] = transformToCamelCase(obj[key]);
        });
        return transformed;
    }
    return obj;
};

// Configure multer for promotional card image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/promotional');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'promo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // 1 image per card
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// ==================== ADMIN ROUTES ====================

// 1. List all promotional cards (Admin)
router.get('/admin', authenticateToken, requireAdmin, (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM promotional_cards';
    let countQuery = 'SELECT COUNT(*) as total FROM promotional_cards';
    const params = [];
    const countParams = [];
    
    if (search) {
        query += ' WHERE title LIKE ? OR description LIKE ?';
        countQuery += ' WHERE title LIKE ? OR description LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
        countParams.push(searchParam, searchParam);
    }
    
    query += ' ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    // Get total count
    db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error('Error counting promotional cards:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to count promotional cards'
            });
        }
        
        // Get cards
        db.all(query, params, (err, cards) => {
            if (err) {
                console.error('Error fetching promotional cards:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch promotional cards'
                });
            }
            
            res.json({
                success: true,
                data: {
                    cards: transformToCamelCase(cards),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: countResult.total,
                        pages: Math.ceil(countResult.total / limit)
                    }
                }
            });
        });
    });
});

// 2. Get promotional card details (Admin)
router.get('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM promotional_cards WHERE id = ?', [id], (err, card) => {
        if (err) {
            console.error('Error fetching promotional card:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch promotional card'
            });
        }
        
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Promotional card not found'
            });
        }
        
        res.json({
            success: true,
            data: transformToCamelCase(card)
        });
    });
});

// 3. Create promotional card (Admin)
router.post('/admin', authenticateToken, requireAdmin, upload.single('image'), [
    body('title').notEmpty().trim().withMessage('Title is required and cannot be empty'),
    body('description').optional().trim(),
    body('externalLink').optional().custom((value) => {
        if (!value || value === '') return true; // Allow empty strings
        
        // Check if it's an internal route (starts with /)
        if (value.startsWith('/')) {
            return true;
        }
        
        // Check if it's a valid external URL
        try {
            new URL(value);
            return true;
        } catch {
            throw new Error('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)');
        }
    }).withMessage('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)'),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a positive integer'),
    body('isActive').optional().custom((value) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        throw new Error('isActive must be a boolean');
    }).withMessage('isActive must be a boolean')
], (req, res) => {
    console.log('Received promotional card data:', req.body);
    console.log('Files:', req.file);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const {
        title,
        description,
        externalLink,
        displayOrder = 0,
        isActive = true
    } = req.body;
    
    // Convert string boolean to actual boolean
    const isActiveBool = isActive === 'true' || isActive === true;
    
    const imageUrl = req.file ? `/uploads/promotional/${req.file.filename}` : null;
    
    db.run(
        `INSERT INTO promotional_cards (
            title, description, image_url, external_link, display_order, 
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            title, description, imageUrl, externalLink, displayOrder,
            isActiveBool ? 1 : 0
        ],
        function(err) {
            if (err) {
                console.error('Error creating promotional card:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create promotional card',
                    error: err.message
                });
            }
            
            res.status(201).json({
                success: true,
                message: 'Promotional card created successfully',
                data: { 
                    id: this.lastID,
                    imageUrl: imageUrl
                }
            });
        }
    );
});

// 4. Update promotional card (Admin)
router.put('/admin/:id', authenticateToken, requireAdmin, upload.single('image'), [
    body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
    body('description').optional().trim(),
    body('externalLink').optional().custom((value) => {
        if (!value || value === '') return true; // Allow empty strings
        
        // Check if it's an internal route (starts with /)
        if (value.startsWith('/')) {
            return true;
        }
        
        // Check if it's a valid external URL
        try {
            new URL(value);
            return true;
        } catch {
            throw new Error('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)');
        }
    }).withMessage('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)'),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a positive integer'),
    body('isActive').optional().custom((value) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        throw new Error('isActive must be a boolean');
    }).withMessage('isActive must be a boolean')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const { id } = req.params;
    const {
        title,
        description,
        externalLink,
        displayOrder,
        isActive
    } = req.body;
    
    // Build update query dynamically
    const fields = [];
    const values = [];
    
    if (title !== undefined) {
        fields.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        fields.push('description = ?');
        values.push(description);
    }
    if (externalLink !== undefined) {
        fields.push('external_link = ?');
        values.push(externalLink);
    }
    if (displayOrder !== undefined) {
        fields.push('display_order = ?');
        values.push(displayOrder);
    }
    if (isActive !== undefined) {
        fields.push('is_active = ?');
        const isActiveBool = isActive === 'true' || isActive === true;
        values.push(isActiveBool ? 1 : 0);
    }
    
    // Handle image upload
    if (req.file) {
        fields.push('image_url = ?');
        values.push(`/uploads/promotional/${req.file.filename}`);
    }
    
    if (fields.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No valid fields to update'
        });
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    db.run(
        `UPDATE promotional_cards SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                console.error('Error updating promotional card:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update promotional card',
                    error: err.message
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Promotional card not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Promotional card updated successfully',
                data: { 
                    imageUrl: req.file ? `/uploads/promotional/${req.file.filename}` : null
                }
            });
        }
    );
});

// 5. Delete promotional card (Admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    // First get the card to delete the image file
    db.get('SELECT image_url FROM promotional_cards WHERE id = ?', [id], (err, card) => {
        if (err) {
            console.error('Error fetching promotional card:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch promotional card'
            });
        }
        
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Promotional card not found'
            });
        }
        
        // Delete the card from database
        db.run('DELETE FROM promotional_cards WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Error deleting promotional card:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete promotional card'
                });
            }
            
            // Delete image file if exists
            if (card.image_url) {
                const imagePath = path.join(__dirname, '..', card.image_url);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            
            res.json({
                success: true,
                message: 'Promotional card deleted successfully'
            });
        });
    });
});

// ==================== USER ROUTES ====================

// 1. Get active promotional cards (User)
router.get('/cards', (req, res) => {
    db.all(`
        SELECT 
            id, title, description, image_url, external_link, display_order
        FROM promotional_cards 
        WHERE is_active = 1 
        ORDER BY display_order ASC, created_at DESC
    `, (err, cards) => {
        if (err) {
            console.error('Error fetching active promotional cards:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch promotional cards'
            });
        }
        
        res.json({
            success: true,
            data: transformToCamelCase(cards)
        });
    });
});

module.exports = router; 