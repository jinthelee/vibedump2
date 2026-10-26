import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initDatabase, db } from './server/db.js';
import { apiRouter } from './server/api.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

function injectMetaTags(html: string, req: express.Request): string {
  try {
    const rawServiceId = req.query.service || req.query.id;
    const serviceId = typeof rawServiceId === 'string' ? rawServiceId.trim() : null;
    let title = '바이브덤프 - 바이브코딩 사이트 큐레이션';
    let description = '바이브코딩으로 태어난 새로운 서비스를 발견하고, 직접 써보고, 반응해 보세요. 바이브코딩 사이트 큐레이션 플랫폼';
    let imageUrl = '';

    if (serviceId) {
      const serviceRow = db.prepare('SELECT name, short_desc, thumbnail_url, category FROM services WHERE id = ? AND status = ?')
        .get(serviceId, 'approved') as { name: string; short_desc: string; thumbnail_url: string; category: string } | undefined;
      if (serviceRow) {
        title = `${serviceRow.name} | 바이브덤프`;
        description = `${serviceRow.short_desc} [${serviceRow.category}] - 바이브덤프에서 바로 써보기`;
        imageUrl = serviceRow.thumbnail_url || '';
      }
    }

    if (!serviceId) {
      const titleRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('site_title') as { value: string } | undefined;
      const sloganRow = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('slogan') as { value: string } | undefined;
      if (titleRow?.value) {
        title = titleRow.value;
      }
      if (sloganRow?.value) {
        description = `바이브덤프 - ${sloganRow.value}. 바이브코딩으로 태어난 새로운 웹서비스를 발견하고, 직접 써보고, 반응해 보세요.`;
      }
    }

    const escapeAttr = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const safeTitle = escapeAttr(title);
    const safeDesc = escapeAttr(description);

    let result = html
      .replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`)
      .replace(/<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="description" content="${safeDesc}" />`)
      .replace(/<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:title" content="${safeTitle}" />`)
      .replace(/<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:description" content="${safeDesc}" />`)
      .replace(/<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:title" content="${safeTitle}" />`)
      .replace(/<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:description" content="${safeDesc}" />`);

    if (imageUrl) {
      const safeImg = escapeAttr(imageUrl);
      if (result.includes('og:image')) {
        result = result.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:image" content="${safeImg}" />`);
      } else {
        result = result.replace('</head>', `  <meta property="og:image" content="${safeImg}" />\n    <meta name="twitter:image" content="${safeImg}" />\n  </head>`);
      }
    }

    return result;
  } catch (err) {
    console.error('[MetaInject] Error:', err);
    return html;
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  // Initialize SQLite database and tables
  initDatabase();

  // Health and keep-alive ping endpoint
  app.get(['/api/ping', '/api/health'], (_req, res) => {
    res.json({
      status: 'ok',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'vibedump'
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // Serve static assets (such as generated images in /src/assets/images)
  app.use('/src/assets', express.static(path.resolve(__dirname, 'src/assets')));

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      // Skip API and files with extensions handled by static middleware
      if (url.startsWith('/api') || url.includes('.')) {
        return next();
      }
      try {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const transformed = await vite.transformIndexHtml(url, rawTemplate);
        const finalHtml = injectMetaTags(transformed, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false }));
    app.get('*', (req, res) => {
      try {
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'dist', 'index.html'), 'utf-8');
        const finalHtml = injectMetaTags(rawTemplate, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
      } catch {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
      }
    });
  }

  // Internal Keep-Alive interval (every 3 minutes)
  setInterval(() => {
    try {
      db.prepare('SELECT 1').get();
    } catch {
      // Ignore
    }
  }, 3 * 60 * 1000);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[VibeDump Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[VibeDump Server] Failed to start:', err);
  process.exit(1);
});
