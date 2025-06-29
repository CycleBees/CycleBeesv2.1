const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Database connection
const sqlite3 = require('sqlite3').verbose();
const dbPath = process.env.DB_PATH || './database/cyclebees.db';
const db = new sqlite3.Database(dbPath);

// In-memory OTP storage (for development - replace with database in production)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP (mock function - replace with actual SMS service)
function sendOTP(phone, otp) {
    console.log(`📱 Mock SMS sent to ${phone}: Your OTP is ${otp}`);
    return true;
}

// Validate Indian phone number
function validateIndianPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}

// 1. Send OTP for user login/signup
router.post('/send-otp', [
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error', 
                errors: errors.array() 
            });
        }

        const { phone } = req.body;

        // Validate Indian phone number
        if (!validateIndianPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store OTP in database
        db.run(
            'INSERT OR REPLACE INTO otp_codes (phone, otp_code, expires_at) VALUES (?, ?, ?)',
            [phone, otp, expiresAt.toISOString()],
            function(err) {
                if (err) {
                    console.error('Error storing OTP:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to send OTP'
                    });
                }

                // Send OTP (mock)
                sendOTP(phone, otp);

                res.json({
                    success: true,
                    message: 'OTP sent successfully',
                    data: {
                        phone,
                        expiresIn: '5 minutes'
                    }
                });
            }
        );

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 2. Verify OTP and login/signup user
router.post('/verify-otp', [
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error', 
                errors: errors.array() 
            });
        }

        const { phone, otp } = req.body;

        // Validate Indian phone number
        if (!validateIndianPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number'
            });
        }

        // Verify OTP from database
        db.get(
            'SELECT * FROM otp_codes WHERE phone = ? AND otp_code = ? AND expires_at > datetime("now") AND is_used = 0',
            [phone, otp],
            async (err, otpRecord) => {
                if (err) {
                    console.error('Error verifying OTP:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to verify OTP'
                    });
                }

                if (!otpRecord) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid or expired OTP'
                    });
                }

                // Mark OTP as used
                db.run(
                    'UPDATE otp_codes SET is_used = 1 WHERE id = ?',
                    [otpRecord.id]
                );

                // Check if user exists
                db.get(
                    'SELECT * FROM users WHERE phone = ?',
                    [phone],
                    async (err, user) => {
                        if (err) {
                            console.error('Error checking user:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Internal server error'
                            });
                        }

                        if (user) {
                            // Existing user - generate JWT and login
                            const token = jwt.sign(
                                { 
                                    userId: user.id, 
                                    phone: user.phone,
                                    role: 'user'
                                },
                                process.env.JWT_SECRET,
                                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
                            );

                            res.json({
                                success: true,
                                message: 'Login successful',
                                data: {
                                    user: {
                                        id: user.id,
                                        phone: user.phone,
                                        fullName: user.full_name,
                                        email: user.email,
                                        isProfileComplete: true
                                    },
                                    token,
                                    isNewUser: false
                                }
                            });
                        } else {
                            // New user - return success with isNewUser flag
                            res.json({
                                success: true,
                                message: 'OTP verified successfully. Please complete registration.',
                                data: {
                                    phone,
                                    isNewUser: true
                                }
                            });
                        }
                    }
                );
            }
        );

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 3. Complete user registration
router.post('/register', [
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
    body('fullName').isLength({ min: 2 }).withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('age').isInt({ min: 1, max: 120 }).withMessage('Valid age is required'),
    body('pincode').isLength({ min: 6, max: 6 }).withMessage('Pincode must be 6 digits'),
    body('address').isLength({ min: 10 }).withMessage('Address is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error', 
                errors: errors.array() 
            });
        }

        const { phone, fullName, email, age, pincode, address, profilePhoto } = req.body;

        // Validate Indian phone number
        if (!validateIndianPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number'
            });
        }

        // Check if user already exists
        db.get(
            'SELECT id FROM users WHERE phone = ?',
            [phone],
            (err, existingUser) => {
                if (err) {
                    console.error('Error checking existing user:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                }

                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'User already exists with this phone number'
                    });
                }

                // Create new user
                db.run(
                    'INSERT INTO users (phone, full_name, email, age, pincode, address, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [phone, fullName, email, age, pincode, address, profilePhoto || null],
                    function(err) {
                        if (err) {
                            console.error('Error creating user:', err);
                            return res.status(500).json({
                                success: false,
                                message: 'Failed to create user account'
                            });
                        }

                        // Generate JWT token
                        const token = jwt.sign(
                            { 
                                userId: this.lastID, 
                                phone: phone,
                                role: 'user'
                            },
                            process.env.JWT_SECRET,
                            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
                        );

                        res.status(201).json({
                            success: true,
                            message: 'Registration successful',
                            data: {
                                user: {
                                    id: this.lastID,
                                    phone,
                                    fullName,
                                    email,
                                    age,
                                    pincode,
                                    address,
                                    profilePhoto,
                                    isProfileComplete: true
                                },
                                token
                            }
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 4. Admin login
router.post('/admin/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error', 
                errors: errors.array() 
            });
        }

        const { username, password } = req.body;

        // Find admin user
        db.get(
            'SELECT * FROM admin WHERE username = ?',
            [username],
            async (err, admin) => {
                if (err) {
                    console.error('Error finding admin:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                }

                if (!admin) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                // Verify password
                const isValidPassword = await bcrypt.compare(password, admin.password_hash);
                if (!isValidPassword) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { 
                        adminId: admin.id, 
                        username: admin.username,
                        role: 'admin'
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
                );

                res.json({
                    success: true,
                    message: 'Admin login successful',
                    data: {
                        admin: {
                            id: admin.id,
                            username: admin.username
                        },
                        token
                    }
                });
            }
        );

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 5. Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        db.get(
            'SELECT * FROM users WHERE id = ?',
            [decoded.userId],
            (err, user) => {
                if (err) {
                    console.error('Error fetching user profile:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                }

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                res.json({
                    success: true,
                    data: {
                        user: {
                            id: user.id,
                            phone: user.phone,
                            fullName: user.full_name,
                            email: user.email,
                            age: user.age,
                            pincode: user.pincode,
                            address: user.address,
                            profilePhoto: user.profile_photo,
                            isProfileComplete: true
                        }
                    }
                });
            }
        );

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 