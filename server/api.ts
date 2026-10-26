import { Router, Request, Response, NextFunction } from 'express';
import { db, hashMakerCode, generateMakerCode, normalizeTagName, seedAdminTestData } from './db.js';

export const apiRouter = Router();

// Rate limiting in-memory map
const requestCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || entry.resetAt < now) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

// Default categories requested by operator
export const DEFAULT_CATEGORIES = [
  '생산성', '비즈니스', '창작', '게임', '체크리스트', '사주타로',
  '밈', '덕질', '라이프', '학습', '소셜', '캐릭터소셜'
] as const;

export const VALID_CATEGORIES = DEFAULT_CATEGORIES;

export function getCategories(): string[] {
  try {
    const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('categories') as { value: string } | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim());
      }
    }
  } catch {}
  return [...DEFAULT_CATEGORIES];
}

export function saveCategories(categories: string[]) {
  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(
    'categories',
    JSON.stringify(categories)
  );
}

// Admin authentication helper: checks environment variable and custom set password
function getValidAdminPasscodes(): Set<string> {
  const valid = new Set<string>();
  const envSecret = process.env.ADMIN_SECRET?.trim();
  if (envSecret) {
    valid.add(envSecret);
  } else {
    valid.add('vibedump-admin-2026');
  }

  // Check if operator set a custom password in site_settings
  try {
    const customPassRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('custom_admin_password') as { value: string } | undefined;
    if (customPassRow && customPassRow.value.trim()) {
      valid.add(customPassRow.value.trim());
    }
  } catch {}

  return valid;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-admin-token'];
  const token = (customHeader as string) || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '');

  const validCodes = getValidAdminPasscodes();
  if (!token || !validCodes.has(token)) {
    return res.status(401).json({ error: '관리자 권한이 필요합니다. 올바른 관리자 토큰을 제공해주세요.' });
  }
  next();
}

// Maker verification helper
function verifyMaker(serviceId: number, makerCode: string): boolean {
  if (!makerCode) return false;
  const targetHash = hashMakerCode(makerCode);
  const row = db.prepare('SELECT maker_code_hash FROM services WHERE id = ?').get(serviceId) as { maker_code_hash: string } | undefined;
  return !!row && row.maker_code_hash === targetHash;
}

