const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Database connection
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database/cyclebees.db';
const db = new sqlite3.Database(dbPath);

// ==================== DASHBOARD ROUTES ====================

// 1. Get dashboard overview statistics
router.get('/overview', authenticateToken, requireAdmin, (req, res) => {
    try {
        // Get total users count
        db.get('SELECT COUNT(*) as total FROM users', (err, userCount) => {
            if (err) {
                console.error('Error counting users:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to get user count'
                });
            }

            // Get total repair requests count
            db.get('SELECT COUNT(*) as total FROM repair_requests', (err, repairCount) => {
                if (err) {
                    console.error('Error counting repair requests:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to get repair count'
                    });
                }

                // Get total rental requests count
                db.get('SELECT COUNT(*) as total FROM rental_requests', (err, rentalCount) => {
                    if (err) {
                        console.error('Error counting rental requests:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to get rental count'
                        });
                    }

                    // Get pending repair requests count
                    db.get('SELECT COUNT(*) as total FROM repair_requests WHERE status = "pending"', (err, pendingRepairCount) => {
                        if (err) {
                            console.error('Error counting pending repair requests:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Failed to get pending repair count'
                            });
                        }

                        // Get pending rental requests count
                        db.get('SELECT COUNT(*) as total FROM rental_requests WHERE status = "pending"', (err, pendingRentalCount) => {
                            if (err) {
                                console.error('Error counting pending rental requests:', err);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Failed to get pending rental count'
                                });
                            }

                            // Get total revenue (completed requests)
                            db.get(`
                                SELECT 
                                    COALESCE(SUM(total_amount), 0) as total_revenue
                                FROM (
                                    SELECT total_amount FROM repair_requests WHERE status = 'completed'
                                    UNION ALL
                                    SELECT total_amount FROM rental_requests WHERE status = 'completed'
                                )
                            `, (err, revenueResult) => {
                                if (err) {
                                    console.error('Error calculating revenue:', err);
                                    return res.status(500).json({
                                        success: false,
                                        message: 'Failed to calculate revenue'
                                    });
                                }

                                // Get today's requests count
                                const today = new Date().toISOString().split('T')[0];
                                db.get(`
                                    SELECT COUNT(*) as total FROM (
                                        SELECT created_at FROM repair_requests WHERE DATE(created_at) = ?
                                        UNION ALL
                                        SELECT created_at FROM rental_requests WHERE DATE(created_at) = ?
                                    )
                                `, [today, today], (err, todayCount) => {
                                    if (err) {
                                        console.error('Error counting today\'s requests:', err);
                                        return res.status(500).json({
                                            success: false,
                                            message: 'Failed to get today\'s count'
                                        });
                                    }

                                    res.json({
                                        success: true,
                                        data: {
                                            totalUsers: userCount.total,
                                            totalRepairRequests: repairCount.total,
                                            totalRentalRequests: rentalCount.total,
                                            pendingRepairRequests: pendingRepairCount.total,
                                            pendingRentalRequests: pendingRentalCount.total,
                                            totalRevenue: revenueResult.total_revenue,
                                            todayRequests: todayCount.total
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 2. Get user management data
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const params = [];
    const countParams = [];
    
    if (search) {
        query += ' WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ?';
        countQuery += ' WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam);
        countParams.push(searchParam, searchParam, searchParam);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    // Get total count
    db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
            console.error('Error counting users:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to count users'
            });
        }
        
        // Get users
        db.all(query, params, (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch users'
                });
            }
            
            res.json({
                success: true,
                data: {
                    users,
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

// 3. Get user details with activity
router.get('/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    
    // Get user details
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user'
            });
        }
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Get user's repair requests
        db.all(`
            SELECT 
                rr.*,
                ts.start_time,
                ts.end_time
            FROM repair_requests rr
            LEFT JOIN time_slots ts ON rr.time_slot_id = ts.id
            WHERE rr.user_id = ?
            ORDER BY rr.created_at DESC
        `, [id], (err, repairRequests) => {
            if (err) {
                console.error('Error fetching user repair requests:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch user repair requests'
                });
            }
            
            // Get user's rental requests
            db.all(`
                SELECT 
                    rr.*,
                    b.name as bicycle_name,
                    b.model as bicycle_model
                FROM rental_requests rr
                LEFT JOIN bicycles b ON rr.bicycle_id = b.id
                WHERE rr.user_id = ?
                ORDER BY rr.created_at DESC
            `, [id], (err, rentalRequests) => {
                if (err) {
                    console.error('Error fetching user rental requests:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch user rental requests'
                    });
                }
                
                // Calculate user statistics
                const totalRepairRequests = repairRequests.length;
                const totalRentalRequests = rentalRequests.length;
                const completedRepairRequests = repairRequests.filter(r => r.status === 'completed').length;
                const completedRentalRequests = rentalRequests.filter(r => r.status === 'completed').length;
                const totalSpent = repairRequests
                    .filter(r => r.status === 'completed')
                    .reduce((sum, r) => sum + parseFloat(r.total_amount), 0) +
                    rentalRequests
                    .filter(r => r.status === 'completed')
                    .reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
                
                res.json({
                    success: true,
                    data: {
                        user,
                        activity: {
                            repairRequests,
                            rentalRequests,
                            statistics: {
                                totalRepairRequests,
                                totalRentalRequests,
                                completedRepairRequests,
                                completedRentalRequests,
                                totalSpent
                            }
                        }
                    }
                });
            });
        });
    });
});

// 4. Get repair analytics
router.get('/analytics/repair', authenticateToken, requireAdmin, (req, res) => {
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Get repair requests by status
    db.all(`
        SELECT 
            status,
            COUNT(*) as count,
            SUM(total_amount) as total_amount
        FROM repair_requests 
        WHERE DATE(created_at) >= ?
        GROUP BY status
    `, [startDateStr], (err, statusStats) => {
        if (err) {
            console.error('Error fetching repair status stats:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair statistics'
            });
        }
        
        // Get repair requests by date (last 7 days)
        db.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                SUM(total_amount) as total_amount
            FROM repair_requests 
            WHERE DATE(created_at) >= DATE('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date
        `, (err, dailyStats) => {
            if (err) {
                console.error('Error fetching repair daily stats:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch repair daily statistics'
                });
            }
            
            // Get top repair services
            db.all(`
                SELECT 
                    rs.name,
                    COUNT(*) as count,
                    SUM(rrs.price) as total_revenue
                FROM repair_request_services rrs
                JOIN repair_services rs ON rrs.repair_service_id = rs.id
                JOIN repair_requests rr ON rrs.repair_request_id = rr.id
                WHERE DATE(rr.created_at) >= ?
                GROUP BY rs.id, rs.name
                ORDER BY count DESC
                LIMIT 5
            `, [startDateStr], (err, topServices) => {
                if (err) {
                    console.error('Error fetching top repair services:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch top repair services'
                    });
                }
                
                res.json({
                    success: true,
                    data: {
                        period: parseInt(period),
                        statusStats,
                        dailyStats,
                        topServices
                    }
                });
            });
        });
    });
});

// 5. Get rental analytics
router.get('/analytics/rental', authenticateToken, requireAdmin, (req, res) => {
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Get rental requests by status
    db.all(`
        SELECT 
            status,
            COUNT(*) as count,
            SUM(total_amount) as total_amount
        FROM rental_requests 
        WHERE DATE(created_at) >= ?
        GROUP BY status
    `, [startDateStr], (err, statusStats) => {
        if (err) {
            console.error('Error fetching rental status stats:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental statistics'
            });
        }
        
        // Get rental requests by date (last 7 days)
        db.all(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count,
                SUM(total_amount) as total_amount
            FROM rental_requests 
            WHERE DATE(created_at) >= DATE('now', '-7 days')
            GROUP BY DATE(created_at)
            ORDER BY date
        `, (err, dailyStats) => {
            if (err) {
                console.error('Error fetching rental daily stats:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch rental daily statistics'
                });
            }
            
            // Get top rented bicycles
            db.all(`
                SELECT 
                    b.name,
                    b.model,
                    COUNT(*) as count,
                    SUM(rr.total_amount) as total_revenue
                FROM rental_requests rr
                JOIN bicycles b ON rr.bicycle_id = b.id
                WHERE DATE(rr.created_at) >= ?
                GROUP BY b.id, b.name, b.model
                ORDER BY count DESC
                LIMIT 5
            `, [startDateStr], (err, topBicycles) => {
                if (err) {
                    console.error('Error fetching top rented bicycles:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch top rented bicycles'
                    });
                }
                
                res.json({
                    success: true,
                    data: {
                        period: parseInt(period),
                        statusStats,
                        dailyStats,
                        topBicycles
                    }
                });
            });
        });
    });
});

// 6. Get recent activity
router.get('/recent-activity', authenticateToken, requireAdmin, (req, res) => {
    const { limit = 10 } = req.query;
    
    // Get recent repair requests
    db.all(`
        SELECT 
            'repair' as type,
            rr.id,
            rr.status,
            rr.total_amount,
            rr.created_at,
            u.full_name as user_name,
            u.phone as user_phone
        FROM repair_requests rr
        JOIN users u ON rr.user_id = u.id
        ORDER BY rr.created_at DESC
        LIMIT ?
    `, [parseInt(limit)], (err, repairActivity) => {
        if (err) {
            console.error('Error fetching recent repair activity:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch recent activity'
            });
        }
        
        // Get recent rental requests
        db.all(`
            SELECT 
                'rental' as type,
                rr.id,
                rr.status,
                rr.total_amount,
                rr.created_at,
                u.full_name as user_name,
                u.phone as user_phone,
                b.name as bicycle_name
            FROM rental_requests rr
            JOIN users u ON rr.user_id = u.id
            JOIN bicycles b ON rr.bicycle_id = b.id
            ORDER BY rr.created_at DESC
            LIMIT ?
        `, [parseInt(limit)], (err, rentalActivity) => {
            if (err) {
                console.error('Error fetching recent rental activity:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch recent activity'
                });
            }
            
            // Combine and sort by date
            const allActivity = [...repairActivity, ...rentalActivity]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, parseInt(limit));
            
            res.json({
                success: true,
                data: allActivity
            });
        });
    });
});

module.exports = router; 