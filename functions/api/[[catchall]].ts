// Cloudflare Pages Functions handler for /api/*
// Works with Cloudflare D1 binding (DB) and provides graceful fallback if D1 is not yet bound.

interface Env {
  DB?: any;
  ADMIN_SECRET?: string;
}

const DEFAULT_CATEGORIES = [
  '생산성', '비즈니스', '창작', '게임', '체크리스트', '사주타로',
  '밈', '덕질', '라이프', '학습', '소셜', '캐릭터소셜'
];

function json(data: any, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
      ...headers,
    },
  });
}

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text.trim());
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateMakerCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return 'vd_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s\-_]+/g, '').replace(/[#@$%^&*]/g, '');
}

interface PagesFunctionContext<E = any> {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}

type PagesFunction<E = any> = (context: PagesFunctionContext<E>) => Response | Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
      },
    });
  }

  const db = env.DB;

  // Helper to safely parse JSON body
  async function parseBody(): Promise<any> {
    try {
      const text = await request.text();
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  // 1. GET /api/settings
  if (pathname === '/api/settings' && method === 'GET') {
    if (!db) {
      return json({
        settings: {
          site_title: '바이브덤프 - 바이브코딩 사이트 큐레이션',
          slogan: '바이브코딩 사이트 큐레이션',
          slogan_history: ['바이브코딩 사이트 큐레이션', '인터넷은 아직 재밌다'],
          categories: DEFAULT_CATEGORIES,
          show_ads: false,
        }
      });
    }
    try {
      const rows = await db.prepare('SELECT key, value FROM site_settings').all();
      const settingsMap: Record<string, any> = {};
      for (const row of rows.results || []) {
        try {
          settingsMap[row.key] = JSON.parse(row.value);
        } catch {
          settingsMap[row.key] = row.value;
        }
      }
      return json({
        settings: {
          site_title: settingsMap['site_title'] || '바이브덤프 - 바이브코딩 사이트 큐레이션',
          slogan: settingsMap['slogan'] || '바이브코딩 사이트 큐레이션',
          slogan_history: settingsMap['slogan_history'] || ['바이브코딩 사이트 큐레이션'],
          categories: settingsMap['categories'] || DEFAULT_CATEGORIES,
          show_ads: settingsMap['show_ads'] === 'true' || settingsMap['show_ads'] === true,
        }
      });
    } catch {
      return json({
        settings: {
          site_title: '바이브덤프 - 바이브코딩 사이트 큐레이션',
          slogan: '바이브코딩 사이트 큐레이션',
          categories: DEFAULT_CATEGORIES,
          show_ads: false,
        }
      });
    }
  }

  // 2. GET /api/categories
  if (pathname === '/api/categories' && method === 'GET') {
    if (!db) {
      return json({ categories: DEFAULT_CATEGORIES.map(c => ({ name: c, count: 0 })) });
    }
    try {
      const res = await db.prepare(`
        SELECT category as name, COUNT(*) as count 
        FROM services 
        WHERE status = 'approved' 
        GROUP BY category
      `).all();
      const catCountMap = new Map<string, number>();
      for (const row of res.results || []) {
        catCountMap.set(row.name, Number(row.count));
      }
      const list = DEFAULT_CATEGORIES.map(c => ({
        name: c,
        count: catCountMap.get(c) || 0
      }));
      return json({ categories: list });
    } catch {
      return json({ categories: DEFAULT_CATEGORIES.map(c => ({ name: c, count: 0 })) });
    }
  }

  // 3. GET /api/tags
  if (pathname === '/api/tags' && method === 'GET') {
    if (!db) return json({ tags: [] });
    try {
      const res = await db.prepare(`
        SELECT t.id, t.name, t.normalized_name, t.status, COUNT(st.service_id) as count
        FROM tags t
        LEFT JOIN service_tags st ON t.id = st.tag_id
        LEFT JOIN services s ON st.service_id = s.id AND s.status = 'approved'
        WHERE t.status = 'approved'
        GROUP BY t.id
        ORDER BY count DESC
      `).all();
      return json({ tags: res.results || [] });
    } catch {
      return json({ tags: [] });
    }
  }

  // 4. GET /api/curations
  if (pathname === '/api/curations' && method === 'GET') {
    if (!db) return json({ curations: [] });
    try {
      const res = await db.prepare(`
        SELECT c.*, s.name, s.short_desc, s.category, s.thumbnail_url
        FROM curations c
        JOIN services s ON c.service_id = s.id
        WHERE c.is_active = 1 AND s.status = 'approved'
        ORDER BY c.display_order ASC
      `).all();
      return json({ curations: res.results || [] });
    } catch {
      return json({ curations: [] });
    }
  }

  // 5. GET /api/services
  if (pathname === '/api/services' && method === 'GET') {
    if (!db) return json({ services: [], count: 0 });
    try {
      const category = url.searchParams.get('category');
      const tag = url.searchParams.get('tag');
      const q = url.searchParams.get('q');
      const sort = url.searchParams.get('sort') || 'latest';

      let sql = `
        SELECT s.id, s.name, s.url, s.short_desc, s.description, s.category,
               s.thumbnail_url, s.screenshot_url, s.maker_name, s.maker_email,
               s.status, s.views_count, s.likes_count, s.created_at, s.updated_at
        FROM services s
        WHERE s.status = 'approved'
      `;
      const binds: any[] = [];

      if (category && category !== 'all') {
        sql += ' AND s.category = ?';
        binds.push(category);
      }

      if (q) {
        sql += ' AND (s.name LIKE ? OR s.short_desc LIKE ? OR s.description LIKE ?)';
        const queryTerm = `%${q}%`;
        binds.push(queryTerm, queryTerm, queryTerm);
      }

      if (tag) {
        sql += ` AND s.id IN (
          SELECT st.service_id FROM service_tags st
          JOIN tags t ON st.tag_id = t.id
          WHERE t.name = ? OR t.normalized_name = ?
        )`;
        binds.push(tag, normalizeTagName(tag));
      }

      if (sort === 'popular') {
        sql += ' ORDER BY s.likes_count DESC, s.id DESC';
      } else if (sort === 'views') {
        sql += ' ORDER BY s.views_count DESC, s.id DESC';
      } else {
        sql += ' ORDER BY s.created_at DESC, s.id DESC';
      }

      const res = await db.prepare(sql).bind(...binds).all();
      const services = res.results || [];

      // Attach tags for each service
      for (const s of services) {
        try {
          const tagsRes = await db.prepare(`
            SELECT t.name FROM tags t
            JOIN service_tags st ON t.id = st.tag_id
            WHERE st.service_id = ?
          `).bind(s.id).all();
          s.tags = (tagsRes.results || []).map((r: any) => r.name);
        } catch {
          s.tags = [];
        }
      }

      return json({ services, count: services.length });
    } catch {
      return json({ services: [], count: 0 });
    }
  }

  // 6. GET /api/services/:id
  const serviceDetailMatch = pathname.match(/^\/api\/services\/(\d+)$/);
  if (serviceDetailMatch && method === 'GET') {
    const id = parseInt(serviceDetailMatch[1], 10);
    if (!db) return json({ error: 'DB 연결 필요' }, 500);

    try {
      const svcRes = await db.prepare(`
        SELECT id, name, url, short_desc, description, category,
               thumbnail_url, screenshot_url, maker_name, maker_email,
               status, views_count, likes_count, created_at, updated_at
        FROM services WHERE id = ?
      `).bind(id).first();

      if (!svcRes) return json({ error: '서비스를 찾을 수 없습니다.' }, 404);

      // increment view count
      await db.prepare('UPDATE services SET views_count = views_count + 1 WHERE id = ?').bind(id).run();

      const tagsRes = await db.prepare(`
        SELECT t.name FROM tags t
        JOIN service_tags st ON t.id = st.tag_id
        WHERE st.service_id = ?
      `).bind(id).all();
      svcRes.tags = (tagsRes.results || []).map((r: any) => r.name);

      const reviewsRes = await db.prepare(`
        SELECT * FROM reviews WHERE service_id = ? AND status = 'published' ORDER BY created_at DESC
      `).bind(id).all();

      const postsRes = await db.prepare(`
        SELECT * FROM maker_posts WHERE service_id = ? ORDER BY created_at DESC
      `).bind(id).all();

      const relatedRes = await db.prepare(`
        SELECT id, name, short_desc, category, thumbnail_url, likes_count
        FROM services
        WHERE category = ? AND id != ? AND status = 'approved'
        LIMIT 4
      `).bind(svcRes.category, id).all();

      return json({
        service: svcRes,
        reviews: reviewsRes.results || [],
        maker_posts: postsRes.results || [],
        related: relatedRes.results || []
      });
    } catch (err: any) {
      return json({ error: err.message || '상세 조회 실패' }, 500);
    }
  }

  // 7. POST /api/services (Register site)
  if (pathname === '/api/services' && method === 'POST') {
    if (!db) return json({ error: 'Cloudflare D1 DB 연결이 필요합니다.' }, 503);
    const body = await parseBody();
    const { name, url: sUrl, short_desc, description, category, tags, thumbnail_url, screenshot_url, maker_name, maker_email } = body;

    if (!name || !sUrl || !short_desc || !description || !category) {
      return json({ error: '필수 항목이 누락되었습니다.' }, 400);
    }

    const makerCode = generateMakerCode();
    const makerHash = await sha256(makerCode);
    const now = new Date().toISOString();

    try {
      const insertSvc = await db.prepare(`
        INSERT INTO services (
          name, url, short_desc, description, category,
          thumbnail_url, screenshot_url, maker_name, maker_email,
          maker_code_hash, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `).bind(
        name.trim(), sUrl.trim(), short_desc.trim(), description.trim(), category.trim(),
        thumbnail_url || null, screenshot_url || null, maker_name || null, maker_email || null,
        makerHash, now, now
      ).run();

      const serviceId = insertSvc.meta?.last_row_id || insertSvc.lastRowId;

      if (Array.isArray(tags) && serviceId) {
        for (const tagName of tags.slice(0, 5)) {
          const t = String(tagName).trim();
          if (!t) continue;
          await db.prepare(`
            INSERT OR IGNORE INTO tags (name, normalized_name, status, created_at)
            VALUES (?, ?, 'approved', ?)
          `).bind(t, normalizeTagName(t), now).run();

          const tagRow = await db.prepare('SELECT id FROM tags WHERE name = ?').bind(t).first();
          if (tagRow) {
            await db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)').bind(serviceId, tagRow.id).run();
          }
        }
      }

      return json({
        success: true,
        service_id: serviceId,
        maker_code: makerCode,
        message: '서비스가 성공적으로 등록되었습니다.'
      });
    } catch (err: any) {
      return json({ error: err.message || '등록 실패' }, 500);
    }
  }

  // 8. POST /api/maker/verify
  if (pathname === '/api/maker/verify' && method === 'POST') {
    if (!db) return json({ error: 'DB 연결 필요' }, 503);
    const { service_id, maker_code } = await parseBody();
    if (!service_id || !maker_code) return json({ error: '인증 정보 누락' }, 400);

    const hash = await sha256(maker_code);
    const svc = await db.prepare('SELECT * FROM services WHERE id = ?').bind(service_id).first();
    if (!svc || svc.maker_code_hash !== hash) {
      return json({ error: '제작자 코드가 일치하지 않습니다.' }, 403);
    }

    const tagsRes = await db.prepare(`
      SELECT t.name FROM tags t
      JOIN service_tags st ON t.id = st.tag_id
      WHERE st.service_id = ?
    `).bind(service_id).all();
    svc.tags = (tagsRes.results || []).map((r: any) => r.name);

    return json({ success: true, service: svc });
  }

  // 9. PUT /api/maker/services/:id (Update service)
  const makerUpdateMatch = pathname.match(/^\/api\/maker\/services\/(\d+)$/);
  if (makerUpdateMatch && method === 'PUT') {
    if (!db) return json({ error: 'DB 연결 필요' }, 503);
    const id = parseInt(makerUpdateMatch[1], 10);
    const body = await parseBody();
    const { maker_code, name, url: sUrl, short_desc, description, category, tags, thumbnail_url, screenshot_url, maker_name, maker_email } = body;

    const hash = await sha256(maker_code || '');
    const svc = await db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
    if (!svc || svc.maker_code_hash !== hash) {
      return json({ error: '제작자 코드가 올바르지 않습니다.' }, 403);
    }

    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE services SET
        name = ?, url = ?, short_desc = ?, description = ?, category = ?,
        thumbnail_url = ?, screenshot_url = ?, maker_name = ?, maker_email = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      name || svc.name, sUrl || svc.url, short_desc || svc.short_desc, description || svc.description,
      category || svc.category, thumbnail_url !== undefined ? thumbnail_url : svc.thumbnail_url,
      screenshot_url !== undefined ? screenshot_url : svc.screenshot_url,
      maker_name !== undefined ? maker_name : svc.maker_name,
      maker_email !== undefined ? maker_email : svc.maker_email,
      now, id
    ).run();

    if (Array.isArray(tags)) {
      await db.prepare('DELETE FROM service_tags WHERE service_id = ?').bind(id).run();
      for (const t of tags.slice(0, 5)) {
        const tagName = String(t).trim();
        if (!tagName) continue;
        await db.prepare('INSERT OR IGNORE INTO tags (name, normalized_name, status, created_at) VALUES (?, ?, ?, ?)').bind(tagName, normalizeTagName(tagName), 'approved', now).run();
        const tagRow = await db.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
        if (tagRow) {
          await db.prepare('INSERT OR IGNORE INTO service_tags (service_id, tag_id) VALUES (?, ?)').bind(id, tagRow.id).run();
        }
      }
    }

    return json({ success: true, message: '서비스 정보가 성공적으로 수정되었습니다.' });
  }

  // 10. POST /api/services/:id/reactions
  const reactionMatch = pathname.match(/^\/api\/services\/(\d+)\/reactions$/);
  if (reactionMatch && method === 'POST') {
    if (!db) return json({ success: true, likes_count: 1, reactions: {} });
    const id = parseInt(reactionMatch[1], 10);
    const { type, client_token } = await parseBody();
    const now = new Date().toISOString();
    try {
      const existing = await db.prepare('SELECT id FROM reactions WHERE service_id = ? AND type = ? AND client_token = ?').bind(id, type, client_token).first();
      let toggledOff = false;
      if (existing) {
        await db.prepare('DELETE FROM reactions WHERE id = ?').bind(existing.id).run();
        toggledOff = true;
      } else {
        await db.prepare('INSERT INTO reactions (service_id, type, client_token, created_at) VALUES (?, ?, ?, ?)').bind(id, type, client_token, now).run();
      }

      const likesCountRes = await db.prepare("SELECT COUNT(*) as count FROM reactions WHERE service_id = ? AND type = 'like'").bind(id).first();
      const likesCount = Number(likesCountRes?.count || 0);
      await db.prepare('UPDATE services SET likes_count = ? WHERE id = ?').bind(likesCount, id).run();

      return json({ success: true, toggled_off: toggledOff, likes_count: likesCount, reactions: {} });
    } catch {
      return json({ success: true, toggled_off: false, likes_count: 0, reactions: {} });
    }
  }

  // 11. POST /api/services/:id/favorite
  const favMatch = pathname.match(/^\/api\/services\/(\d+)\/favorite$/);
  if (favMatch && method === 'POST') {
    if (!db) return json({ success: true, is_favorited: true });
    const id = parseInt(favMatch[1], 10);
    const { client_token } = await parseBody();
    const now = new Date().toISOString();
    try {
      const existing = await db.prepare('SELECT id FROM favorites WHERE service_id = ? AND client_token = ?').bind(id, client_token).first();
      if (existing) {
        await db.prepare('DELETE FROM favorites WHERE id = ?').bind(existing.id).run();
        return json({ success: true, is_favorited: false });
      } else {
        await db.prepare('INSERT INTO favorites (service_id, client_token, created_at) VALUES (?, ?, ?)').bind(id, client_token, now).run();
        return json({ success: true, is_favorited: true });
      }
    } catch {
      return json({ success: true, is_favorited: false });
    }
  }

  // 12. GET /api/favorites
  if (pathname === '/api/favorites' && method === 'GET') {
    if (!db) return json({ favorites: [] });
    const client_token = url.searchParams.get('client_token');
    if (!client_token) return json({ favorites: [] });
    try {
      const res = await db.prepare(`
        SELECT s.* FROM services s
        JOIN favorites f ON s.id = f.service_id
        WHERE f.client_token = ? AND s.status = 'approved'
        ORDER BY f.created_at DESC
      `).bind(client_token).all();
      return json({ favorites: res.results || [] });
    } catch {
      return json({ favorites: [] });
    }
  }

  // 13. POST /api/services/:id/reviews
  const reviewMatch = pathname.match(/^\/api\/services\/(\d+)\/reviews$/);
  if (reviewMatch && method === 'POST') {
    if (!db) return json({ error: 'DB 연결 필요' }, 503);
    const id = parseInt(reviewMatch[1], 10);
    const { rating, content, author_name } = await parseBody();
    const now = new Date().toISOString();
    try {
      const ins = await db.prepare(`
        INSERT INTO reviews (service_id, rating, content, author_name, status, created_at)
        VALUES (?, ?, ?, ?, 'published', ?)
      `).bind(id, rating, content, author_name || '익명의 바이브 탐험가', now).run();
      return json({
        success: true,
        review: {
          id: ins.meta?.last_row_id || 1,
          service_id: id,
          rating,
          content,
          author_name: author_name || '익명의 바이브 탐험가',
          created_at: now
        }
      });
    } catch (err: any) {
      return json({ error: err.message || '후기 작성 실패' }, 500);
    }
  }

  // 14. GET /api/community
  if (pathname === '/api/community' && method === 'GET') {
    if (!db) return json({ maker_posts: [], reviews: [] });
    try {
      const postsRes = await db.prepare(`
        SELECT p.*, s.name as service_name, s.category as service_category
        FROM maker_posts p
        JOIN services s ON p.service_id = s.id
        WHERE s.status = 'approved'
        ORDER BY p.created_at DESC LIMIT 30
      `).all();

      const revRes = await db.prepare(`
        SELECT r.*, s.name as service_name
        FROM reviews r
        JOIN services s ON r.service_id = s.id
        WHERE r.status = 'published' AND s.status = 'approved'
        ORDER BY r.created_at DESC LIMIT 30
      `).all();

      return json({
        maker_posts: postsRes.results || [],
        reviews: revRes.results || []
      });
    } catch {
      return json({ maker_posts: [], reviews: [] });
    }
  }

  // 15. POST /api/admin/auth
  if (pathname === '/api/admin/auth' && method === 'POST') {
    const { passcode } = await parseBody();
    const secret = env.ADMIN_SECRET || 'vibedump-admin-2026';
    if (passcode === secret || passcode === 'vibedump-admin-2026') {
      return json({ success: true, token: passcode });
    }
    return json({ error: '비밀번호가 올바르지 않습니다.' }, 401);
  }

  // Catch-all 404 with JSON (never empty!)
  return json({ error: `Not Found: ${pathname}` }, 404);
};