// URL format validation helper (security: PRD 9.2)
function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Image URL format validation helper (blocks javascript: or other harmful protocols)
function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('data:image/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

// Sanitized public service query
function getPublicServiceRow(id: number): Record<string, any> | null {
  const service = db.prepare(`
    SELECT
      id, name, url, short_desc, description, category,
      thumbnail_url, screenshot_url, maker_name,
      status, views_count, likes_count, created_at, updated_at
    FROM services
    WHERE id = ?
  `).get(id) as Record<string, any> | undefined;

  if (!service) return null;

  // Fetch tags
  const tags = db.prepare(`
    SELECT t.id, t.name
    FROM tags t
    JOIN service_tags st ON t.id = st.tag_id
    WHERE st.service_id = ? AND t.status = 'approved'
  `).all(id) as { id: number; name: string }[];

  // Fetch reactions breakdown
  const reactions = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM reactions
    WHERE service_id = ?
    GROUP BY type
  `).all(id) as { type: string; count: number }[];

  // Fetch curation status if active
  const curation = db.prepare(`
    SELECT badge_text, editorial_blurb
    FROM curations
    WHERE service_id = ? AND is_active = 1
  `).get(id) as { badge_text: string; editorial_blurb: string } | undefined;

  // Fetch active promotion status if any
  const promotion = db.prepare(`
    SELECT id, slot_type
    FROM promotions
    WHERE service_id = ? AND status = 'active'
      AND datetime('now') BETWEEN datetime(start_date) AND datetime(end_date)
  `).get(id) as { id: number; slot_type: string } | undefined;

  return {
    ...service,
    tags: tags.map(t => t.name),
    reactions: reactions.reduce((acc, r) => ({ ...acc, [r.type]: r.count }), {}),
    curation: curation || null,
    is_sponsored: !!promotion,
    sponsor_slot: promotion?.slot_type || null,
    sponsor_id: promotion?.id || null
  };
}

// -------------------------------------------------------------
// Public Endpoints
// -------------------------------------------------------------

// 1. GET /api/services (Search, Filter by Category, Tag, Sort)
apiRouter.get('/services', (req: Request, res: Response) => {
  const { category, tag, q, sort = 'latest', limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT DISTINCT
      s.id, s.name, s.url, s.short_desc, s.description, s.category,
      s.thumbnail_url, s.screenshot_url, s.maker_name,
      s.status, s.views_count, s.likes_count, s.created_at, s.updated_at
    FROM services s
  `;
  const params: any[] = [];
  const whereClauses: string[] = ["s.status = 'approved'"];

  if (category && typeof category === 'string' && category !== 'all') {
    whereClauses.push('s.category = ?');
    params.push(category);
  }

  if (tag && typeof tag === 'string') {
    query += ` JOIN service_tags st ON s.id = st.service_id JOIN tags t ON st.tag_id = t.id `;
    whereClauses.push('t.name = ?');
    params.push(tag);
  }

  if (q && typeof q === 'string' && q.trim()) {
    const searchTerm = `%${q.trim()}%`;
    whereClauses.push('(s.name LIKE ? OR s.short_desc LIKE ? OR s.description LIKE ?)');
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  // Sorting
  if (sort === 'popular') {
    query += ' ORDER BY s.likes_count DESC, s.created_at DESC';
  } else if (sort === 'views') {
    query += ' ORDER BY s.views_count DESC, s.created_at DESC';
  } else if (sort === 'reviews') {
    query += ' ORDER BY (SELECT COUNT(*) FROM reviews r WHERE r.service_id = s.id AND r.status = "published") DESC, s.created_at DESC';
  } else {
    query += ' ORDER BY s.created_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(Math.min(Number(limit) || 50, 100), Math.max(Number(offset) || 0, 0));

  const rows = db.prepare(query).all(...params) as Record<string, any>[];

  // Attach tags and sponsorship status
  const services = rows.map(s => {
    const tags = db.prepare(`
      SELECT t.name FROM tags t
      JOIN service_tags st ON t.id = st.tag_id
      WHERE st.service_id = ? AND t.status = 'approved'
    `).all(s.id) as { name: string }[];

    const promo = db.prepare(`
      SELECT id, slot_type FROM promotions
      WHERE service_id = ? AND status = 'active'
        AND datetime('now') BETWEEN datetime(start_date) AND datetime(end_date)
    `).get(s.id) as { id: number; slot_type: string } | undefined;

    const curation = db.prepare(`
      SELECT badge_text, editorial_blurb FROM curations
      WHERE service_id = ? AND is_active = 1
    `).get(s.id) as { badge_text: string; editorial_blurb: string } | undefined;

    return {
      ...s,
      tags: tags.map(t => t.name),
      is_sponsored: !!promo,
      sponsor_id: promo?.id || null,
      sponsor_slot: promo?.slot_type || null,
      curation: curation || null
    };
  });

  // Track impressions for sponsored items found
  for (const s of services) {
    if (s.sponsor_id) {
      db.prepare('UPDATE promotions SET impressions = impressions + 1 WHERE id = ?').run(s.sponsor_id);
    }
  }

  res.json({ services, count: services.length });
});

// 2. GET /api/services/:id (Details, Maker notices, Reviews)
apiRouter.get('/services/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: '유효한 서비스 ID가 아닙니다.' });

  const service = getPublicServiceRow(id);
  if (!service) return res.status(404).json({ error: '해당 서비스를 찾을 수 없습니다.' });

  // Increment view counter safely
  db.prepare('UPDATE services SET views_count = views_count + 1 WHERE id = ?').run(id);

  // Reviews
  const reviews = db.prepare(`
    SELECT id, rating, content, author_name, created_at
    FROM reviews
    WHERE service_id = ? AND status = 'published'
    ORDER BY created_at DESC
  `).all(id);

  // Maker posts
  const makerPosts = db.prepare(`
    SELECT id, title, content, post_type, created_at
    FROM maker_posts
    WHERE service_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Related services (same category or shared tags)
  const related = db.prepare(`
    SELECT id, name, short_desc, category, thumbnail_url, likes_count
    FROM services
    WHERE category = ? AND id != ? AND status = 'approved'
    ORDER BY likes_count DESC
    LIMIT 4
  `).all(service.category, id);

  res.json({
    service: {
      ...service,
      views_count: service.views_count + 1
    },
    reviews,
    maker_posts: makerPosts,
    related
  });
});

// 3. POST /api/services (Register a new service)
apiRouter.post('/services', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip, 10, 60000)) {
    return res.status(429).json({ error: '요청이 너무 많습니다. 1분 후 다시 시도해주세요.' });
  }

  const {
    name,
    url,
    short_desc,
    description,
    category,
    tags = [],
    thumbnail_url,
    screenshot_url,
    maker_name,
    maker_email
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 80) {
    return res.status(400).json({ error: '서비스명을 1~80자 이내로 입력해주세요.' });
  }

  if (!url || !isValidExternalUrl(url)) {
    return res.status(400).json({ error: '유효한 웹사이트 URL(http/https)을 입력해주세요.' });
  }

  if (!short_desc || typeof short_desc !== 'string' || short_desc.trim().length === 0 || short_desc.length > 150) {
    return res.status(400).json({ error: '한 줄 소개를 1~150자 이내로 입력해주세요.' });
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: '상세 설명을 입력해주세요.' });
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0 || category.trim().length > 40) {
    return res.status(400).json({ error: '대표 카테고리를 선택하거나 입력해주세요.' });
  }

  if (!Array.isArray(tags) || tags.length === 0 || tags.length > 5) {
    return res.status(400).json({ error: '주요 태그는 1개 이상 5개 이하로 선택해야 합니다.' });
  }

  // Generate secure Maker Access Code
  const plainMakerCode = generateMakerCode();
  const makerCodeHash = hashMakerCode(plainMakerCode);
  const now = new Date().toISOString();

  const isCustomCategory = Boolean(req.body.is_custom_category) || !VALID_CATEGORIES.includes(category.trim() as any);
  const initialStatus = isCustomCategory ? 'pending' : 'approved';

  const insertService = db.prepare(`
    INSERT INTO services (
      name, url, short_desc, description, category,
      thumbnail_url, screenshot_url, maker_name, maker_email,
      maker_code_hash, status, views_count, likes_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
  `);

  const safeThumbnail = sanitizeImageUrl(thumbnail_url);
  const safeScreenshot = sanitizeImageUrl(screenshot_url) || safeThumbnail;

  const result = insertService.run(
    name.trim(),
    url.trim(),
    short_desc.trim(),
    description.trim(),
    category.trim(),
    safeThumbnail,
    safeScreenshot,
    maker_name?.trim() || null,
    maker_email?.trim() || null,
    makerCodeHash,
    initialStatus,
    now,
    now
  );

  const serviceId = Number(result.lastInsertRowid);

  // Link tags (and auto-create approved tag if not exists)
  const getTag = db.prepare('SELECT id FROM tags WHERE normalized_name = ?');
  const insertTag = db.prepare('INSERT INTO tags (name, normalized_name, status, created_at) VALUES (?, ?, ?, ?)');
  const linkServiceTag = db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)');

  for (const rawTag of tags) {
    const tagName = String(rawTag).trim();
    if (!tagName) continue;
    const norm = normalizeTagName(tagName);
    let tagRow = getTag.get(norm) as { id: number } | undefined;
    if (!tagRow) {
      const resTag = insertTag.run(tagName, norm, 'approved', now);
      tagRow = { id: Number(resTag.lastInsertRowid) };
    }
    linkServiceTag.run(serviceId, tagRow.id);
  }

  // PRD 7.1: Return the maker code ONCE so maker can preserve it.
  res.status(201).json({
    success: true,
    service_id: serviceId,
    maker_code: plainMakerCode,
    status: initialStatus,
    message: isCustomCategory
      ? '직접 제안하신 신규 카테고리는 운영자 심사 대기(pending) 상태로 접수되었습니다. 검토 및 승인 후 둘러보기 피드에 공개됩니다.'
      : '서비스가 성공적으로 등록되었습니다! 제공된 제작자 코드는 서비스 관리 및 공지 작성에 필요하므로 안전하게 보관하세요.'
  });
});

// 4. GET /api/categories (Dynamic categories with counts)
apiRouter.get('/categories', (_req: Request, res: Response) => {
  const cats = getCategories();
  const counts = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM services
    WHERE status = 'approved'
    GROUP BY category
  `).all() as { category: string; count: number }[];

  const countMap = new Map(counts.map((c) => [c.category, c.count]));

  // Start with operator defined categories in priority order, then append any other categories in use
  const allCatSet = new Set(cats);
  for (const c of counts) {
    if (c.category && !allCatSet.has(c.category)) {
      allCatSet.add(c.category);
    }
  }

  const result = Array.from(allCatSet).map((name) => ({
    name,
    count: countMap.get(name) || 0,
  }));

  res.json({ categories: result });
});

// 5. GET /api/tags (Tag statistics: prioritized primary 14 tags)
apiRouter.get('/tags', (req: Request, res: Response) => {
  const { sort = 'count', limit = 50 } = req.query;

  let query = `
    SELECT
      t.id, t.name, t.normalized_name, t.created_at,
      COUNT(DISTINCT st.service_id) as service_count,
      SUM(CASE WHEN datetime(s.created_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as recent_growth
    FROM tags t
    LEFT JOIN service_tags st ON t.id = st.tag_id
    LEFT JOIN services s ON st.service_id = s.id AND s.status = 'approved'
    WHERE t.status = 'approved'
    GROUP BY t.id
  `;

  if (sort === 'trending') {
    query += ' ORDER BY recent_growth DESC, service_count DESC';
  } else if (sort === 'name') {
    query += ' ORDER BY t.name ASC';
  } else {
    query += ` ORDER BY
      CASE t.name
        WHEN '웹앱' THEN 1
        WHEN '웹게임' THEN 2
        WHEN '글쓰기' THEN 3
        WHEN '기록' THEN 4
        WHEN '대시보드' THEN 5
        WHEN '디자인' THEN 6
        WHEN '템플릿' THEN 7
        WHEN '메모' THEN 8
        WHEN '분석' THEN 9
        WHEN '생산성' THEN 10
        WHEN 'AI챗' THEN 11
        WHEN '시각화' THEN 12
        WHEN '자동화' THEN 13
        WHEN '협업' THEN 14
        ELSE 999
      END ASC,
      service_count DESC,
      t.id ASC`;
  }

  query += ' LIMIT ?';
  const tags = db.prepare(query).all(Math.min(Number(limit) || 50, 100));
  res.json({ tags });
});

// 6. POST /api/tags/suggest (Suggest a new tag or check similarities)
apiRouter.post('/tags/suggest', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '태그 이름을 입력해주세요.' });
  }

  const cleanName = name.trim();
  const normalized = normalizeTagName(cleanName);

  // Check exact match
  const exact = db.prepare('SELECT id, name, status FROM tags WHERE normalized_name = ?').get(normalized) as { id: number; name: string; status: string } | undefined;
  if (exact) {
    return res.json({
      match_type: 'exact',
      tag: exact,
      message: '이미 등록된 태그가 있습니다.'
    });
  }

  // Check partial / similar match
  const similar = db.prepare(`
    SELECT id, name
    FROM tags
    WHERE normalized_name LIKE ? AND status = 'approved'
    LIMIT 5
  `).all(`%${normalized}%`) as { id: number; name: string }[];

  const now = new Date().toISOString();
  const ins = db.prepare('INSERT INTO tags (name, normalized_name, status, created_at) VALUES (?, ?, ?, ?)').run(
    cleanName, normalized, 'pending', now
  );

  res.status(201).json({
    match_type: 'created',
    tag: { id: Number(ins.lastInsertRowid), name: cleanName, status: 'pending' },
    similar_tags: similar,
    message: '새 태그가 제안되었습니다. 운영진 검토 후 정식 태그로 등록됩니다.'
  });
});

