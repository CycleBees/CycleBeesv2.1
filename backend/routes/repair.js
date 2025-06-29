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

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/repair-requests');
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
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 6 // Max 6 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed!'));
        }
    }
});

// ==================== ADMIN ROUTES ====================

// 1. Get all repair requests (Admin)
router.get('/admin/requests', authenticateToken, requireAdmin, (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
        SELECT 
            rr.*,
            u.full_name as user_name,
            u.phone as user_phone,
            ts.start_time,
            ts.end_time
        FROM repair_requests rr
        LEFT JOIN users u ON rr.user_id = u.id
        LEFT JOIN time_slots ts ON rr.time_slot_id = ts.id
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
            console.error('Error fetching repair requests:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair requests'
            });
        }
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM repair_requests';
        if (status) {
            countQuery += ' WHERE status = ?';
        }
        
        db.get(countQuery, status ? [status] : [], (err, countResult) => {
            if (err) {
                console.error('Error counting repair requests:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to count repair requests'
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

// 2. Update repair request status (Admin)
router.patch('/admin/requests/:id/status', authenticateToken, requireAdmin, [
    body('status').isIn(['approved', 'waiting_payment', 'active', 'completed', 'expired']).withMessage('Invalid status')
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
        'UPDATE repair_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
            if (err) {
                console.error('Error updating repair request status:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update repair request status'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Repair request not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Repair request status updated successfully'
            });
        }
    );
});

// 3. Get repair services (Admin)
router.get('/admin/services', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT * FROM repair_services ORDER BY name', (err, services) => {
        if (err) {
            console.error('Error fetching repair services:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair services'
            });
        }
        
        res.json({
            success: true,
            data: services
        });
    });
});

// 4. Create repair service (Admin)
router.post('/admin/services', authenticateToken, requireAdmin, [
    body('name').notEmpty().withMessage('Service name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('description').optional(),
    body('special_instructions').optional()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const { name, description, special_instructions, price } = req.body;
    
    db.run(
        'INSERT INTO repair_services (name, description, special_instructions, price) VALUES (?, ?, ?, ?)',
        [name, description, special_instructions, price],
        function(err) {
            if (err) {
                console.error('Error creating repair service:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create repair service'
                });
            }
            
            res.status(201).json({
                success: true,
                message: 'Repair service created successfully',
                data: { id: this.lastID }
            });
        }
    );
});

// 5. Update repair service (Admin)
router.put('/admin/services/:id', authenticateToken, requireAdmin, [
    body('name').notEmpty().withMessage('Service name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
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
    const { name, description, special_instructions, price } = req.body;
    
    db.run(
        'UPDATE repair_services SET name = ?, description = ?, special_instructions = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, special_instructions, price, id],
        function(err) {
            if (err) {
                console.error('Error updating repair service:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update repair service'
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Repair service not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Repair service updated successfully'
            });
        }
    );
});

// 6. Delete repair service (Admin)
router.delete('/admin/services/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM repair_services WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting repair service:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete repair service'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Repair service not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Repair service deleted successfully'
        });
    });
});

// 7. Get service mechanic charge (Admin)
router.get('/admin/mechanic-charge', authenticateToken, requireAdmin, (req, res) => {
    db.get('SELECT * FROM service_mechanic_charge WHERE is_active = 1 ORDER BY id DESC LIMIT 1', (err, charge) => {
        if (err) {
            console.error('Error fetching mechanic charge:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch mechanic charge'
            });
        }
        
        res.json({
            success: true,
            data: { charge: charge?.amount || 0 }
        });
    });
});

