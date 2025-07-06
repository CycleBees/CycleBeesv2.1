const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Database connection
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database/cyclebees.db';
const db = new sqlite3.Database(dbPath);

// Configure multer for bicycle photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/bicycles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Max 5 photos per bicycle
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

// 1. Get all rental requests (Admin)
router.get('/admin/requests', authenticateToken, requireAdmin, (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            rr.*,
            u.full_name as user_name,
            u.phone as user_phone,
            b.name as bicycle_name,
            b.model as bicycle_model,
            b.delivery_charge,
            c.code as coupon_code,
            c.discount_type as coupon_discount_type,
            c.discount_value as coupon_discount_value,
            cu.discount_amount as coupon_discount_amount,
            (rr.total_amount - COALESCE(cu.discount_amount, 0)) as net_amount
        FROM rental_requests rr
        LEFT JOIN users u ON rr.user_id = u.id
        LEFT JOIN bicycles b ON rr.bicycle_id = b.id
        LEFT JOIN coupon_usage cu ON cu.request_type = 'rental' AND cu.request_id = rr.id
        LEFT JOIN coupons c ON cu.coupon_id = c.id
    `;
    
    const params = [];
    if (status) {
        query += ' WHERE rr.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY rr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    db.all(query, params, (err, requests) => {
        if (err) {
            console.error('Error fetching rental requests:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental requests'
            });
        }
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM rental_requests';
        if (status) {
            countQuery += ' WHERE status = ?';
        }
        
        db.get(countQuery, status ? [status] : [], (err, countResult) => {
            if (err) {
                console.error('Error counting rental requests:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to count rental requests'
                });
            }
            
            res.json({
                success: true,
                data: {
                    requests,
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

// 2. Update rental request status (Admin)
router.patch('/admin/requests/:id/status', authenticateToken, requireAdmin, [
    body('status').isIn(['waiting_payment', 'arranging_delivery', 'active_rental', 'completed', 'expired']).withMessage('Invalid status')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    db.run(
        'UPDATE rental_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
            if (err) {
                console.error('Error updating rental request status:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update rental request status'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Rental request not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Rental request status updated successfully'
            });
        }
    );
});

// 2.5. Delete rental request (Admin)
router.delete('/admin/requests/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    // First check if the request exists
    db.get('SELECT * FROM rental_requests WHERE id = ?', [id], (err, request) => {
        if (err) {
            console.error('Error checking rental request:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to check rental request'
            });
        }
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Rental request not found'
            });
        }
        
        // Delete the request
        db.run('DELETE FROM rental_requests WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Error deleting rental request:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete rental request'
                });
            }
            
            res.json({
                success: true,
                message: 'Rental request deleted successfully'
            });
        });
    });
});

// 3. Get all bicycles (Admin)
router.get('/admin/bicycles', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT * FROM bicycles ORDER BY name', (err, bicycles) => {
        if (err) {
            console.error('Error fetching bicycles:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycles'
            });
        }
        
        // Get photos for each bicycle
        const bicyclesWithPhotos = [];
        let completed = 0;
        
        if (bicycles.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        bicycles.forEach((bicycle, index) => {
            db.all('SELECT * FROM bicycle_photos WHERE bicycle_id = ? ORDER BY display_order', [bicycle.id], (err, photos) => {
                if (err) {
                    console.error('Error fetching photos for bicycle:', bicycle.id, err);
                }
                
                bicyclesWithPhotos[index] = {
                    ...bicycle,
                    photos: photos ? photos.map(p => p.photo_url) : []
                };
                
                completed++;
                
                if (completed === bicycles.length) {
                    res.json({
                        success: true,
                        data: bicyclesWithPhotos
                    });
                }
            });
        });
    });
});

// 4. Create bicycle (Admin)
router.post('/admin/bicycles', authenticateToken, requireAdmin, upload.array('photos', 5), [
    body('name').notEmpty().withMessage('Bicycle name is required'),
    body('dailyRate').isFloat({ min: 0 }).withMessage('Valid daily rate is required'),
    body('weeklyRate').isFloat({ min: 0 }).withMessage('Valid weekly rate is required'),
    body('deliveryCharge').isFloat({ min: 0 }).withMessage('Valid delivery charge is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const {
        name,
        model,
        description,
        specialInstructions,
        dailyRate,
        weeklyRate,
        deliveryCharge,
        specifications
    } = req.body;
    
    db.run(
        `INSERT INTO bicycles (
            name, model, description, special_instructions, 
            daily_rate, weekly_rate, delivery_charge, specifications
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name, model, description, specialInstructions,
            dailyRate, weeklyRate, deliveryCharge, specifications
        ],
        function(err) {
            if (err) {
                console.error('Error creating bicycle:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create bicycle'
                });
            }
            
            const bicycleId = this.lastID;
            
            // Handle photo uploads
            if (req.files && req.files.length > 0) {
                const photoValues = req.files.map((file, index) => {
                    return [bicycleId, `/uploads/bicycles/${file.filename}`, index];
                });
                
                const photoQuery = 'INSERT INTO bicycle_photos (bicycle_id, photo_url, display_order) VALUES (?, ?, ?)';
                
                let photosCompleted = 0;
                photoValues.forEach((photoValue, index) => {
                    db.run(photoQuery, photoValue, (err) => {
                        if (err) {
                            console.error('Error inserting photo:', err);
                        }
                        photosCompleted++;
                        
                        if (photosCompleted === photoValues.length) {
                            res.status(201).json({
                                success: true,
                                message: 'Bicycle created successfully',
                                data: { 
                                    id: bicycleId,
                                    photosCount: req.files.length
                                }
                            });
                        }
                    });
                });
            } else {
                res.status(201).json({
                    success: true,
                    message: 'Bicycle created successfully',
                    data: { id: bicycleId }
                });
            }
        }
    );
});