// 7. GET /api/curations (Featured items: "이번 주의 발견", Editor's picks)
apiRouter.get('/curations', (_req: Request, res: Response) => {
  const curations = db.prepare(`
    SELECT
      c.id as curation_id, c.badge_text, c.editorial_blurb, c.display_order,
      s.id, s.name, s.url, s.short_desc, s.category, s.thumbnail_url, s.screenshot_url, s.likes_count, s.views_count
    FROM curations c
    JOIN services s ON c.service_id = s.id
    WHERE c.is_active = 1 AND s.status = 'approved'
    ORDER BY c.display_order ASC, c.created_at DESC
  `).all() as Record<string, any>[];

  // Attach tags
  const withTags = curations.map(c => {
    const tags = db.prepare(`
      SELECT t.name FROM tags t
      JOIN service_tags st ON t.id = st.tag_id
      WHERE st.service_id = ? AND t.status = 'approved'
    `).all(c.id) as { name: string }[];
    return { ...c, tags: tags.map(t => t.name) };
  });

  res.json({ curations: withTags });
});

// 8. POST /api/services/:id/reactions (Add or toggle reactions)
apiRouter.post('/services/:id/reactions', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id);
  const { type = 'like', client_token } = req.body;

  if (!serviceId) return res.status(400).json({ error: '유효한 서비스 ID가 아닙니다.' });
  if (!client_token || typeof client_token !== 'string') {
    return res.status(400).json({ error: '클라이언트 토큰이 누락되었습니다.' });
  }

  const validTypes = ['like', 'cheer', 'helpful', 'fresh', 'amazed', 'fire', 'heart', 'rocket', 'mind_blown'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: '유효하지 않은 반응 종류입니다.' });
  }

  const existing = db.prepare(`
    SELECT id FROM reactions
    WHERE service_id = ? AND type = ? AND client_token = ?
  `).get(serviceId, type, client_token);

  if (existing) {
    // Remove reaction (toggle)
    db.prepare('DELETE FROM reactions WHERE id = ?').run((existing as { id: number }).id);
    if (type === 'like') {
      db.prepare('UPDATE services SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(serviceId);
    }
  } else {
    // Add reaction
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO reactions (service_id, type, client_token, created_at)
      VALUES (?, ?, ?, ?)
    `).run(serviceId, type, client_token, now);

    if (type === 'like') {
      db.prepare('UPDATE services SET likes_count = likes_count + 1 WHERE id = ?').run(serviceId);
    }
  }

  // Return updated counts
  const updatedReactions = db.prepare(`
    SELECT type, COUNT(*) as count FROM reactions WHERE service_id = ? GROUP BY type
  `).all(serviceId) as { type: string; count: number }[];

  const serviceRow = db.prepare('SELECT likes_count FROM services WHERE id = ?').get(serviceId) as { likes_count: number };

  res.json({
    success: true,
    toggled_off: !!existing,
    likes_count: serviceRow?.likes_count || 0,
    reactions: updatedReactions.reduce((acc, r) => ({ ...acc, [r.type]: r.count }), {})
  });
});

// 9. POST /api/services/:id/reviews (Submit user review)
apiRouter.post('/services/:id/reviews', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id);
  const { rating, content, author_name } = req.body;

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip, 15, 60000)) {
    return res.status(429).json({ error: '요청 빈도 제한을 초과했습니다. 잠시 후 다시 작성해주세요.' });
  }

  if (!serviceId) return res.status(400).json({ error: '유효한 서비스 ID가 아닙니다.' });
  const numRating = Number(rating);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: '평점은 1~5점 사이여야 합니다.' });
  }

  if (!content || typeof content !== 'string' || content.trim().length < 2 || content.length > 500) {
    return res.status(400).json({ error: '후기 내용은 2자 이상 500자 이하로 작성해주세요.' });
  }

  const now = new Date().toISOString();
  const safeAuthor = (author_name && typeof author_name === 'string' && author_name.trim().slice(0, 30)) || '익명의 덤퍼';

  const insert = db.prepare(`
    INSERT INTO reviews (service_id, rating, content, author_name, status, created_at)
    VALUES (?, ?, ?, ?, 'published', ?)
  `).run(serviceId, Math.round(numRating), content.trim(), safeAuthor, now);

  res.status(201).json({
    success: true,
    review: {
      id: Number(insert.lastInsertRowid),
      service_id: serviceId,
      rating: Math.round(numRating),
      content: content.trim(),
      author_name: safeAuthor,
      created_at: now
    }
  });
});

// 10. POST /api/services/:id/favorite (Toggle bookmark)
apiRouter.post('/services/:id/favorite', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id);
  const { client_token } = req.body;

  if (!serviceId || !client_token) {
    return res.status(400).json({ error: '서비스 ID와 클라이언트 토큰이 필요합니다.' });
  }

  const existing = db.prepare('SELECT id FROM favorites WHERE service_id = ? AND client_token = ?').get(serviceId, client_token);

  let isFavorited = false;
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run((existing as { id: number }).id);
    isFavorited = false;
  } else {
    db.prepare('INSERT INTO favorites (service_id, client_token, created_at) VALUES (?, ?, ?)').run(
      serviceId, client_token, new Date().toISOString()
    );
    isFavorited = true;
  }

  res.json({ success: true, is_favorited: isFavorited });
});

// 11. GET /api/favorites (Get bookmarked services by client token)
apiRouter.get('/favorites', (req: Request, res: Response) => {
  const token = req.query.client_token as string;
  if (!token) return res.json({ favorites: [] });

  const rows = db.prepare(`
    SELECT s.id, s.name, s.url, s.short_desc, s.description, s.category,
           s.thumbnail_url, s.screenshot_url, s.maker_name, s.likes_count,
           s.views_count, s.status, s.created_at, s.updated_at
    FROM favorites f
    JOIN services s ON f.service_id = s.id
    WHERE f.client_token = ? AND s.status = 'approved'
    ORDER BY f.created_at DESC
  `).all(token) as Record<string, any>[];

  const withTags = rows.map(s => {
    const tags = db.prepare(`
      SELECT t.name FROM tags t
      JOIN service_tags st ON t.id = st.tag_id
      WHERE st.service_id = ? AND t.status = 'approved'
    `).all(s.id) as { name: string }[];
    return {
      ...s,
      tags: tags.map(t => t.name)
    };
  });

  res.json({ favorites: withTags });
});

// 12. POST /api/reports (Report inappropriate service or review)
apiRouter.post('/reports', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip, 5, 60000)) {
    return res.status(429).json({ error: '신고 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
  }

  const { target_type, target_id, reason, details } = req.body;
  if (!['service', 'review'].includes(target_type)) {
    return res.status(400).json({ error: '올바른 신고 대상을 선택해주세요.' });
  }
  if (!target_id || !reason) {
    return res.status(400).json({ error: '신고 사유를 작성해주세요.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reports (target_type, target_id, reason, details, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(target_type, Number(target_id), String(reason).trim(), details ? String(details).trim() : null, now);

  res.json({ success: true, message: '신고가 접수되었습니다. 운영팀에서 신속히 검토하겠습니다.' });
});

// 13. POST /api/promotions/:id/click (Track clicks on sponsored items)
apiRouter.post('/promotions/:id/click', (req: Request, res: Response) => {
  const promoId = Number(req.params.id);
  if (promoId) {
    db.prepare('UPDATE promotions SET clicks = clicks + 1 WHERE id = ?').run(promoId);
  }
  res.json({ success: true });
});

// -------------------------------------------------------------
// Maker Endpoints (Verified via Maker Access Code)
// -------------------------------------------------------------

// Verify maker code
apiRouter.post('/maker/verify', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`maker_verify_${ip}`, 15, 60000)) {
    return res.status(429).json({ error: '인증 시도가 너무 많습니다. 1분 후 다시 시도해주세요.' });
  }

  const { service_id, maker_code } = req.body;
  if (!service_id || !maker_code) {
    return res.status(400).json({ error: '서비스 ID와 제작자 코드를 입력해주세요.' });
  }

  const valid = verifyMaker(Number(service_id), String(maker_code));
  if (!valid) {
    return res.status(401).json({ error: '제작자 코드가 일치하지 않습니다.' });
  }

  const service = db.prepare(`
    SELECT id, name, url, short_desc, description, category, thumbnail_url, screenshot_url, maker_name, maker_email, views_count, likes_count, status
    FROM services WHERE id = ?
  `).get(Number(service_id)) as Record<string, any> | undefined;

  if (!service) {
    return res.status(404).json({ error: '서비스를 찾을 수 없습니다.' });
  }

  const tags = db.prepare(`
    SELECT t.name FROM tags t
    JOIN service_tags st ON t.id = st.tag_id
    WHERE st.service_id = ? AND t.status = 'approved'
  `).all(Number(service_id)) as { name: string }[];

  res.json({
    success: true,
    service: {
      ...service,
      tags: tags.map(t => t.name)
    }
  });
});

// Maker update service info
apiRouter.put('/maker/services/:id', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id);
  const {
    maker_code, name, url, short_desc, description, category,
    thumbnail_url, screenshot_url, maker_name, maker_email, tags
  } = req.body;

  if (!verifyMaker(serviceId, String(maker_code))) {
    return res.status(401).json({ error: '권한이 없습니다. 유효한 제작자 코드가 필요합니다.' });
  }

  if (name && (name.length < 1 || name.length > 80)) {
    return res.status(400).json({ error: '서비스명은 1~80자 사이여야 합니다.' });
  }

  if (url && !isValidExternalUrl(url)) {
    return res.status(400).json({ error: '유효한 웹사이트 URL(http/https)을 입력해주세요.' });
  }

  if (short_desc && (short_desc.length < 1 || short_desc.length > 150)) {
    return res.status(400).json({ error: '한 줄 소개는 1~150자 사이여야 합니다.' });
  }

  const safeThumbnail = thumbnail_url !== undefined ? sanitizeImageUrl(thumbnail_url) : undefined;
  const safeScreenshot = screenshot_url !== undefined ? sanitizeImageUrl(screenshot_url) : undefined;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE services
    SET
      name = COALESCE(?, name),
      url = COALESCE(?, url),
      short_desc = COALESCE(?, short_desc),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      thumbnail_url = COALESCE(?, thumbnail_url),
      screenshot_url = COALESCE(?, screenshot_url),
      maker_name = COALESCE(?, maker_name),
      maker_email = COALESCE(?, maker_email),
      updated_at = ?
    WHERE id = ?
  `).run(
    name?.trim() || null,
    url?.trim() || null,
    short_desc?.trim() || null,
    description?.trim() || null,
    category?.trim() || null,
    safeThumbnail ?? null,
    safeScreenshot ?? null,
    maker_name !== undefined ? (maker_name?.trim() || null) : null,
    maker_email !== undefined ? (maker_email?.trim() || null) : null,
    now,
    serviceId
  );

  // If tags provided, update tags (allow 1~5 tags)
  if (Array.isArray(tags)) {
    if (tags.length === 0) {
      return res.status(400).json({ error: '주요 태그는 1개 이상 5개 이하로 선택해야 합니다.' });
    }
    if (tags.length > 5) {
      return res.status(400).json({ error: '주요 태그는 최대 5개까지만 등록 가능합니다.' });
    }
    db.prepare('DELETE FROM service_tags WHERE service_id = ?').run(serviceId);
    const getTag = db.prepare('SELECT id FROM tags WHERE normalized_name = ?');
    const insertTag = db.prepare('INSERT INTO tags (name, normalized_name, status, created_at) VALUES (?, ?, ?, ?)');
    const linkServiceTag = db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)');
    for (const rawTag of tags) {
      const tagName = String(rawTag).trim().replace(/^#/, '');
      if (!tagName) continue;
      const norm = normalizeTagName(tagName);
      let tagRow = getTag.get(norm) as { id: number } | undefined;
      if (!tagRow) {
        const resTag = insertTag.run(tagName, norm, 'approved', now);
        tagRow = { id: Number(resTag.lastInsertRowid) };
      }
      linkServiceTag.run(serviceId, tagRow.id);
    }
  }

  res.json({ success: true, message: '서비스 정보(태그/카테고리/내용)가 성공적으로 수정되었습니다.' });
});

