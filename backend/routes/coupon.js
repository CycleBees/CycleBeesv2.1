const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, requireUser } = require('../middleware/auth');
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database/cyclebees.db';
const db = new sqlite3.Database(dbPath);

const router = express.Router();

// ==================== ADMIN COUPON MANAGEMENT ====================

// 1. List/search coupons (admin)
router.get('/admin', authenticateToken, requireAdmin, (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM coupons';
    let countQuery = 'SELECT COUNT(*) as total FROM coupons';
    const params = [];
    const countParams = [];
    if (search) {
        query += ' WHERE code LIKE ? OR description LIKE ?';
        countQuery += ' WHERE code LIKE ? OR description LIKE ?';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
        countParams.push(searchParam, searchParam);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to count coupons' });
        }
        db.all(query, params, (err, coupons) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
            }
            res.json({
                success: true,
                data: {
                    coupons,
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

// 2. Get coupon details (admin)
router.get('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM coupons WHERE id = ?', [id], (err, coupon) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to fetch coupon' });
        }
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.json({ success: true, data: coupon });
    });
});

// 3. Create coupon (admin)
router.post('/admin', authenticateToken, requireAdmin, [
    body('code').isLength({ min: 3 }).withMessage('Coupon code required'),
    body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
    body('discountValue').isFloat({ min: 0.01 }).withMessage('Discount value required'),
    body('applicableItems').isArray().withMessage('Applicable items required'),
    body('usageLimit').isInt({ min: 1 }).withMessage('Usage limit required'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid expiry date')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }
    const {
        code, description, discountType, discountValue, minAmount, maxDiscount,
        applicableItems, usageLimit, expiresAt, isActive = 1
    } = req.body;
    db.run(
        `INSERT INTO coupons (code, description, discount_type, discount_value, min_amount, max_discount, applicable_items, usage_limit, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, description, discountType, discountValue, minAmount || 0, maxDiscount, JSON.stringify(applicableItems), usageLimit, expiresAt, isActive],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to create coupon', error: err.message });
            }
            res.status(201).json({ success: true, message: 'Coupon created', data: { id: this.lastID } });
        }
    );
});

// 4. Update coupon (admin)
router.put('/admin/:id', authenticateToken, requireAdmin, [
    body('code').optional().isLength({ min: 3 }),
    body('discountType').optional().isIn(['percentage', 'fixed']),
    body('discountValue').optional().isFloat({ min: 0.01 }),
    body('applicableItems').optional().isArray(),
    body('usageLimit').optional().isInt({ min: 1 }),
    body('expiresAt').optional().isISO8601(),
    body('isActive').optional().isBoolean()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }
    const { id } = req.params;
    const fields = [];
    const values = [];
    const allowed = {
        code: 'code', description: 'description', discountType: 'discount_type', discountValue: 'discount_value',
        minAmount: 'min_amount', maxDiscount: 'max_discount', applicableItems: 'applicable_items', usageLimit: 'usage_limit',
        expiresAt: 'expires_at', isActive: 'is_active'
    };
    for (const key in req.body) {
        if (allowed[key]) {
            if (key === 'applicableItems') {
                fields.push(`${allowed[key]} = ?`);
                values.push(JSON.stringify(req.body[key]));
            } else {
                fields.push(`${allowed[key]} = ?`);
                values.push(req.body[key]);
            }
        }
    }
    if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    values.push(id);
    db.run(
        `UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to update coupon', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Coupon not found' });
            }
            res.json({ success: true, message: 'Coupon updated' });
        }
    );
});

// 5. Delete coupon (admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM coupons WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to delete coupon' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        res.json({ success: true, message: 'Coupon deleted' });
    });
});

// ==================== USER COUPON ENDPOINTS ====================

// 1. Apply coupon (validate and calculate discount)
router.post('/apply', authenticateToken, requireUser, [
    body('code').notEmpty().withMessage('Coupon code required'),
    body('requestType').isIn(['repair', 'rental']).withMessage('Request type required'),
    body('items').isArray().withMessage('Items array required'), // e.g. ['repair_services', 'service_mechanic_charge']
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
    }
    const { code, requestType, items, totalAmount } = req.body;
    const userId = req.user.userId;
    db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code], (err, coupon) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to fetch coupon' });
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found or inactive' });
        // Check expiry
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon expired' });
        }
        // Check usage limit
        db.get('SELECT COUNT(*) as used FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [coupon.id, userId], (err, usage) => {
            if (err) return res.status(500).json({ success: false, message: 'Failed to check usage' });
            if (usage.used >= coupon.usage_limit) {
                return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
            }
            // Check applicable items
            let applicableItems = [];
            try { applicableItems = JSON.parse(coupon.applicable_items); } catch {}
            const isApplicable = items.some(item => applicableItems.includes(item));
            if (!isApplicable) {
                return res.status(400).json({ success: false, message: 'Coupon not applicable to selected items' });
            }
            // Check min amount
            if (coupon.min_amount && totalAmount < coupon.min_amount) {
                return res.status(400).json({ success: false, message: `Minimum amount for coupon is ${coupon.min_amount}` });
            }
            // Calculate discount
            let discount = 0;
            if (coupon.discount_type === 'percentage') {
                discount = (totalAmount * coupon.discount_value) / 100;
                if (coupon.max_discount && discount > coupon.max_discount) {
                    discount = coupon.max_discount;
                }
            } else if (coupon.discount_type === 'fixed') {
                discount = coupon.discount_value;
            }
            if (discount > totalAmount) discount = totalAmount;
            // (Optional: Do not record usage here, only on final booking)
            res.json({
                success: true,
                data: {
                    code: coupon.code,
                    discount,
                    discountType: coupon.discount_type,
                    discountValue: coupon.discount_value,
                    description: coupon.description,
                    couponId: coupon.id
                }
            });
        });
    });
});

// 2. List available coupons for user (active, not expired, not over usage limit)
router.get('/available', authenticateToken, requireUser, (req, res) => {
    const userId = req.user.userId;
    const now = new Date().toISOString();
    db.all('SELECT * FROM coupons WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)', [now], (err, coupons) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
        if (!coupons || coupons.length === 0) return res.json({ success: true, data: [] });
        // For each coupon, check usage limit
        const filtered = [];
        let checked = 0;
        coupons.forEach(coupon => {
            db.get('SELECT COUNT(*) as used FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [coupon.id, userId], (err, usage) => {
                checked++;
                if (!err && usage.used < coupon.usage_limit) {
                    filtered.push({
                        id: coupon.id,
                        code: coupon.code,
                        description: coupon.description,
                        discountType: coupon.discount_type,
                        discountValue: coupon.discount_value,
                        minAmount: coupon.min_amount,
                        maxDiscount: coupon.max_discount,
                        applicableItems: coupon.applicable_items,
                        expiresAt: coupon.expires_at
                    });
                }
                if (checked === coupons.length) {
                    res.json({ success: true, data: filtered });
                }
            });
        });
    });
});

module.exports = router; 