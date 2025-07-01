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
        fileSize: 50 * 1024 * 1024, // 50MB limit for videos
        files: 6 // Max 6 files (5 photos + 1 video)
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedImageTypes = /jpeg|jpg|png|gif/;
        const allowedVideoTypes = /mp4|avi|mov|mkv/;
        const extname = path.extname(file.originalname).toLowerCase();
        
        if (file.mimetype.startsWith('image/') && allowedImageTypes.test(extname)) {
            // Check photo count limit (max 5)
            const photoCount = req.files ? req.files.filter(f => f.mimetype.startsWith('image/')).length : 0;
            if (photoCount >= 5) {
                return cb(new Error('Maximum 5 photos allowed'));
            }
            return cb(null, true);
        } else if (file.mimetype.startsWith('video/') && allowedVideoTypes.test(extname)) {
            // Check video count limit (max 1)
            const videoCount = req.files ? req.files.filter(f => f.mimetype.startsWith('video/')).length : 0;
            if (videoCount >= 1) {
                return cb(new Error('Only 1 video allowed'));
            }
            return cb(null, true);
        } else {
            cb(new Error('Only image (JPEG, PNG, GIF) and video (MP4, AVI, MOV, MKV) files are allowed!'));
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
            ts.end_time,
            c.code as coupon_code,
            c.discount_type as coupon_discount_type,
            c.discount_value as coupon_discount_value,
            cu.discount_amount as coupon_discount_amount,
            (rr.total_amount - COALESCE(cu.discount_amount, 0)) as net_amount
        FROM repair_requests rr
        LEFT JOIN users u ON rr.user_id = u.id
        LEFT JOIN time_slots ts ON rr.time_slot_id = ts.id
        LEFT JOIN coupon_usage cu ON cu.request_type = 'repair' AND cu.request_id = rr.id
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
            console.error('Error fetching repair requests:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair requests'
            });
        }
        
        // Get services for each request
        const requestsWithServices = [];
        let completed = 0;
        
        if (requests.length === 0) {
            return res.json({
                success: true,
                data: {
                    requests: [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: 0,
                        pages: 0
                    }
                }
            });
        }
        
        requests.forEach((request) => {
            db.all(
                `SELECT 
                    rrs.*,
                    rs.name,
                    rs.description,
                    rs.special_instructions
                FROM repair_request_services rrs
                LEFT JOIN repair_services rs ON rrs.repair_service_id = rs.id
                WHERE rrs.repair_request_id = ?`,
                [request.id],
                (err, services) => {
                    if (err) {
                        console.error('Error fetching request services:', err);
                    }
                    
                    // Get files for this request
                    db.all(
                        'SELECT * FROM repair_request_files WHERE repair_request_id = ? ORDER BY display_order',
                        [request.id],
                        (err, files) => {
                            if (err) {
                                console.error('Error fetching request files:', err);
                            }
                            
                            requestsWithServices.push({
                                ...request,
                                services: services || [],
                                files: files || []
                            });
                            
                            completed++;
                            
                            if (completed === requests.length) {
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
                                            requests: requestsWithServices,
                                            pagination: {
                                                page: parseInt(page),
                                                limit: parseInt(limit),
                                                total: countResult.total,
                                                pages: Math.ceil(countResult.total / limit)
                                            }
                                        }
                                    });
                                });
                            }
                        }
                    );
                }
            );
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

