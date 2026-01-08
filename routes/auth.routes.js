import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { query, queryOne, run } from '../database/db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for ID card uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'id-cards');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .jpg, .jpeg, and .png image files are allowed'));
        }
    }
});

// Configure multer for profile picture uploads
const profilePicsDir = path.join(__dirname, '..', 'uploads', 'profile-pictures');
const profilePicStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profilePicsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const profilePicUpload = multer({
    storage: profilePicStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .jpg, .jpeg, and .png image files are allowed'));
        }
    }
});

/**
 * POST /api/auth/register
 * Register new user (student self-signup with ID card, teacher whitelist check)
 */
router.post('/register', upload.single('idCard'), async (req, res) => {
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
            // Students need class, section, roll number, school ID, and ID card photo
            if (!userClass || !section || !rollNumber || !schoolId) {
                return res.status(400).json({ error: 'Students must provide class, section, roll number, and school ID' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'ID card photo is required for student registration' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate profile picture
        const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s+/g, '')}`;

        // ID card photo path
        const idCardPhoto = req.file ? `/uploads/id-cards/${req.file.filename}` : null;

        // Insert user
        const approvalStatus = role === 'teacher' ? 'approved' : 'pending';
        const result = await run(
            `INSERT INTO users (name, email, password, role, approval_status, class, section, roll_number, school_id, profile_picture, id_card_photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, role, approvalStatus, userClass, section, rollNumber, schoolId, profilePicture, idCardPhoto]
        );

        // Create trust signal entry for students
        if (role === 'student') {
            await run('INSERT INTO trust_signals (user_id, blocked_posts_count) VALUES (?, 0)', [result.lastInsertRowid]);
        }

        res.status(201).json({
            message: role === 'teacher' ? 'Teacher account created' : 'Registration submitted! A teacher will review your account.',
            userId: result.lastInsertRowid,
            approvalStatus
        });
    } catch (error) {
        console.error('Registration error:', error);

        // Handle multer errors specifically
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
            }
            return res.status(400).json({ error: error.message });
        }

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

/**
 * PUT /api/auth/profile-picture
 * Upload/update user profile picture
 */
router.put('/profile-picture', authenticate, profilePicUpload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const userId = req.user.id;
        const newProfilePicture = `http://localhost:${config.port}/uploads/profile-pictures/${req.file.filename}`;

        // Get current profile picture to delete old file if it's a custom upload
        const currentUser = await queryOne('SELECT profile_picture FROM users WHERE id = ?', [userId]);
        if (currentUser && currentUser.profile_picture && currentUser.profile_picture.includes('/uploads/profile-pictures/')) {
            // Extract the relative path from the URL
            const relativePath = currentUser.profile_picture.replace(`http://localhost:${config.port}`, '');
            const oldFilePath = path.join(__dirname, '..', relativePath);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        // Update database
        await run('UPDATE users SET profile_picture = ? WHERE id = ?', [newProfilePicture, userId]);

        // Get updated user
        const updatedUser = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
        delete updatedUser.password;

        res.json({
            message: 'Profile picture updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Profile picture upload error:', error);

        // Handle multer errors specifically
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
            }
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to update profile picture' });
    }
});

export default router;

