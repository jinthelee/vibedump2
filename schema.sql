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

INSERT OR IGNORE INTO site_settings (key, value) VALUES
  ('site_title', '바이브덤프 - 바이브코딩 사이트 큐레이션'),
  ('slogan', '바이브코딩 사이트 큐레이션'),
  ('slogan_history', '["바이브코딩 사이트 큐레이션","인터넷은 아직 재밌다","웹이라는 게 숨긴다고 숨겨지는 것도 아니고","덤프 진행하겠습니다..."]'),
  ('categories', '["생산성","비즈니스","창작","게임","체크리스트","사주타로","밈","덕질","라이프","학습","소셜","캐릭터소셜"]'),
  ('show_ads', 'false');

INSERT OR IGNORE INTO tags (name, normalized_name, status, created_at) VALUES
  ('웹앱', '웹앱', 'approved', datetime('now')),
  ('웹게임', '웹게임', 'approved', datetime('now')),
  ('글쓰기', '글쓰기', 'approved', datetime('now')),
  ('기록', '기록', 'approved', datetime('now')),
  ('대시보드', '대시보드', 'approved', datetime('now')),
  ('디자인', '디자인', 'approved', datetime('now')),
  ('템플릿', '템플릿', 'approved', datetime('now')),
  ('메모', '메모', 'approved', datetime('now')),
  ('분석', '분석', 'approved', datetime('now')),
  ('생산성', '생산성', 'approved', datetime('now')),
  ('AI챗', 'ai챗', 'approved', datetime('now')),
  ('시각화', '시각화', 'approved', datetime('now')),
  ('자동화', '자동화', 'approved', datetime('now')),
  ('협업', '협업', 'approved', datetime('now'));