// 5. Update bicycle (Admin)
router.put('/admin/bicycles/:id', authenticateToken, requireAdmin, upload.array('photos', 5), [
    body('name').notEmpty().withMessage('Bicycle name is required'),
    body('dailyRate').isFloat({ min: 0 }).withMessage('Valid daily rate is required'),
    body('weeklyRate').isFloat({ min: 0 }).withMessage('Valid weekly rate is required'),
    body('deliveryCharge').isFloat({ min: 0 }).withMessage('Valid delivery charge is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const { id } = req.params;
    const {
        name,
        model,
        description,
        specialInstructions,
        dailyRate,
        weeklyRate,
        deliveryCharge,
        specifications
    } = req.body;
    
    db.run(
        `UPDATE bicycles SET 
            name = ?, model = ?, description = ?, special_instructions = ?,
            daily_rate = ?, weekly_rate = ?, delivery_charge = ?, specifications = ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [
            name, model, description, specialInstructions,
            dailyRate, weeklyRate, deliveryCharge, specifications, id
        ],
        function(err) {
            if (err) {
                console.error('Error updating bicycle:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update bicycle'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Bicycle not found'
                });
            }
            
            // Handle new photo uploads
            if (req.files && req.files.length > 0) {
                const photoValues = req.files.map((file, index) => {
                    return [id, `/uploads/bicycles/${file.filename}`, index];
                });
                
                const photoQuery = 'INSERT INTO bicycle_photos (bicycle_id, photo_url, display_order) VALUES (?, ?, ?)';
                
                let photosCompleted = 0;
                photoValues.forEach((photoValue, index) => {
                    db.run(photoQuery, photoValue, (err) => {
                        if (err) {
                            console.error('Error inserting photo:', err);
                        }
                        photosCompleted++;
                        
                        if (photosCompleted === photoValues.length) {
                            res.json({
                                success: true,
                                message: 'Bicycle updated successfully',
                                data: { photosAdded: req.files.length }
                            });
                        }
                    });
                });
            } else {
                res.json({
                    success: true,
                    message: 'Bicycle updated successfully'
                });
            }
        }
    );
});

// 6. Delete bicycle (Admin)
router.delete('/admin/bicycles/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM bicycles WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting bicycle:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete bicycle'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Bicycle not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Bicycle deleted successfully'
        });
    });
});

// 7. Get bicycle details with photos (Admin)
router.get('/admin/bicycles/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM bicycles WHERE id = ?', [id], (err, bicycle) => {
        if (err) {
            console.error('Error fetching bicycle:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycle'
            });
        }
        
        if (!bicycle) {
            return res.status(404).json({
                success: false,
                message: 'Bicycle not found'
            });
        }
        
        // Get photos for this bicycle
        db.all('SELECT * FROM bicycle_photos WHERE bicycle_id = ? ORDER BY display_order', [id], (err, photos) => {
            if (err) {
                console.error('Error fetching bicycle photos:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch bicycle photos'
                });
            }
            
            res.json({
                success: true,
                data: {
                    ...bicycle,
                    photos
                }
            });
        });
    });
});

// ==================== USER ROUTES ====================

// 1. Get available bicycles (User)
router.get('/bicycles', (req, res) => {
    db.all('SELECT * FROM bicycles WHERE is_available = 1 ORDER BY name', (err, bicycles) => {
        if (err) {
            console.error('Error fetching bicycles:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycles'
            });
        }
        
        // Get photos for each bicycle
        const bicyclesWithPhotos = [];
        let completed = 0;
        
        if (bicycles.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        bicycles.forEach((bicycle, index) => {
            db.all('SELECT * FROM bicycle_photos WHERE bicycle_id = ? ORDER BY display_order', [bicycle.id], (err, photos) => {
                if (err) {
                    console.error('Error fetching photos for bicycle:', bicycle.id, err);
                }
                
                bicyclesWithPhotos[index] = {
                    ...bicycle,
                    photos: photos || []
                };
                
                completed++;
                
                if (completed === bicycles.length) {
                    res.json({
                        success: true,
                        data: bicyclesWithPhotos
                    });
                }
            });
        });
    });
});

// 2. Get bicycle details (User)
router.get('/bicycles/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM bicycles WHERE id = ? AND is_available = 1', [id], (err, bicycle) => {
        if (err) {
            console.error('Error fetching bicycle:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycle'
            });
        }
        
        if (!bicycle) {
            return res.status(404).json({
                success: false,
                message: 'Bicycle not found or not available'
            });
        }
        
        // Get photos for this bicycle
        db.all('SELECT * FROM bicycle_photos WHERE bicycle_id = ? ORDER BY display_order', [id], (err, photos) => {
            if (err) {
                console.error('Error fetching bicycle photos:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch bicycle photos'
                });
            }
            
            res.json({
                success: true,
                data: {
                    ...bicycle,
                    photos
                }
            });
        });
    });
});

// 3. Create rental request (User)
router.post('/requests', authenticateToken, requireUser, [
    body('bicycleId').isInt().withMessage('Valid bicycle ID is required'),
    body('contactNumber').isLength({ min: 10, max: 10 }).withMessage('Valid contact number is required'),
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
    body('durationType').isIn(['daily', 'weekly']).withMessage('Valid duration type is required'),
    body('durationCount').isInt({ min: 1 }).withMessage('Valid duration count is required'),
    body('paymentMethod').isIn(['online', 'offline']).withMessage('Valid payment method is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
    body('email').optional().isEmail().withMessage('Valid email format is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const {
        bicycleId,
        contactNumber,
        alternateNumber,
        email,
        deliveryAddress,
        specialInstructions,
        durationType,
        durationCount,
        paymentMethod,
        totalAmount,
        couponCode
    } = req.body;
    
    // Calculate expiry time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Start transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert rental request
        db.run(
            `INSERT INTO rental_requests (
                user_id, bicycle_id, contact_number, alternate_number, email, delivery_address,
                special_instructions, duration_type, duration_count, total_amount,
                payment_method, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.userId, bicycleId, contactNumber, alternateNumber || null, email || null, deliveryAddress,
                specialInstructions || null, durationType, durationCount, totalAmount,
                paymentMethod, expiresAt.toISOString()
            ],
            function(err) {
                if (err) {
                    console.error('Error creating rental request:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create rental request'
                    });
                }
                
                const requestId = this.lastID;
                
                // Apply coupon if provided
                if (couponCode) {
                    // Get coupon details
                    db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)', [couponCode], (err, coupon) => {
                        if (err) {
                            console.error('Error fetching coupon:', err);
                            db.run('ROLLBACK');
                            return res.status(500).json({
                                success: false,
                                message: 'Failed to apply coupon'
                            });
                        }
                        
                        if (!coupon) {
                            db.run('ROLLBACK');
                            return res.status(400).json({
                                success: false,
                                message: 'Invalid or expired coupon'
                            });
                        }
                        
                        // Check usage limit
                        if (coupon.used_count >= coupon.usage_limit) {
                            db.run('ROLLBACK');
                            return res.status(400).json({
                                success: false,
                                message: 'Coupon usage limit exceeded'
                            });
                        }
                        
                        // Check if user has already used this coupon
                        db.get('SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [coupon.id, req.user.userId], (err, usage) => {
                            if (err) {
                                console.error('Error checking coupon usage:', err);
                                db.run('ROLLBACK');
                                return res.status(500).json({
                                    success: false,
                                    message: 'Failed to check coupon usage'
                                });
                            }
                            
                            if (usage.count >= coupon.usage_limit) {
                                db.run('ROLLBACK');
                                return res.status(400).json({
                                    success: false,
                                    message: 'You have already used this coupon'
                                });
                            }
                            
                            // Calculate discount amount
                            let discountAmount = 0;
                            if (coupon.discount_type === 'percentage') {
                                discountAmount = (totalAmount * coupon.discount_value) / 100;
                                if (coupon.max_discount) {
                                    discountAmount = Math.min(discountAmount, coupon.max_discount);
                                }
                            } else {
                                discountAmount = coupon.discount_value;
                            }
                            
                            // Record coupon usage
                            db.run(
                                'INSERT INTO coupon_usage (coupon_id, user_id, request_type, request_id, discount_amount) VALUES (?, ?, ?, ?, ?)',
                                [coupon.id, req.user.userId, 'rental', requestId, discountAmount],
                                function(err) {
                                    if (err) {
                                        console.error('Error recording coupon usage:', err);
                                        db.run('ROLLBACK');
                                        return res.status(500).json({
                                            success: false,
                                            message: 'Failed to apply coupon'
                                        });
                                    }
                                    
                                    // Update coupon usage count
                                    db.run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id], (err) => {
                                        if (err) {
                                            console.error('Error updating coupon usage count:', err);
                                        }
                                        
                                        db.run('COMMIT');
                                        res.status(201).json({
                                            success: true,
                                            message: 'Rental request created successfully',
                                            data: { 
                                                requestId: requestId,
                                                discountApplied: discountAmount
                                            }
                                        });
                                    });
                                }
                            );
                        });
                    });
                } else {
                    // No coupon, just commit
                    db.run('COMMIT');
                    res.status(201).json({
                        success: true,
                        message: 'Rental request created successfully',
                        data: { requestId: requestId }
                    });
                }
            }
        );
    });
});