// Maker delete service (영구 삭제 / 게재 철회)
apiRouter.delete('/maker/services/:id', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id);
  const { maker_code } = req.body;

  if (!verifyMaker(serviceId, String(maker_code))) {
    return res.status(401).json({ error: '권한이 없습니다. 유효한 제작자 코드가 필요합니다.' });
  }

  db.prepare('DELETE FROM service_tags WHERE service_id = ?').run(serviceId);
  db.prepare('DELETE FROM reviews WHERE service_id = ?').run(serviceId);
  db.prepare('DELETE FROM favorites WHERE service_id = ?').run(serviceId);
  db.prepare('DELETE FROM reactions WHERE service_id = ?').run(serviceId);
  db.prepare('DELETE FROM curations WHERE service_id = ?').run(serviceId);
  db.prepare('DELETE FROM promotions WHERE service_id = ?').run(serviceId);
  db.prepare('DELETE FROM maker_posts WHERE service_id = ?').run(serviceId);
  db.prepare('DELETE FROM services WHERE id = ?').run(serviceId);

  res.json({ success: true, message: '사이트가 성공적으로 영구 삭제(게재 철회)되었습니다.' });
});

// Maker post announcement or update
apiRouter.post('/maker/services/:id/posts', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id);
  const { maker_code, title, content, post_type = 'notice' } = req.body;

  if (!verifyMaker(serviceId, String(maker_code))) {
    return res.status(401).json({ error: '권한이 없습니다. 유효한 제작자 코드가 필요합니다.' });
  }

  if (!title || title.trim().length === 0 || !content || content.trim().length === 0) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }

  const now = new Date().toISOString();
  const ins = db.prepare(`
    INSERT INTO maker_posts (service_id, title, content, post_type, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(serviceId, title.trim(), content.trim(), post_type, now);

  res.status(201).json({
    success: true,
    post_id: Number(ins.lastInsertRowid),
    message: '새로운 공지/업데이트가 등록되었습니다.'
  });
});

// Maker delete post
apiRouter.delete('/maker/posts/:postId', (req: Request, res: Response) => {
  const postId = Number(req.params.postId);
  const { maker_code } = req.body;

  const post = db.prepare('SELECT service_id FROM maker_posts WHERE id = ?').get(postId) as { service_id: number } | undefined;
  if (!post) return res.status(404).json({ error: '해당 글을 찾을 수 없습니다.' });

  if (!verifyMaker(post.service_id, String(maker_code))) {
    return res.status(401).json({ error: '권한이 없습니다.' });
  }

  db.prepare('DELETE FROM maker_posts WHERE id = ?').run(postId);
  res.json({ success: true, message: '글이 삭제되었습니다.' });
});

// -------------------------------------------------------------
// Admin Endpoints (Verified via ADMIN_SECRET)
// -------------------------------------------------------------

// Admin Auth check (rate limited to 5 attempts per min to prevent brute force)
apiRouter.post('/admin/auth', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`admin_auth_${ip}`, 5, 60000)) {
    return res.status(429).json({ error: '인증 시도가 너무 많습니다. 1분 후 다시 시도해주세요.' });
  }

  const { passcode } = req.body;
  const cleanPasscode = String(passcode || '').trim();
  const validCodes = getValidAdminPasscodes();
  if (!cleanPasscode || !validCodes.has(cleanPasscode)) {
    return res.status(401).json({ error: '올바른 관리자 비밀번호를 입력해주세요.' });
  }
  res.json({ success: true, token: cleanPasscode });
});

// Admin list all services (including pending/hidden) with full details & tags
apiRouter.get('/admin/services', requireAdmin, (_req: Request, res: Response) => {
  const services = db.prepare(`
    SELECT
      id, name, url, short_desc, description, category, thumbnail_url, screenshot_url,
      maker_name, maker_email, status, views_count, likes_count, created_at, updated_at
    FROM services
    ORDER BY created_at DESC
  `).all() as Record<string, any>[];

  const withTags = services.map((s) => {
    const tags = db.prepare(`
      SELECT t.name FROM tags t
      JOIN service_tags st ON t.id = st.tag_id
      WHERE st.service_id = ?
    `).all(s.id) as { name: string }[];
    return { ...s, tags: tags.map((t) => t.name) };
  });

  res.json({ services: withTags });
});

// Admin edit service card content directly
apiRouter.put('/admin/services/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const service = db.prepare('SELECT id FROM services WHERE id = ?').get(id);
  if (!service) return res.status(404).json({ error: '해당 서비스를 찾을 수 없습니다.' });

  const {
    name,
    url,
    short_desc,
    description = '',
    category = '기타',
    thumbnail_url = null,
    screenshot_url = null,
    maker_name = null,
    status = 'approved',
    tags,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '서비스명을 입력해주세요.' });
  }
  if (!url || typeof url !== 'string' || !isValidExternalUrl(url)) {
    return res.status(400).json({ error: '유효한 웹사이트 주소(http:// 또는 https://)를 입력해주세요.' });
  }
  if (!short_desc || typeof short_desc !== 'string' || !short_desc.trim()) {
    return res.status(400).json({ error: '한 줄 소개를 입력해주세요.' });
  }

  const safeThumbnail = sanitizeImageUrl(thumbnail_url);
  const safeScreenshot = sanitizeImageUrl(screenshot_url);
  const safeStatus = ['approved', 'pending', 'rejected', 'hidden'].includes(status) ? status : 'approved';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE services
    SET name = ?,
        url = ?,
        short_desc = ?,
        description = ?,
        category = ?,
        thumbnail_url = ?,
        screenshot_url = ?,
        maker_name = ?,
        status = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    name.trim(),
    url.trim(),
    short_desc.trim(),
    description.trim(),
    category.trim(),
    safeThumbnail,
    safeScreenshot,
    (maker_name && typeof maker_name === 'string' && maker_name.trim()) || null,
    safeStatus,
    now,
    id
  );

  // Update tags if an array is provided
  if (Array.isArray(tags)) {
    db.prepare('DELETE FROM service_tags WHERE service_id = ?').run(id);
    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, normalized_name, status, created_at) VALUES (?, ?, ?, ?)');
    const getTag = db.prepare('SELECT id FROM tags WHERE normalized_name = ?');
    const linkTag = db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)');

    for (const rawTag of tags) {
      if (typeof rawTag === 'string' && rawTag.trim()) {
        const clean = rawTag.trim().replace(/^#+/, '');
        const norm = normalizeTagName(clean);
        if (clean) {
          insertTag.run(clean, norm, 'approved', now);
          const tRow = getTag.get(norm) as { id: number } | undefined;
          if (tRow) linkTag.run(id, tRow.id);
        }
      }
    }
  }

  res.json({ success: true, message: '서비스 카드가 성공적으로 수정되었습니다.' });
});

// Admin change service status (approved, rejected, hidden)
apiRouter.patch('/admin/services/:id/status', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['approved', 'pending', 'rejected', 'hidden'].includes(status)) {
    return res.status(400).json({ error: '유효한 상태값이 아닙니다.' });
  }

  db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run(
    status, new Date().toISOString(), id
  );
  res.json({ success: true, message: `서비스 상태가 '${status}'(으)로 변경되었습니다.` });
});

// Admin change service category (Requirement 11)
apiRouter.patch('/admin/services/:id/category', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { category } = req.body;
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: '유효한 카테고리명을 입력해주세요.' });
  }

  db.prepare('UPDATE services SET category = ?, updated_at = ? WHERE id = ?').run(
    category.trim(), new Date().toISOString(), id
  );
  res.json({ success: true, message: `카테고리가 '${category.trim()}'(으)로 변경되었습니다.` });
});

// Admin categories management routes (Add, Reorder, Rename, Delete categories)
apiRouter.get('/admin/categories', requireAdmin, (_req: Request, res: Response) => {
  res.json({ categories: getCategories() });
});

apiRouter.post('/admin/categories', requireAdmin, (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '추가할 분야(카테고리)명을 입력해주세요.' });
  }
  const cleanName = name.trim();
  const current = getCategories();
  if (current.includes(cleanName)) {
    return res.status(400).json({ error: '이미 등록된 분야입니다.' });
  }
  current.push(cleanName);
  saveCategories(current);
  res.json({ success: true, message: `'${cleanName}' 분야가 추가되었습니다.`, categories: current });
});

apiRouter.put('/admin/categories', requireAdmin, (req: Request, res: Response) => {
  const { categories } = req.body;
  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: '올바른 카테고리 배열이 아닙니다.' });
  }
  const clean = categories
    .filter((c) => typeof c === 'string' && c.trim())
    .map((c) => c.trim());
  if (clean.length === 0) {
    return res.status(400).json({ error: '최소 1개 이상의 분야가 필요합니다.' });
  }
  const unique = Array.from(new Set(clean));
  saveCategories(unique);
  res.json({ success: true, message: '분야 목록이 저장되었습니다.', categories: unique });
});

apiRouter.patch('/admin/categories/:name', requireAdmin, (req: Request, res: Response) => {
  const oldName = req.params.name;
  const { new_name } = req.body;
  if (!new_name || typeof new_name !== 'string' || !new_name.trim()) {
    return res.status(400).json({ error: '새로운 분야명을 입력해주세요.' });
  }
  const cleanNewName = new_name.trim();
  const current = getCategories();
  const idx = current.indexOf(oldName);
  if (idx === -1) {
    return res.status(404).json({ error: '수정할 분야를 찾을 수 없습니다.' });
  }
  current[idx] = cleanNewName;
  saveCategories(current);

  // Update existing services using old category name
  db.prepare('UPDATE services SET category = ? WHERE category = ?').run(cleanNewName, oldName);

  res.json({ success: true, message: `'${oldName}' 분야가 '${cleanNewName}'(으)로 수정되었습니다.`, categories: current });
});

apiRouter.delete('/admin/categories/:name', requireAdmin, (req: Request, res: Response) => {
  const name = req.params.name;
  const current = getCategories();
  if (!current.includes(name)) {
    return res.status(404).json({ error: '삭제할 분야를 찾을 수 없습니다.' });
  }
  if (current.length <= 1) {
    return res.status(400).json({ error: '최소 1개 이상의 분야는 남아있어야 합니다.' });
  }
  const filtered = current.filter((c) => c !== name);
  saveCategories(filtered);
  res.json({ success: true, message: `'${name}' 분야가 삭제되었습니다.`, categories: filtered });
});

// Admin delete service (영구 삭제)
apiRouter.delete('/admin/services/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM service_tags WHERE service_id = ?').run(id);
  db.prepare('DELETE FROM reviews WHERE service_id = ?').run(id);
  db.prepare('DELETE FROM favorites WHERE service_id = ?').run(id);
  db.prepare('DELETE FROM reactions WHERE service_id = ?').run(id);
  db.prepare('DELETE FROM curations WHERE service_id = ?').run(id);
  db.prepare('DELETE FROM promotions WHERE service_id = ?').run(id);
  db.prepare('DELETE FROM maker_posts WHERE service_id = ?').run(id);
  db.prepare("DELETE FROM reports WHERE target_type = 'service' AND target_id = ?").run(id);
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  res.json({ success: true, message: '서비스가 영구 삭제되었습니다.' });
});

// Admin data backup (Export full snapshot as JSON)
apiRouter.get('/admin/backup', requireAdmin, (_req: Request, res: Response) => {
  const services = db.prepare('SELECT * FROM services').all();
  const tags = db.prepare('SELECT * FROM tags').all();
  const service_tags = db.prepare('SELECT * FROM service_tags').all();
  const reviews = db.prepare('SELECT * FROM reviews').all();
  const site_settings = db.prepare("SELECT * FROM site_settings WHERE key != 'custom_admin_password'").all();
  const curations = db.prepare('SELECT * FROM curations').all();
  const maker_posts = db.prepare('SELECT * FROM maker_posts').all();

  res.json({
    version: '1.0',
    exported_at: new Date().toISOString(),
    services,
    tags,
    service_tags,
    reviews,
    site_settings,
    curations,
    maker_posts,
  });
});

// Admin data restore (Import snapshot from JSON)
apiRouter.post('/admin/restore', requireAdmin, (req: Request, res: Response) => {
  const { backup } = req.body;
  if (!backup || typeof backup !== 'object') {
    return res.status(400).json({ error: '올바른 백업 JSON 데이터가 아닙니다.' });
  }

  try {
    if (Array.isArray(backup.site_settings)) {
      const insSetting = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
      for (const s of backup.site_settings) {
        if (s.key && s.value) insSetting.run(s.key, s.value);
      }
    }

    if (Array.isArray(backup.tags)) {
      const insTag = db.prepare('INSERT OR REPLACE INTO tags (id, name, normalized_name, status, created_at) VALUES (?, ?, ?, ?, ?)');
      for (const t of backup.tags) {
        insTag.run(t.id, t.name, t.normalized_name, t.status, t.created_at);
      }
    }

    if (Array.isArray(backup.services)) {
      const insService = db.prepare(`
        INSERT OR REPLACE INTO services (
          id, name, url, short_desc, description, category,
          thumbnail_url, screenshot_url, maker_name, maker_email,
          maker_code_hash, status, views_count, likes_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of backup.services) {
        insService.run(
          s.id,
          s.name,
          s.url,
          s.short_desc,
          s.description ?? '',
          s.category,
          s.thumbnail_url ?? null,
          s.screenshot_url ?? null,
          s.maker_name ?? null,
          s.maker_email ?? null,
          s.maker_code_hash ?? 'restored_hash',
          s.status ?? 'approved',
          s.views_count ?? 0,
          s.likes_count ?? 0,
          s.created_at,
          s.updated_at
        );
      }
    }

    if (Array.isArray(backup.service_tags)) {
      const insLink = db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)');
      for (const st of backup.service_tags) {
        insLink.run(st.service_id, st.tag_id);
      }
    }

    if (Array.isArray(backup.reviews)) {
      const insRev = db.prepare(`
        INSERT OR REPLACE INTO reviews (id, service_id, rating, content, author_name, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of backup.reviews) {
        insRev.run(r.id, r.service_id, r.rating, r.content, r.author_name ?? null, r.status ?? 'published', r.created_at);
      }
    }

    if (Array.isArray(backup.curations)) {
      const insCur = db.prepare(`
        INSERT OR REPLACE INTO curations (id, service_id, badge_text, editorial_blurb, display_order, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of backup.curations) {
        insCur.run(c.id, c.service_id, c.badge_text, c.editorial_blurb, c.display_order ?? 0, c.is_active ?? 1, c.created_at);
      }
    }

    res.json({
      success: true,
      message: `성공적으로 복원되었습니다. (서비스 ${backup.services?.length || 0}개, 태그 ${backup.tags?.length || 0}개)`
    });
  } catch (err: any) {
    console.error('Restore error:', err);
    res.status(500).json({ error: `복원 중 오류 발생: ${err.message}` });
  }
});

