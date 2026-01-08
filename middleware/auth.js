import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { queryOne } from '../database/db.js';

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwtSecret);

        // Fetch current user from database
        const user = queryOne('SELECT * FROM users WHERE id = ?', [decoded.userId]);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Attach user to request (remove password)
        delete user.password;
        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Ensure student is approved
 */
export function requireApproved(req, res, next) {
    if (req.user.role === 'student' && req.user.approval_status !== 'approved') {
        return res.status(403).json({
            error: 'Account pending approval',
            approvalStatus: req.user.approval_status
        });
    }
    next();
}

/**
 * Require specific role
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

/**
 * Shorthand for teacher/admin access
 */
export const requireTeacher = requireRole('teacher');
