import express from 'express';
import { query, queryOne, run } from '../database/db.js';
import { authenticate, requireTeacher } from '../middleware/auth.js';
import { config } from '../config.js';
import bcrypt from 'bcryptjs';
import upload from '../middleware/upload.js';
import fs from 'fs';

const router = express.Router();

// All teacher routes require authentication and teacher role
router.use(authenticate, requireTeacher);

/**
 * GET /api/teacher/dashboard
 * Teacher dashboard with priority alerts
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Count pending students
        const pendingResult = await queryOne(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'student' AND approval_status = 'pending'
    `);
        const pendingCount = pendingResult ? pendingResult.count : 0;

        // Count AI-blocked posts
        const blockedResult = await queryOne(`
      SELECT COUNT(*) as count FROM posts 
      WHERE moderation_status = 'blocked'
    `);
        const blockedPostsCount = blockedResult ? blockedResult.count : 0;

        res.json({
            user: req.user,
            alerts: {
                pendingStudents: pendingCount,
                blockedPosts: blockedPostsCount
            }
        });
    } catch (error) {
        console.error('Teacher dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});

/**
 * GET /api/teacher/feed
 * View school feed (same as students)
 */
router.get('/feed', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        // Get approved posts with user info
        const posts = await query(`
      SELECT 
        p.id, p.content, p.image, p.tag, p.created_at,
        u.id as author_id, u.name as author_name, u.role as author_role,
        u.class as author_class, u.section as author_section, u.profile_picture
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.moderation_status = 'approved'
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

        // Get total count
        const totalResult = await queryOne(`
      SELECT COUNT(*) as count FROM posts WHERE moderation_status = 'approved'
    `);
        const total = totalResult ? totalResult.count : 0;

        res.json({
            posts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

/**
 * POST /api/teacher/post
 * Create a new post (bypasses AI moderation)
 * Teacher posts are automatically approved and published
 * Images are NOT analyzed - teachers are trusted
 */
router.post('/post', upload.single('image'), async (req, res) => {
    try {
        const { content, tag } = req.body;

        // Validate required fields
        if (!content || !tag) {
            // Delete uploaded file if validation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Content and tag are required' });
        }

        // Validate tag
        const validTags = ['#Academics', '#Sports', '#Art', '#Fest', '#Help'];
        if (!validTags.includes(tag)) {
            // Delete uploaded file if validation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Invalid tag' });
        }

        // Get image path (if uploaded)
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        // Teachers bypass AI moderation - publish immediately as approved
        const result = await run(
            `INSERT INTO posts (user_id, content, image, tag, moderation_status)
       VALUES (?, ?, ?, ?, 'approved')`,
            [req.user.id, content, imagePath, tag]
        );

        res.status(201).json({
            message: 'Post published successfully',
            postId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Teacher post creation error:', error);

        // Delete uploaded file if error occurs
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Failed to delete uploaded file:', unlinkError);
            }
        }

        res.status(500).json({ error: 'Failed to create post' });
    }
});

/**
 * GET /api/teacher/students/pending
 * List pending students
 */
router.get('/students/pending', async (req, res) => {
    try {
        const students = await query(`
      SELECT u.id, u.name, u.email, u.class, u.section, u.roll_number, u.school_id, u.created_at,
             u.id_card_photo,
             COALESCE(t.blocked_posts_count, 0) as blocked_posts_count
      FROM users u
      LEFT JOIN trust_signals t ON u.id = t.user_id
      WHERE u.role = 'student' AND u.approval_status = 'pending'
      ORDER BY u.created_at ASC
    `);

        res.json({ students });
    } catch (error) {
        console.error('Pending students error:', error);
        res.status(500).json({ error: 'Failed to fetch pending students' });
    }
});

/**
 * GET /api/teacher/students/approved
 * List approved students
 */
router.get('/students/approved', async (req, res) => {
    try {
        const students = await query(`
      SELECT u.id, u.name, u.email, u.class, u.section, u.roll_number, u.school_id, u.created_at,
             u.id_card_photo,
             COALESCE(t.blocked_posts_count, 0) as blocked_posts_count
      FROM users u
      LEFT JOIN trust_signals t ON u.id = t.user_id
      WHERE u.role = 'student' AND u.approval_status = 'approved'
      ORDER BY u.name ASC
    `);

        res.json({ students });
    } catch (error) {
        console.error('Approved students error:', error);
        res.status(500).json({ error: 'Failed to fetch approved students' });
    }
});

/**
 * GET /api/teacher/students/rejected
 * List rejected students
 */
router.get('/students/rejected', async (req, res) => {
    try {
        const students = await query(`
      SELECT u.id, u.name, u.email, u.class, u.section, u.roll_number, u.school_id, u.created_at,
             u.id_card_photo,
             COALESCE(t.blocked_posts_count, 0) as blocked_posts_count
      FROM users u
      LEFT JOIN trust_signals t ON u.id = t.user_id
      WHERE u.role = 'student' AND u.approval_status = 'rejected'
      ORDER BY u.created_at DESC
    `);

        res.json({ students });
    } catch (error) {
        console.error('Rejected students error:', error);
        res.status(500).json({ error: 'Failed to fetch rejected students' });
    }
});

/**
 * POST /api/teacher/students/:id/approve
 * Approve a student
 */
router.post('/students/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        await run(`UPDATE users SET approval_status = 'approved' WHERE id = ? AND role = 'student'`, [id]);

        res.json({ message: 'Student approved successfully' });
    } catch (error) {
        console.error('Approve student error:', error);
        res.status(500).json({ error: 'Failed to approve student' });
    }
});

/**
 * POST /api/teacher/students/:id/reject
 * Reject a student
 */
router.post('/students/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;

        await run(`UPDATE users SET approval_status = 'rejected' WHERE id = ? AND role = 'student'`, [id]);

        res.json({ message: 'Student rejected' });
    } catch (error) {
        console.error('Reject student error:', error);
        res.status(500).json({ error: 'Failed to reject student' });
    }
});

/**
 * GET /api/teacher/moderation/blocked
 * List AI-blocked posts
 */
router.get('/moderation/blocked', async (req, res) => {
    try {
        const posts = await query(`
      SELECT 
        p.id, p.content, p.image, p.tag, p.moderation_reason, p.created_at,
        u.id as author_id, u.name as author_name, u.class, u.section
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.moderation_status = 'blocked'
      ORDER BY p.created_at DESC
    `);

        res.json({ posts });
    } catch (error) {
        console.error('Blocked posts error:', error);
        res.status(500).json({ error: 'Failed to fetch blocked posts' });
    }
});

/**
 * POST /api/teacher/moderation/:id/approve
 * Approve a blocked post (human override)
 */
router.post('/moderation/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        await run(
            `UPDATE posts SET moderation_status = 'approved', moderation_reason = NULL WHERE id = ? AND moderation_status = 'blocked'`,
            [id]
        );

        res.json({ message: 'Post approved and published' });
    } catch (error) {
        console.error('Approve post error:', error);
        res.status(500).json({ error: 'Failed to approve post' });
    }
});

/**
 * POST /api/teacher/moderation/:id/reject
 * Permanently reject a blocked post
 */
router.post('/moderation/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;

        await run(`UPDATE posts SET moderation_status = 'rejected' WHERE id = ? AND moderation_status = 'blocked'`, [id]);

        res.json({ message: 'Post permanently rejected' });
    } catch (error) {
        console.error('Reject post error:', error);
        res.status(500).json({ error: 'Failed to reject post' });
    }
});

/**
 * GET /api/teacher/calendar
 * List all events
 */
router.get('/calendar', async (req, res) => {
    try {
        const events = await query(`
      SELECT id, title, date, type, color, created_at
      FROM events
      ORDER BY date ASC
    `);

        res.json({ events });
    } catch (error) {
        console.error('Calendar error:', error);
        res.status(500).json({ error: 'Failed to fetch calendar' });
    }
});

/**
 * POST /api/teacher/calendar
 * Create event
 */
router.post('/calendar', async (req, res) => {
    try {
        const { title, date, type } = req.body;

        if (!title || !date || !type) {
            return res.status(400).json({ error: 'Title, date, and type are required' });
        }

        if (!['exam', 'holiday', 'sports'].includes(type)) {
            return res.status(400).json({ error: 'Invalid event type' });
        }

        const color = config.eventTypes[type].color;

        const result = await run(
            `INSERT INTO events (title, date, type, color, created_by) VALUES (?, ?, ?, ?, ?)`,
            [title, date, type, color, req.user.id]
        );

        res.status(201).json({
            message: 'Event created successfully',
            eventId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

/**
 * PUT /api/teacher/calendar/:id
 * Update event
 */
router.put('/calendar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, type } = req.body;

        if (!title || !date || !type) {
            return res.status(400).json({ error: 'Title, date, and type are required' });
        }

        if (!['exam', 'holiday', 'sports'].includes(type)) {
            return res.status(400).json({ error: 'Invalid event type' });
        }

        const color = config.eventTypes[type].color;

        await run(`UPDATE events SET title = ?, date = ?, type = ?, color = ? WHERE id = ?`, [title, date, type, color, id]);

        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

/**
 * DELETE /api/teacher/calendar/:id
 * Delete event
 */
router.delete('/calendar/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await run('DELETE FROM events WHERE id = ?', [id]);

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

/**
 * POST /api/teacher/announcements
 * Create announcement
 */
router.post('/announcements', async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const result = await run(
            `INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)`,
            [title, content, req.user.id]
        );

        res.status(201).json({
            message: 'Announcement created successfully',
            announcementId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

/**
 * GET /api/teacher/trust-signals/:id
 * View student trust signals
 */
router.get('/trust-signals/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const student = await queryOne(`
      SELECT u.id, u.name, u.class, u.section, t.blocked_posts_count
      FROM users u
      LEFT JOIN trust_signals t ON u.id = t.user_id
      WHERE u.id = ? AND u.role = 'student'
    `, [id]);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json({ trustSignals: student });
    } catch (error) {
        console.error('Trust signals error:', error);
        res.status(500).json({ error: 'Failed to fetch trust signals' });
    }
});

export default router;
