import express from 'express';
import { query, queryOne, run } from '../database/db.js';
import { authenticate, requireApproved, requireRole } from '../middleware/auth.js';
import { moderatePost, getModerationMessage } from '../services/moderation.js';
import upload from '../middleware/upload.js';
import fs from 'fs';

const router = express.Router();

// All student routes require authentication and approval
router.use(authenticate, requireApproved, requireRole('student'));

/**
 * GET /api/student/dashboard
 * Get dashboard summary
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Get next exam
        const nextExam = await queryOne(`
      SELECT title, date FROM events 
      WHERE type = 'exam' AND date >= date('now')
      ORDER BY date ASC LIMIT 1
    `);

        // Get upcoming event
        const upcomingEvent = await queryOne(`
      SELECT title, date, type FROM events 
      WHERE type != 'exam' AND date >= date('now')
      ORDER BY date ASC LIMIT 1
    `);

        // Get latest announcement
        const latestAnnouncement = await queryOne(`
      SELECT a.title, a.content, a.created_at, u.name as author
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC LIMIT 1
    `);

        res.json({
            user: req.user,
            snapshot: {
                nextExam,
                upcomingEvent,
                latestAnnouncement
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});

/**
 * GET /api/student/feed
 * Get school feed (paginated)
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
 * POST /api/student/post
 * Create a new post (with AI moderation and file upload)
 * Students posts go through AI moderation
 * Images are NOT analyzed by AI - only text content is moderated
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

        // AI Moderation (TEXT ONLY - images are never analyzed)
        const moderation = moderatePost(content);

        if (!moderation.approved) {
            // Text failed moderation - delete uploaded image and block the post
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            // Store blocked post in database (without image since it was deleted)
            await run(
                `INSERT INTO posts (user_id, content, image, tag, moderation_status, moderation_reason)
         VALUES (?, ?, NULL, ?, 'blocked', ?)`,
                [req.user.id, content, tag, moderation.reason]
            );

            // Increment trust signal
            await run(
                `UPDATE trust_signals 
         SET blocked_posts_count = blocked_posts_count + 1 
         WHERE user_id = ?`,
                [req.user.id]
            );

            return res.status(400).json({
                error: getModerationMessage(false, moderation.reason),
                blocked: true
            });
        }

        // Text is approved - publish post with image (if uploaded)
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
        console.error('Post creation error:', error);

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
 * GET /api/student/calendar
 * View all events
 */
router.get('/calendar', async (req, res) => {
    try {
        const type = req.query.type;

        let sql = 'SELECT id, title, date, type, color FROM events';
        let params = [];

        if (type && ['exam', 'holiday', 'sports'].includes(type)) {
            sql += ' WHERE type = ?';
            params.push(type);
        }

        sql += ' ORDER BY date ASC';

        const events = params.length > 0 ? await query(sql, params) : await query(sql);
        res.json({ events });
    } catch (error) {
        console.error('Calendar error:', error);
        res.status(500).json({ error: 'Failed to fetch calendar' });
    }
});

/**
 * GET /api/student/announcements
 * View all announcements
 */
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await query(`
      SELECT 
        a.id, a.title, a.content, a.created_at,
        u.name as author_name
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `);

        res.json({ announcements });
    } catch (error) {
        console.error('Announcements error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

export default router;