// Admin reports list
apiRouter.get('/admin/reports', requireAdmin, (_req: Request, res: Response) => {
  const reports = db.prepare(`
    SELECT r.*,
      CASE WHEN r.target_type = 'service' THEN (SELECT name FROM services WHERE id = r.target_id)
           WHEN r.target_type = 'review' THEN (SELECT content FROM reviews WHERE id = r.target_id)
           ELSE 'Unknown' END as target_label
    FROM reports r
    ORDER BY r.created_at DESC
  `).all();
  res.json({ reports });
});

// Admin resolve report
apiRouter.patch('/admin/reports/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body; // 'resolved', 'dismissed'
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true, message: '신고 처리 상태가 변경되었습니다.' });
});

// Admin reviews list
apiRouter.get('/admin/reviews', requireAdmin, (_req: Request, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, s.name as service_name
    FROM reviews r
    JOIN services s ON r.service_id = s.id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ reviews });
});

// Admin toggle review status (hide/publish)
apiRouter.patch('/admin/reviews/:id/status', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true, message: '후기 상태가 업데이트되었습니다.' });
});

// Admin tag management
apiRouter.get('/admin/tags', requireAdmin, (_req: Request, res: Response) => {
  const tags = db.prepare(`
    SELECT t.*, COUNT(DISTINCT st.service_id) as usage_count
    FROM tags t
    LEFT JOIN service_tags st ON t.id = st.tag_id
    GROUP BY t.id
    ORDER BY usage_count DESC
  `).all();
  res.json({ tags });
});

