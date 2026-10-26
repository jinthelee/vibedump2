import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function resolveDbPath(): string {
  const envPath = process.env.DATABASE_PATH?.trim();
  if (envPath && (envPath.endsWith('.db') || envPath.includes('/') || envPath.includes('\\'))) {
    return path.resolve(envPath);
  }
  return path.join(DATA_DIR, 'vibedump.db');
}

const DB_PATH = resolveDbPath();
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      short_desc TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      thumbnail_url TEXT,
      screenshot_url TEXT,
      maker_name TEXT,
      maker_email TEXT,
      maker_code_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      views_count INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      normalized_name TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_tags (
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (service_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      content TEXT NOT NULL,
      author_name TEXT DEFAULT '익명의 바이브 탐험가',
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      client_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(service_id, type, client_token)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      client_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(service_id, client_token)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maker_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      post_type TEXT NOT NULL DEFAULT 'notice',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS curations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      badge_text TEXT NOT NULL,
      editorial_blurb TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      slot_type TEXT NOT NULL DEFAULT 'feed_sponsor',
      status TEXT NOT NULL DEFAULT 'active',
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
    CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
    CREATE INDEX IF NOT EXISTS idx_services_created ON services(created_at);
    CREATE INDEX IF NOT EXISTS idx_service_tags_tag ON service_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id);
    CREATE INDEX IF NOT EXISTS idx_reactions_service ON reactions(service_id);
  `);

  // Safe orphan cleanup without touching any registered services
  db.exec(`
    DELETE FROM curations WHERE service_id NOT IN (SELECT id FROM services);
    DELETE FROM reviews WHERE service_id NOT IN (SELECT id FROM services);
    DELETE FROM maker_posts WHERE service_id NOT IN (SELECT id FROM services);
    DELETE FROM promotions WHERE service_id NOT IN (SELECT id FROM services);
    DELETE FROM reactions WHERE service_id NOT IN (SELECT id FROM services);
    DELETE FROM favorites WHERE service_id NOT IN (SELECT id FROM services);
    DELETE FROM service_tags WHERE service_id NOT IN (SELECT id FROM services);
  `);

  seedInitialData();
}

export function hashMakerCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export function generateMakerCode(): string {
  return 'vd_' + crypto.randomBytes(8).toString('hex');
}

export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s\-_]+/g, '').replace(/[#@$%^&*]/g, '');
}

function seedInitialData() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM tags');
  const countResult = countStmt.get() as { count: number };

  const now = new Date().toISOString();

  // Seed site settings if not present
  const sloganRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('slogan');
  if (!sloganRow) {
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('slogan', '인터넷은 아직 재밌다');
  }

  const showAdsRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('show_ads');
  if (!showAdsRow) {
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('show_ads', 'false');
  }

  const siteTitleRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('site_title') as { value: string } | undefined;
  if (!siteTitleRow || siteTitleRow.value === '바이브덤프 - 인터넷은 아직 재밌다') {
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('site_title', '바이브덤프 - 바이브코딩 사이트 큐레이션');
  }

  const historyRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('slogan_history');
  if (!historyRow) {
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(
      'slogan_history',
      JSON.stringify(['인터넷은 아직 재밌다', '웹이라는 게 숨긴다고 숨겨지는 것도 아니고', '덤프 진행하겠습니다...'])
    );
  }

  const catRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('categories');
  const defaultCategories = [
    '생산성', '비즈니스', '창작', '게임', '체크리스트', '사주타로',
    '밈', '덕질', '라이프', '학습', '소셜', '캐릭터소셜'
  ];
  if (!catRow) {
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(
      'categories',
      JSON.stringify(defaultCategories)
    );
  }

  // Ensure requested 14 primary tags are always seeded and approved
  const requestedTags = [
    '웹앱', '웹게임', '글쓰기', '기록', '대시보드', '디자인', '템플릿',
    '메모', '분석', '생산성', 'AI챗', '시각화', '자동화', '협업'
  ];
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, normalized_name, status, created_at) VALUES (?, ?, ?, ?)');
  for (const tag of requestedTags) {
    insertTag.run(tag, normalizeTagName(tag), 'approved', now);
  }
}

export function seedAdminTestData() {
  // Safe no-op in production
}
