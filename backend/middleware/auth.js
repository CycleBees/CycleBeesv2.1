const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = decoded;
        next();
    });
};

// Middleware to verify user role
const requireUser = (req, res, next) => {
    if (req.user.role !== 'user') {
        return res.status(403).json({
            success: false,
            message: 'User access required'
        });
    }
    next();
};

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireUser,
    requireAdmin
}; 