# ☁️ Cloudflare Pages + D1 배포 완벽 가이드

이 가이드는 GitHub(`jinthelee/vibedump`)을 Cloudflare Pages에 연동하여 **비용 $0로 데이터 영구 보존(서버 꺼짐 없음)** 배포하는 가장 쉽고 확실한 방법입니다.

---

## 🚨 발생했던 두 가지 오류의 원인과 해결책

### 1. `No SQL statements detected.` 오류
* **원인**: Cloudflare D1 콘솔의 웹 파서는 맨 앞에 주석(`-- ...`)이 있거나 주석 라인이 섞여 있으면 SQL 명령어로 인식하지 못하고 튕겨냅니다.
* **해결**: 주석(`--`)을 100% 제거한 순수 SQL을 아래에 준비해 두었습니다. 아래 [1단계]의 SQL 내용을 그대로 복사해서 붙여넣으시면 100% 한 번에 통과됩니다.

### 2. `Failed to execute 'json' on 'Response': Unexpected end of JSON input` 오류
* **원인**: Cloudflare Pages에 프론트엔드(`dist`)만 올라가 있고 백엔드(API)가 없어서, 브라우저가 `/api/services`를 요청했을 때 Cloudflare가 빈 응답(0바이트)을 반환해 `res.json()`이 크래시 난 것입니다.
* **해결**: 
  1. Cloudflare Pages가 자체적으로 서버리스 API를 실행할 수 있도록 `functions/api/[[catchall]].ts`를 구축했습니다.
  2. 프론트엔드 `api.ts`에 안전 파서(`handleResponse`)와 기본값을 적용해, DB 연결 전이라도 화면이 하얗게 깨지거나 오류가 나지 않도록 방어했습니다.

---

## 🛠️ 클릭만으로 끝내는 Cloudflare 배포 순서

### 1단계: Cloudflare D1 콘솔에 SQL 실행하기
1. Cloudflare 대시보드 ➔ 왼쪽 메뉴 **[Workers & Pages]** ➔ **[D1 SQL Database]**
2. 만들어둔 **`vibedump-db`** 클릭 ➔ 상단 **[콘솔(Console)]** 탭 클릭
3. 아래의 **주석 없는 순수 SQL**을 전체 복사해서 콘솔창에 붙여넣고 **[실행(Execute)]** 버튼 클릭:

```sql
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
```

*(정상 실행되면 콘솔 하단에 각 쿼리 실행 결과가 초록색으로 뜹니다.)*

---

### 2단계: Cloudflare Pages에 D1 데이터베이스 연결(바인딩)하기
Cloudflare Pages가 방금 만든 D1 데이터베이스(`vibedump-db`)를 읽고 쓸 수 있도록 연결합니다:
1. Cloudflare 대시보드 ➔ **[Workers & Pages]** ➔ 배포된 **vibedump Pages 프로젝트** 클릭
2. 상단 탭 **[설정(Settings)]** ➔ 왼쪽 서브메뉴 **[Functions]** 클릭
3. 아래로 스크롤하여 **[D1 database bindings]** 영역 찾기 ➔ **[Add binding]** 클릭
4. 입력창에 다음 설정:
   * **Variable name**: `DB` (반드시 대문자 두 글자 `DB`로 입력!)
   * **D1 database**: `vibedump-db` 선택
5. **[저장(Save)]** 클릭

---

### 3단계: GitHub에 최신 코드 올리고 재배포 확인
1. 이번에 수정된 최신 코드(`functions/`, `src/lib/api.ts`, `schema.sql`)를 GitHub에 커밋/업로드합니다.
2. Cloudflare Pages가 자동으로 감지하여 빌드 및 배포를 완료합니다.
3. 배포된 주소(예: `vibedump.pages.dev`)로 접속하면 오류 없이 깔끔하게 접속되며, 등록한 모든 데이터가 D1에 영구 보존됩니다!