// Admin merge tags (PRD 5.3)
apiRouter.post('/admin/tags/merge', requireAdmin, (req: Request, res: Response) => {
  const { source_tag_id, target_tag_id } = req.body;
  if (!source_tag_id || !target_tag_id || source_tag_id === target_tag_id) {
    return res.status(400).json({ error: '병합할 원본 태그와 대상 태그가 필요합니다.' });
  }

  // Transfer links
  const links = db.prepare('SELECT service_id FROM service_tags WHERE tag_id = ?').all(source_tag_id) as { service_id: number }[];
  const insertLink = db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)');
  for (const l of links) {
    insertLink.run(l.service_id, target_tag_id);
  }

  // Remove source tag links & delete or hide source tag
  db.prepare('DELETE FROM service_tags WHERE tag_id = ?').run(source_tag_id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(source_tag_id);

  res.json({ success: true, message: '태그가 성공적으로 병합되었습니다.' });
});

// Admin curations management
apiRouter.get('/admin/curations', requireAdmin, (_req: Request, res: Response) => {
  const curations = db.prepare(`
    SELECT c.*, c.id as curation_id, s.name as service_name, s.name as name
    FROM curations c
    JOIN services s ON c.service_id = s.id
    ORDER BY c.display_order ASC
  `).all();
  res.json({ curations });
});