// 8. Update service mechanic charge (Admin)
router.put('/admin/mechanic-charge', authenticateToken, requireAdmin, [
    body('charge').isFloat({ min: 0 }).withMessage('Valid charge is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const { charge } = req.body;
    
    // Deactivate current active charge
    db.run('UPDATE service_mechanic_charge SET is_active = 0', (err) => {
        if (err) {
            console.error('Error deactivating current charge:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update mechanic charge'
            });
        }
        
        // Create new charge
        db.run('INSERT INTO service_mechanic_charge (amount, is_active) VALUES (?, 1)', [charge], function(err) {
            if (err) {
                console.error('Error creating new charge:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update mechanic charge'
                });
            }
            
            res.json({
                success: true,
                message: 'Mechanic charge updated successfully',
                data: { id: this.lastID, charge }
            });
        });
    });
});

// 9. Get time slots (Admin)
router.get('/admin/time-slots', authenticateToken, requireAdmin, (req, res) => {
    db.all('SELECT * FROM time_slots ORDER BY start_time', (err, slots) => {
        if (err) {
            console.error('Error fetching time slots:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch time slots'
            });
        }
        
        res.json({
            success: true,
            data: slots
        });
    });
});

// 10. Create time slot (Admin)
router.post('/admin/time-slots', authenticateToken, requireAdmin, [
    body('start_time').notEmpty().withMessage('Start time is required'),
    body('end_time').notEmpty().withMessage('End time is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }
    
    const { start_time, end_time } = req.body;
    
    db.run(
        'INSERT INTO time_slots (start_time, end_time, is_active) VALUES (?, ?, 1)',
        [start_time, end_time],
        function(err) {
            if (err) {
                console.error('Error creating time slot:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create time slot'
                });
            }
            
            res.status(201).json({
                success: true,
                message: 'Time slot created successfully',
                data: { id: this.lastID }
            });
        }
    );
});

// 11. Delete time slot (Admin)
router.delete('/admin/time-slots/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM time_slots WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting time slot:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete time slot'
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Time slot not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Time slot deleted successfully'
        });
    });
});

// ==================== USER ROUTES ====================

// 1. Get available repair services (User)
router.get('/services', (req, res) => {
    db.all('SELECT * FROM repair_services WHERE is_active = 1 ORDER BY name', (err, services) => {
        if (err) {
            console.error('Error fetching repair services:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair services'
            });
        }
        
        res.json({
            success: true,
            data: services
        });
    });
});

// 2. Get available time slots (User)
router.get('/time-slots', (req, res) => {
    db.all('SELECT * FROM time_slots WHERE is_active = 1 ORDER BY start_time', (err, slots) => {
        if (err) {
            console.error('Error fetching time slots:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch time slots'
            });
        }
        
        res.json({
            success: true,
            data: slots
        });
    });
});

// 3. Get service mechanic charge (User)
router.get('/mechanic-charge', (req, res) => {
    db.get('SELECT * FROM service_mechanic_charge WHERE is_active = 1 ORDER BY id DESC LIMIT 1', (err, charge) => {
        if (err) {
            console.error('Error fetching mechanic charge:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch mechanic charge'
            });
        }
        
        res.json({
            success: true,
            data: charge
        });
    });
});