// 6. Delete repair request (Admin)
router.delete('/admin/requests/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    // First, delete related records (files and services)
    db.run('DELETE FROM repair_request_files WHERE repair_request_id = ?', [id], (err) => {
        if (err) {
            console.error('Error deleting repair request files:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete repair request files'
            });
        }
        
        db.run('DELETE FROM repair_request_services WHERE repair_request_id = ?', [id], (err) => {
            if (err) {
                console.error('Error deleting repair request services:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete repair request services'
                });
            }
            
            // Finally, delete the main request
            db.run('DELETE FROM repair_requests WHERE id = ?', [id], function(err) {
                if (err) {
                    console.error('Error deleting repair request:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to delete repair request'
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
                    message: 'Repair request deleted successfully'
                });
            });
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
router.post('/requests', authenticateToken, requireUser, upload.array('files', 6), async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('Received files:', req.files);
        const {
            contactNumber,
            alternateNumber,
            email,
            notes,
            address,
            preferredDate,
            timeSlotId,
            paymentMethod,
            totalAmount
        } = req.body;

        // Parse services
        let services = [];
        if (req.body.services) {
            try {
                services = JSON.parse(req.body.services);
            } catch (e) {
                return res.status(400).json({ success: false, message: 'Invalid services format (JSON parse error)' });
            }
        }
        if (!Array.isArray(services) || services.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one service is required' });
        }
        for (let i = 0; i < services.length; i++) {
            const service = services[i];
            if (!service.serviceId || !service.price) {
                return res.status(400).json({ success: false, message: `Service ${i + 1} is missing required fields` });
            }
        }

        // Calculate expiry time (15 minutes from now)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        // Insert repair request
        db.run(
            `INSERT INTO repair_requests (
                user_id, contact_number, alternate_number, email, notes, address,
                preferred_date, time_slot_id, total_amount, payment_method, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.userId, contactNumber, alternateNumber, email, notes, address,
                preferredDate, timeSlotId, totalAmount, paymentMethod, expiresAt.toISOString()
            ],
            function(err) {
                if (err) {
                    console.error('Error creating repair request:', err);
                    return res.status(500).json({ success: false, message: 'Failed to create repair request' });
                }
                const requestId = this.lastID;
                // Insert services
                const serviceQuery = 'INSERT INTO repair_request_services (repair_request_id, repair_service_id, price, discount_amount) VALUES (?, ?, ?, ?)';
                let completed = 0;
                let serviceError = false;
                services.forEach((service, index) => {
                    db.run(serviceQuery, [requestId, service.serviceId, service.price, service.discountAmount || 0], (err) => {
                        if (err) {
                            console.error('Error inserting service:', err);
                            serviceError = true;
                        }
                        completed++;
                        if (completed === services.length) {
                            if (serviceError) {
                                return res.status(500).json({ success: false, message: 'Failed to insert services' });
                            }
                            // Insert files
                            if (req.files && req.files.length > 0) {
                                const fileQuery = 'INSERT INTO repair_request_files (repair_request_id, file_url, file_type, display_order) VALUES (?, ?, ?, ?)';
                                let filesCompleted = 0;
                                let fileError = false;
                                req.files.forEach((file, index) => {
                                    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
                                    const fileUrl = `/uploads/repair-requests/${file.filename}`;
                                    db.run(fileQuery, [requestId, fileUrl, fileType, index], (err) => {
                                        if (err) {
                                            console.error('[ERROR] Failed to insert file:', { requestId, fileUrl, fileType, index, error: err });
                                            fileError = true;
                                        } else {
                                            console.log('[DEBUG] File inserted successfully:', { requestId, fileUrl, fileType, index });
                                        }
                                        filesCompleted++;
                                        if (filesCompleted === req.files.length) {
                                            if (fileError) {
                                                return res.status(500).json({ success: false, message: 'Failed to insert files' });
                                            }
                                            return res.status(201).json({ success: true, message: 'Repair request created successfully', data: { requestId } });
                                        }
                                    });
                                });
                            } else {
                                return res.status(201).json({ success: true, message: 'Repair request created successfully', data: { requestId } });
                            }
                        }
                    });
                });
            }
        );
    } catch (error) {
        console.error('Unexpected error in repair request creation:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
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
        
        // Get services and files for each request
        const requestsWithDetails = [];
        let completed = 0;
        
        if (requests.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        requests.forEach((request) => {
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
                [request.id],
                (err, services) => {
                    if (err) {
                        console.error('Error fetching request services:', err);
                    }
                    
                    // Get files for this request
                    db.all(
                        'SELECT * FROM repair_request_files WHERE repair_request_id = ? ORDER BY display_order',
                        [request.id],
                        (err, files) => {
                            if (err) {
                                console.error('Error fetching request files:', err);
                            }
                            
                            requestsWithDetails.push({
                                ...request,
                                services: services || [],
                                files: files || []
                            });
                            
                            completed++;
                            
                            if (completed === requests.length) {
                                res.json({
                                    success: true,
                                    data: requestsWithDetails
                                });
                            }
                        }
                    );
                }
            );
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