// 4. Get user's rental requests (User)
router.get('/requests', authenticateToken, requireUser, (req, res) => {
    const { status } = req.query;
    
    let query = `
        SELECT 
            rr.*,
            b.name as bicycle_name,
            b.model as bicycle_model,
            b.delivery_charge
        FROM rental_requests rr
        LEFT JOIN bicycles b ON rr.bicycle_id = b.id
        WHERE rr.user_id = ?
    `;
    
    const params = [req.user.userId];
    if (status) {
        query += ' AND rr.status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY rr.created_at DESC';
    
    db.all(query, params, (err, requests) => {
        if (err) {
            console.error('Error fetching user rental requests:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental requests'
            });
        }
        
        res.json({
            success: true,
            data: requests
        });
    });
});

// 5. Get rental request details (User)
router.get('/requests/:id', authenticateToken, requireUser, (req, res) => {
    const { id } = req.params;
    
    db.get(
        `SELECT 
            rr.*,
            b.name as bicycle_name,
            b.model as bicycle_model,
            b.description as bicycle_description,
            b.special_instructions as bicycle_instructions,
            b.specifications as bicycle_specifications
        FROM rental_requests rr
        LEFT JOIN bicycles b ON rr.bicycle_id = b.id
        WHERE rr.id = ? AND rr.user_id = ?`,
        [id, req.user.userId],
        (err, request) => {
            if (err) {
                console.error('Error fetching rental request:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch rental request'
                });
            }
            
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Rental request not found'
                });
            }
            
            // Get bicycle photos
            db.all('SELECT * FROM bicycle_photos WHERE bicycle_id = ? ORDER BY display_order', [request.bicycle_id], (err, photos) => {
                if (err) {
                    console.error('Error fetching bicycle photos:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch bicycle photos'
                    });
                }
                
                res.json({
                    success: true,
                    data: {
                        ...request,
                        bicycle_photos: photos
                    }
                });
            });
        }
    );
});

module.exports = router; 