import { initializeDatabase, run, query, queryOne, saveDatabase } from './db.js';
import bcrypt from 'bcryptjs';

// Initialize database first
await initializeDatabase();

// Clear existing data
console.log('🗑️  Clearing existing data...');
run(`DELETE FROM trust_signals`, []);
run(`DELETE FROM announcements`, []);
run(`DELETE FROM events`, []);
run(`DELETE FROM posts`, []);
run(`DELETE FROM users`, []);

// Hash password helper
const hashPassword = (password) => bcrypt.hashSync(password, 10);

// Seed Users
console.log('👥 Seeding users...');

// Teachers (whitelisted)
run(`INSERT INTO users (name, email, password, role, approval_status, profile_picture) VALUES (?, ?, ?, 'teacher', 'approved', ?)`,
  ['Ms. Sarah Johnson', 'teacher1@school.edu', hashPassword('teacher123'), 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah']);

run(`INSERT INTO users (name, email, password, role, approval_status, profile_picture) VALUES (?, ?, ?, 'teacher', 'approved', ?)`,
  ['Mr. David Chen', 'teacher2@school.edu', hashPassword('teacher123'), 'https://api.dicebear.com/7.x/avataaars/svg?seed=david']);

// Students - Approved
run(`INSERT INTO users (name, email, password, role, approval_status, class, section, roll_number, school_id, profile_picture) VALUES (?, ?, ?, 'student', 'approved', ?, ?, ?, ?, ?)`,
  ['Priya Sharma', 'priya@student.edu', hashPassword('student123'), '10', 'A', '101', 'STU001', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya']);

run(`INSERT INTO users (name, email, password, role, approval_status, class, section, roll_number, school_id, profile_picture) VALUES (?, ?, ?, 'student', 'approved', ?, ?, ?, ?, ?)`,
  ['Rahul Verma', 'rahul@student.edu', hashPassword('student123'), '10', 'B', '102', 'STU002', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul']);

// Students - Pending
run(`INSERT INTO users (name, email, password, role, approval_status, class, section, roll_number, school_id, profile_picture) VALUES (?, ?, ?, 'student', 'pending', ?, ?, ?, ?, ?)`,
  ['Ananya Gupta', 'ananya@student.edu', hashPassword('student123'), '9', 'A', '201', 'STU003', 'https://api.dicebear.com/7.x/avataaars/svg?seed=ananya']);

run(`INSERT INTO users (name, email, password, role, approval_status, class, section, roll_number, school_id, profile_picture) VALUES (?, ?, ?, 'student', 'pending', ?, ?, ?, ?, ?)`,
  ['Karan Singh', 'karan@student.edu', hashPassword('student123'), '9', 'B', '202', 'STU004', 'https://api.dicebear.com/7.x/avataaars/svg?seed=karan']);

// Student - Rejected
run(`INSERT INTO users (name, email, password, role, approval_status, class, section, roll_number, school_id, profile_picture) VALUES (?, ?, ?, 'student', 'rejected', ?, ?, ?, ?, ?)`,
  ['Test Rejected', 'rejected@student.edu', hashPassword('student123'), '8', 'A', '301', 'STU005', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rejected']);

// Seed Posts
console.log('📝 Seeding posts...');

// Approved posts
run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'approved', NULL, datetime('now', '-5 hours'))`,
  [3, 'Excited for the upcoming Science Fair! Working on a renewable energy project. 🔬', '#Academics']);

run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'approved', NULL, datetime('now', '-4 hours'))`,
  [4, 'Our basketball team won the inter-school tournament! Great team effort! 🏀', '#Sports']);

run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'approved', NULL, datetime('now', '-3 hours'))`,
  [3, 'Check out my latest painting from art class! 🎨', '#Art']);

run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'approved', NULL, datetime('now', '-2 hours'))`,
  [4, 'The annual cultural fest was amazing! Thanks to all organizers! 🎉', '#Fest']);

run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'approved', NULL, datetime('now', '-1 hour'))`,
  [1, 'Reminder: Midterm exams start next week. Study schedule posted on notice board.', '#Academics']);

// AI-blocked posts
run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'blocked', 'Contains toxic language', datetime('now', '-6 hours'))`,
  [3, 'This homework is so stupid and the teacher is dumb!', '#Academics']);

run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'blocked', 'Negative sentiment detected', datetime('now', '-5 hours'))`,
  [4, 'I hate this school, everything is terrible here!', '#Fest']);

run(`INSERT INTO posts (user_id, content, tag, moderation_status, moderation_reason, created_at) VALUES (?, ?, ?, 'blocked', 'Contains toxic language', datetime('now', '-4 hours'))`,
  [3, 'That loser failed the test again, what an idiot!', '#Academics']);

// Seed Events
console.log('📅 Seeding events...');
run(`INSERT INTO events (title, date, type, color, created_by) VALUES (?, ?, 'exam', '#ef4444', 1)`,
  ['Mathematics Midterm Exam', '2026-01-15']);

run(`INSERT INTO events (title, date, type, color, created_by) VALUES (?, ?, 'exam', '#ef4444', 1)`,
  ['Science Practical Exam', '2026-01-18']);

run(`INSERT INTO events (title, date, type, color, created_by) VALUES (?, ?, 'holiday', '#22c55e', 1)`,
  ['Republic Day Celebration', '2026-01-26']);

run(`INSERT INTO events (title, date, type, color, created_by) VALUES (?, ?, 'holiday', '#22c55e', 2)`,
  ['Winter Break', '2026-01-30']);

run(`INSERT INTO events (title, date, type, color, created_by) VALUES (?, ?, 'sports', '#3b82f6', 2)`,
  ['Annual Sports Day', '2026-02-10']);

run(`INSERT INTO events (title, date, type, color, created_by) VALUES (?, ?, 'sports', '#3b82f6', 2)`,
  ['Cultural Festival', '2026-02-20']);

// Seed Announcements
console.log('📢 Seeding announcements...');
run(`INSERT INTO announcements (title, content, created_by, created_at) VALUES (?, ?, 1, datetime('now', '-2 days'))`,
  ['Exam Schedule Released', 'The midterm exam schedule has been posted. Please check the calendar for dates and prepare accordingly.']);

run(`INSERT INTO announcements (title, content, created_by, created_at) VALUES (?, ?, 2, datetime('now', '-1 day'))`,
  ['Sports Day Registration', 'Registration for Annual Sports Day is now open. Students interested in participating should contact the sports coordinator.']);

run(`INSERT INTO announcements (title, content, created_by, created_at) VALUES (?, ?, 1, datetime('now', '-12 hours'))`,
  ['Library Timing Change', 'The school library will now remain open until 6 PM on weekdays. Make use of the extended hours for your studies.']);

// Seed Trust Signals
console.log('🔒 Seeding trust signals...');
run(`INSERT INTO trust_signals (user_id, blocked_posts_count) VALUES (?, ?)`, [3, 2]);
run(`INSERT INTO trust_signals (user_id, blocked_posts_count) VALUES (?, ?)`, [4, 1]);

console.log('✅ Database seeded successfully!');
console.log('\n📊 Demo Credentials:');
console.log('─────────────────────────────────');
console.log('TEACHERS:');
console.log('  📧 teacher1@school.edu / teacher123');
console.log('  📧 teacher2@school.edu / teacher123');
console.log('\nAPPROVED STUDENTS:');
console.log('  📧 priya@student.edu / student123');
console.log('  📧 rahul@student.edu / student123');
console.log('\nPENDING STUDENTS:');
console.log('  📧 ananya@student.edu / student123');
console.log('  📧 karan@student.edu / student123');
console.log('─────────────────────────────────\n');

process.exit(0);