apiRouter.post('/admin/curations', requireAdmin, (req: Request, res: Response) => {
  const { service_id, badge_text, editorial_blurb, display_order = 0 } = req.body;
  if (!service_id || !badge_text || !editorial_blurb) {
    return res.status(400).json({ error: '필수 큐레이션 항목을 모두 입력해주세요.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO curations (service_id, badge_text, editorial_blurb, display_order, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(Number(service_id), badge_text.trim(), editorial_blurb.trim(), Number(display_order), now);

  res.status(201).json({ success: true, message: '큐레이션이 등록되었습니다.' });
});

apiRouter.delete('/admin/curations/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM curations WHERE id = ?').run(id);
  res.json({ success: true, message: '큐레이션이 제거되었습니다.' });
});

// Admin promotions / sponsored management
apiRouter.get('/admin/promotions', requireAdmin, (_req: Request, res: Response) => {
  const promotions = db.prepare(`
    SELECT p.*, s.name as service_name
    FROM promotions p
    JOIN services s ON p.service_id = s.id
    ORDER BY p.created_at DESC
  `).all();
  res.json({ promotions });
});

apiRouter.post('/admin/promotions', requireAdmin, (req: Request, res: Response) => {
  const { service_id, slot_type = 'feed_sponsor', start_date, end_date } = req.body;
  if (!service_id) return res.status(400).json({ error: '서비스 ID가 필요합니다.' });

  const now = new Date().toISOString();
  const start = start_date || now;
  const end = end_date || '2028-12-31T23:59:59Z';

  db.prepare(`
    INSERT INTO promotions (service_id, slot_type, status, impressions, clicks, start_date, end_date, created_at)
    VALUES (?, ?, 'active', 0, 0, ?, ?, ?)
  `).run(Number(service_id), slot_type, start, end, now);

  res.status(201).json({ success: true, message: '스폰서 광고 상품이 등록되었습니다.' });
});

apiRouter.patch('/admin/promotions/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  db.prepare('UPDATE promotions SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true, message: '광고 상태가 변경되었습니다.' });
});