// 4. Create repair request (User)
router.post('/requests', authenticateToken, requireUser, upload.array('files', 6), [
    body('contactNumber').isLength({ min: 10, max: 10 }).withMessage('Valid contact number is required'),
    body('preferredDate').isDate().withMessage('Valid preferred date is required'),
    body('timeSlotId').isInt().withMessage('Valid time slot is required'),
    body('paymentMethod').isIn(['online', 'offline']).withMessage('Valid payment method is required'),
    body('services').isArray().withMessage('Services array is required'),
    body('services.*.serviceId').isInt().withMessage('Valid service ID is required'),
    body('services.*.price').isFloat({ min: 0 }).withMessage('Valid service price is required')
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
        contactNumber,
        alternateNumber,
        email,
        notes,
        preferredDate,
        timeSlotId,
        paymentMethod,
        services,
        totalAmount
    } = req.body;
    
    // Calculate expiry time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    db.run(
        `INSERT INTO repair_requests (
            user_id, contact_number, alternate_number, email, notes, 
            preferred_date, time_slot_id, total_amount, payment_method, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.user.userId, contactNumber, alternateNumber, email, notes,
            preferredDate, timeSlotId, totalAmount, paymentMethod, expiresAt.toISOString()
        ],
        function(err) {
            if (err) {
                console.error('Error creating repair request:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create repair request'
                });
            }
            
            const requestId = this.lastID;
            
            // Insert selected services
            const serviceValues = services.map(service => 
                [requestId, service.serviceId, service.price, service.discountAmount || 0]
            );
            
            const serviceQuery = 'INSERT INTO repair_request_services (repair_request_id, repair_service_id, price, discount_amount) VALUES (?, ?, ?, ?)';
            
            // Insert services one by one
            let completed = 0;
            services.forEach((service, index) => {
                db.run(serviceQuery, [requestId, service.serviceId, service.price, service.discountAmount || 0], (err) => {
                    if (err) {
                        console.error('Error inserting service:', err);
                    }
                    completed++;
                    
                    if (completed === services.length) {
                        // Handle file uploads
                        if (req.files && req.files.length > 0) {
                            const fileValues = req.files.map((file, index) => {
                                const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
                                return [requestId, `/uploads/repair-requests/${file.filename}`, fileType, index];
                            });
                            
                            const fileQuery = 'INSERT INTO repair_request_files (repair_request_id, file_url, file_type, display_order) VALUES (?, ?, ?, ?)';
                            
                            let filesCompleted = 0;
                            fileValues.forEach((fileValue, index) => {
                                db.run(fileQuery, fileValue, (err) => {
                                    if (err) {
                                        console.error('Error inserting file:', err);
                                    }
                                    filesCompleted++;
                                    
                                    if (filesCompleted === fileValues.length) {
                                        res.status(201).json({
                                            success: true,
                                            message: 'Repair request created successfully',
                                            data: { requestId }
                                        });
                                    }
                                });
                            });
                        } else {
                            res.status(201).json({
                                success: true,
                                message: 'Repair request created successfully',
                                data: { requestId }
                            });
                        }
                    }
                });
            });
        }
    );
});

// 5. Get user's repair requests (User)
router.get('/requests', authenticateToken, requireUser, (req, res) => {
    const { status } = req.query;
    
    let query = `
        SELECT 
            rr.*,
            ts.start_time,
            ts.end_time
        FROM repair_requests rr
        LEFT JOIN time_slots ts ON rr.time_slot_id = ts.id
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
            console.error('Error fetching user repair requests:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair requests'
            });
        }
        
        res.json({
            success: true,
            data: requests
        });
    });
});

// 6. Get repair request details (User)
router.get('/requests/:id', authenticateToken, requireUser, (req, res) => {
    const { id } = req.params;
    
    // Get request details
    db.get(
        `SELECT 
            rr.*,
            ts.start_time,
            ts.end_time
        FROM repair_requests rr
        LEFT JOIN time_slots ts ON rr.time_slot_id = ts.id
        WHERE rr.id = ? AND rr.user_id = ?`,
        [id, req.user.userId],
        (err, request) => {
            if (err) {
                console.error('Error fetching repair request:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch repair request'
                });
            }
            
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Repair request not found'
                });
            }
            
            // Get services for this request
            db.all(
                `SELECT 
                    rrs.*,
                    rs.name,
                    rs.description,
                    rs.special_instructions
                FROM repair_request_services rrs
                LEFT JOIN repair_services rs ON rrs.repair_service_id = rs.id
                WHERE rrs.repair_request_id = ?`,
                [id],
                (err, services) => {
                    if (err) {
                        console.error('Error fetching request services:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to fetch request services'
                        });
                    }
                    
                    // Get files for this request
                    db.all(
                        'SELECT * FROM repair_request_files WHERE repair_request_id = ? ORDER BY display_order',
                        [id],
                        (err, files) => {
                            if (err) {
                                console.error('Error fetching request files:', err);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Failed to fetch request files'
                                });
                            }
                            
                            res.json({
                                success: true,
                                data: {
                                    ...request,
                                    services,
                                    files
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});

module.exports = router; 