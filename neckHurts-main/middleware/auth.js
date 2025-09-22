const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database (to ensure user still exists)
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({
                error: 'Invalid token. User not found.',
                code: 'USER_NOT_FOUND'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token.',
                code: 'INVALID_TOKEN'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired.',
                code: 'TOKEN_EXPIRED'
            });
        }

        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Authentication error.',
            code: 'AUTH_ERROR'
        });
    }
};

// Role-based access control
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        // Convert single role to array
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
                code: 'INSUFFICIENT_PERMISSIONS',
                userRole: req.user.role,
                requiredRoles: allowedRoles
            });
        }

        next();
    };
};

// Admin only middleware
const requireAdmin = requireRole(['ADMIN']);

// Supervisor or Admin middleware
const requireSupervisor = requireRole(['SUPERVISOR', 'ADMIN']);

// Optional authentication (for public endpoints that benefit from user context)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            if (user) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Ignore auth errors for optional auth
        next();
    }
};

// Generate JWT token helper
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Validate token helper (for client-side validation)
const validateToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return { valid: true, decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireAdmin,
    requireSupervisor,
    optionalAuth,
    generateToken,
    validateToken
};