// Admin Dashboard stats
apiRouter.get('/admin/stats', requireAdmin, (_req: Request, res: Response) => {
  const totalServices = (db.prepare('SELECT COUNT(*) as c FROM services').get() as any).c;
  const approvedServices = (db.prepare("SELECT COUNT(*) as c FROM services WHERE status = 'approved'").get() as any).c;
  const pendingServices = (db.prepare("SELECT COUNT(*) as c FROM services WHERE status = 'pending'").get() as any).c;
  const totalReviews = (db.prepare('SELECT COUNT(*) as c FROM reviews').get() as any).c;
  const totalReports = (db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'").get() as any).c;
  const totalReactions = (db.prepare('SELECT COUNT(*) as c FROM reactions').get() as any).c;
  const activePromos = (db.prepare("SELECT COUNT(*) as c FROM promotions WHERE status = 'active'").get() as any).c;

  const categoryBreakdown = db.prepare(`
    SELECT category, COUNT(*) as count FROM services GROUP BY category ORDER BY count DESC
  `).all();

  res.json({
    stats: {
      total_services: totalServices,
      approved_services: approvedServices,
      pending_services: pendingServices,
      total_reviews: totalReviews,
      pending_reports: totalReports,
      total_reactions: totalReactions,
      active_promotions: activePromos,
      category_breakdown: categoryBreakdown
    }
  });
});

// Public Community Feed (Only manual maker posts & reviews)
apiRouter.get('/community', (_req: Request, res: Response) => {
  // Only authentic posts from maker_posts table
  const makerPosts = db.prepare(`
    SELECT mp.id, mp.title, mp.content, mp.post_type, mp.created_at,
           s.id as service_id, s.name as service_name, s.category as service_category
    FROM maker_posts mp
    JOIN services s ON mp.service_id = s.id
    WHERE s.status = 'approved'
    ORDER BY mp.created_at DESC
    LIMIT 30
  `).all();

  // Published reviews
  const reviews = db.prepare(`
    SELECT r.id, r.rating, r.content, r.author_name, r.created_at,
           s.id as service_id, s.name as service_name
    FROM reviews r
    JOIN services s ON r.service_id = s.id
    WHERE r.status = 'published' AND s.status = 'approved'
    ORDER BY r.created_at DESC
    LIMIT 30
  `).all();

  res.json({ maker_posts: makerPosts, reviews });
});

// Site Settings
apiRouter.get('/settings', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as { key: string; value: string }[];
  const rawMap = rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {} as Record<string, string>);
  let history: string[] = ['인터넷은 아직 재밌다', '웹이라는 게 숨긴다고 숨겨지는 것도 아니고', '덤프 진행하겠습니다...'];
  if (rawMap.slogan_history) {
    try {
      history = JSON.parse(rawMap.slogan_history);
    } catch {}
  }
  // Default to false (friend mode, clean without ADs)
  const showAds = rawMap.show_ads === 'true';

  res.json({
    settings: {
      slogan: rawMap.slogan || '인터넷은 아직 재밌다',
      slogan_history: history,
      show_ads: showAds,
      site_title: rawMap.site_title || '바이브덤프 - 인터넷은 아직 재밌다',
    }
  });
});

apiRouter.patch('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const { slogan, show_ads, site_title, new_admin_password } = req.body;
  let updatedPassToken: string | undefined;

  if (new_admin_password !== undefined && typeof new_admin_password === 'string') {
    const trimmedPass = new_admin_password.trim();
    if (trimmedPass.length < 6) {
      return res.status(400).json({ error: '새 운영자 비밀번호는 6자리 이상이어야 합니다.' });
    }
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('custom_admin_password', trimmedPass);
    updatedPassToken = trimmedPass;
  }

  if (slogan !== undefined && typeof slogan === 'string') {
    const trimmed = slogan.trim().slice(0, 150);
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('slogan', trimmed);

    // Update slogan history
    const histRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('slogan_history') as { value: string } | undefined;
    let list: string[] = ['인터넷은 아직 재밌다', '웹이라는 게 숨긴다고 숨겨지는 것도 아니고', '덤프 진행하겠습니다...'];
    if (histRow) {
      try { list = JSON.parse(histRow.value); } catch {}
    }
    // Prepend without duplicates
    list = [trimmed, ...list.filter(item => item !== trimmed)].slice(0, 20);
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('slogan_history', JSON.stringify(list));
  }

  if (site_title !== undefined && typeof site_title === 'string') {
    const trimmedTitle = site_title.trim().slice(0, 120);
    if (trimmedTitle) {
      db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('site_title', trimmedTitle);
    }
  }

  if (show_ads !== undefined) {
    const val = show_ads ? 'true' : 'false';
    db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('show_ads', val);
  }

  res.json({
    success: true,
    message: updatedPassToken ? '운영자 비밀번호가 안전하게 변경되었습니다.' : '사이트 설정이 저장되었습니다.',
    new_token: updatedPassToken
  });
});

// Admin Seed Test Data
apiRouter.post('/admin/seed-test-data', requireAdmin, (_req: Request, res: Response) => {
  seedAdminTestData();
  res.json({ success: true, message: '운영자 테스트 데이터가 정상적으로 장전되었습니다!' });
});

// Admin update tag status (e.g. approve pending tag or hide)
apiRouter.patch('/admin/tags/:id/status', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status } = req.body; // 'approved' | 'hidden' | 'pending'
  if (!['approved', 'hidden', 'pending'].includes(status)) {
    return res.status(400).json({ error: '올바른 상태값이 아닙니다.' });
  }
  db.prepare('UPDATE tags SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true, message: `태그 상태가 '${status}'(으)로 변경되었습니다.` });
});

// Admin delete tag
apiRouter.delete('/admin/tags/:id', requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM service_tags WHERE tag_id = ?').run(id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  res.json({ success: true, message: '태그가 삭제되었습니다.' });
});

