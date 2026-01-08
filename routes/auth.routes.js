import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, run } from '../database/db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new user (teacher whitelist check or student invite)
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, class: userClass, section, rollNumber, schoolId } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user already exists
        const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Role-specific validation
        if (role === 'teacher') {
            // Teacher must be whitelisted
            if (!config.teacherWhitelist.includes(email)) {
                return res.status(403).json({ error: 'Email not authorized for teacher access' });
            }
        } else if (role === 'student') {
            // Students need class, section, roll number
            if (!userClass || !section || !rollNumber || !schoolId) {
                return res.status(400).json({ error: 'Students must provide class, section, roll number, and school ID' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate profile picture
        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s+/g, '')}`;

        // Insert user
        const approvalStatus = role === 'teacher' ? 'approved' : 'pending';
        const result = await run(
            `INSERT INTO users (name, email, password, role, approval_status, class, section, roll_number, school_id, profile_picture)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, role, approvalStatus, userClass, section, rollNumber, schoolId, profilePicture]
        );

        // Create trust signal entry for students
        if (role === 'student') {
            await run('INSERT INTO trust_signals (user_id, blocked_posts_count) VALUES (?, 0)', [result.lastInsertRowid]);
        }

        res.status(201).json({
            message: role === 'teacher' ? 'Teacher account created' : 'Student account created. Awaiting approval.',
            userId: result.lastInsertRowid,
            approvalStatus
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check approval status for students
        if (user.role === 'student' && user.approval_status !== 'approved') {
            return res.status(403).json({
                error: 'Account not approved',
                approvalStatus: user.approval_status,
                message: user.approval_status === 'pending'
                    ? 'Your account is pending teacher approval'
                    : 'Your account has been rejected'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        // Remove password from response
        delete user.password;

        res.json({
            token,
            user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

export default router;
