import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'school.db');

let db = null;

// Initialize SQL.js
export async function getDatabase() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

// Save database to file
export function saveDatabase() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, data);
  }
}

// Initialize database schema
export async function initializeDatabase() {
  db = await getDatabase();

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher')),
      approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
      class TEXT,
      section TEXT,
      roll_number TEXT,
      school_id TEXT,
      profile_picture TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      id_card_photo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Posts table
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image TEXT,
      tag TEXT NOT NULL CHECK(tag IN ('#Academics', '#Sports', '#Art', '#Fest', '#Help')),
      moderation_status TEXT DEFAULT 'approved' CHECK(moderation_status IN ('pending', 'approved', 'blocked', 'rejected')),
      moderation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('exam', 'holiday', 'sports')),
      color TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Announcements table
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Trust signals table
  db.run(`
    CREATE TABLE IF NOT EXISTS trust_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      blocked_posts_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  saveDatabase();
  console.log('✅ Database schema initialized');
}

// Helper functions for querying
export function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function run(sql, params = []) {
  try {
    db.run(sql, params);
    saveDatabase();

    // Get last insert ID
    const result = queryOne('SELECT last_insert_rowid() as id');
    return {
      lastInsertRowid: result ? result.id : null,
      changes: 1 // sql.js doesn't provide this, so we assume success
    };
  } catch (error) {
    console.error('Run error:', error);
    throw error;
  }
}

export default { getDatabase, saveDatabase, initializeDatabase, query, queryOne, run };
