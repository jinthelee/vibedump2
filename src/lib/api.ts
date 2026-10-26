import { Service, TagItem, Review, MakerPost, Curation, Promotion, ReportItem, AdminStats } from '../types';

const BASE_URL = '/api';

export const DEFAULT_FALLBACK_CATEGORIES = [
  '생산성', '비즈니스', '창작', '게임', '체크리스트', '사주타로',
  '밈', '덕질', '라이프', '학습', '소셜', '캐릭터소셜'
];

// Robust JSON response handler that prevents "Unexpected end of JSON input"
async function handleResponse<T = any>(res: Response, fallbackError: string): Promise<T> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    if (!res.ok) throw new Error(`${fallbackError} (${res.status})`);
    return {} as T;
  }

  const trimmed = text.trim();
  let data: any = null;
  if (trimmed) {
    try {
      data = JSON.parse(trimmed);
    } catch {
      // Body is not JSON (e.g. Cloudflare HTML 404 / 500 error page)
    }
  }

  if (!res.ok) {
    if (data?.error) throw new Error(data.error);
    if (data?.message) throw new Error(data.message);
    if (res.status === 404) {
      throw new Error('API 서버를 찾을 수 없습니다. (Cloudflare D1 / Functions 연결 확인 필요)');
    }
    throw new Error(`${fallbackError} (${res.status})`);
  }

  if (data !== null) {
    return data as T;
  }
  return {} as T;
}

// Generate or retrieve persistent anonymous client token for reactions/favorites
export function getClientToken(): string {
  if (typeof window === 'undefined') return 'ssr_token';
  const KEY = 'vibedump_client_token';
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = 'cli_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(KEY, token);
  }
  return token;
}

export async function fetchServices(params: {
  category?: string;
  tag?: string;
  q?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<{ services: Service[]; count: number }> {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.tag) query.set('tag', params.tag);
    if (params.q) query.set('q', params.q);
    if (params.sort) query.set('sort', params.sort);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const res = await fetch(`${BASE_URL}/services?${query.toString()}`);
    return await handleResponse<{ services: Service[]; count: number }>(res, '서비스 목록을 불러오지 못했습니다.');
  } catch (err: any) {
    console.warn('fetchServices warning:', err?.message || err);
    return { services: [], count: 0 };
  }
}

export async function fetchServiceDetail(id: number): Promise<{
  service: Service;
  reviews: Review[];
  maker_posts: MakerPost[];
  related: Array<{
    id: number;
    name: string;
    short_desc: string;
    category: string;
    thumbnail_url: string | null;
    likes_count: number;
  }>;
}> {
  const res = await fetch(`${BASE_URL}/services/${id}`);
  return await handleResponse(res, '서비스 상세 정보를 불러오지 못했습니다.');
}

export async function createService(payload: {
  name: string;
  url: string;
  short_desc: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail_url?: string;
  screenshot_url?: string;
  maker_name?: string;
  maker_email?: string;
  is_custom_category?: boolean;
}): Promise<{ success: boolean; service_id: number; maker_code: string; message: string }> {
  const res = await fetch(`${BASE_URL}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleResponse(res, '서비스 등록에 실패했습니다.');
}

export async function fetchCategories(): Promise<{ categories: { name: string; count: number }[] }> {
  try {
    const res = await fetch(`${BASE_URL}/categories`);
    return await handleResponse(res, '카테고리를 불러오지 못했습니다.');
  } catch {
    return {
      categories: DEFAULT_FALLBACK_CATEGORIES.map((c) => ({ name: c, count: 0 }))
    };
  }
}

export async function fetchTags(sort: 'count' | 'trending' | 'name' = 'count'): Promise<{ tags: TagItem[] }> {
  try {
    const res = await fetch(`${BASE_URL}/tags?sort=${sort}`);
    return await handleResponse(res, '태그 목록을 불러오지 못했습니다.');
  } catch {
    return { tags: [] };
  }
}

export async function suggestTag(name: string): Promise<{
  match_type: 'exact' | 'created';
  tag: { id: number; name: string };
  similar_tags?: Array<{ id: number; name: string }>;
  message: string;
}> {
  const res = await fetch(`${BASE_URL}/tags/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return await handleResponse(res, '태그 제안에 실패했습니다.');
}

export async function fetchCurations(): Promise<{ curations: Curation[] }> {
  try {
    const res = await fetch(`${BASE_URL}/curations`);
    return await handleResponse(res, '큐레이션을 불러오지 못했습니다.');
  } catch {
    return { curations: [] };
  }
}

export async function toggleReaction(
  serviceId: number,
  type: 'like' | 'fire' | 'heart' | 'rocket' | 'mind_blown'
): Promise<{ success: boolean; toggled_off: boolean; likes_count: number; reactions: Record<string, number> }> {
  const client_token = getClientToken();
  const res = await fetch(`${BASE_URL}/services/${serviceId}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, client_token }),
  });
  return await handleResponse(res, '반응 처리에 실패했습니다.');
}

export async function submitReview(
  serviceId: number,
  payload: { rating: number; content: string; author_name?: string }
): Promise<{ success: boolean; review: Review }> {
  const res = await fetch(`${BASE_URL}/services/${serviceId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleResponse(res, '후기 작성에 실패했습니다.');
}

export async function toggleFavorite(serviceId: number): Promise<{ success: boolean; is_favorited: boolean }> {
  const client_token = getClientToken();
  const res = await fetch(`${BASE_URL}/services/${serviceId}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_token }),
  });
  return await handleResponse(res, '찜하기 처리에 실패했습니다.');
}

export async function fetchFavorites(): Promise<{ favorites: Service[] }> {
  try {
    const client_token = getClientToken();
    const res = await fetch(`${BASE_URL}/favorites?client_token=${encodeURIComponent(client_token)}`);
    return await handleResponse(res, '찜 목록을 불러오지 못했습니다.');
  } catch {
    return { favorites: [] };
  }
}

export async function submitReport(payload: {
  target_type: 'service' | 'review';
  target_id: number;
  reason: string;
  details?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await handleResponse(res, '신고 접수에 실패했습니다.');
}

export async function trackPromoClick(promoId: number): Promise<void> {
  try {
    await fetch(`${BASE_URL}/promotions/${promoId}/click`, { method: 'POST' });
  } catch {
    // Non-blocking telemetry
  }
}

// ---------------- Maker Studio API ----------------
export async function verifyMaker(
  serviceId: number,
  makerCode: string
): Promise<{ success: boolean; service: Service }> {
  const res = await fetch(`${BASE_URL}/maker/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: serviceId, maker_code: makerCode }),
  });
  return await handleResponse(res, '제작자 코드 인증에 실패했습니다.');
}

export async function updateMakerService(
  serviceId: number,
  makerCode: string,
  payload: Partial<Service>
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/maker/services/${serviceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, maker_code: makerCode }),
  });
  return await handleResponse(res, '서비스 정보 수정에 실패했습니다.');
}

export async function createMakerPost(
  serviceId: number,
  makerCode: string,
  payload: { title: string; content: string; post_type?: string }
): Promise<{ success: boolean; post_id: number; message: string }> {
  const res = await fetch(`${BASE_URL}/maker/services/${serviceId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, maker_code: makerCode }),
  });
  return await handleResponse(res, '공지 등록에 실패했습니다.');
}

export async function deleteMakerPost(
  postId: number,
  makerCode: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/maker/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maker_code: makerCode }),
  });
  return await handleResponse(res, '글 삭제에 실패했습니다.');
}

export async function deleteMakerService(
  serviceId: number,
  makerCode: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/maker/services/${serviceId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maker_code: makerCode }),
  });
  return await handleResponse(res, '사이트 삭제에 실패했습니다.');
}

export async function fetchCommunity(): Promise<{ maker_posts: any[]; reviews: any[] }> {
  try {
    const res = await fetch(`${BASE_URL}/community`);
    return await handleResponse(res, '커뮤니티 데이터를 불러오지 못했습니다.');
  } catch {
    return { maker_posts: [], reviews: [] };
  }
}

// ---------------- Admin API ----------------
export async function adminAuth(passcode: string): Promise<{ success: boolean; token: string }> {
  const res = await fetch(`${BASE_URL}/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode }),
  });
  return await handleResponse(res, '관리자 인증 실패');
}

export async function adminGetServices(token: string): Promise<{ services: Service[] }> {
  const res = await fetch(`${BASE_URL}/admin/services`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '관리자 서비스 목록 조회 실패');
}

export async function adminUpdateServiceStatus(id: number, status: string, token: string) {
  const res = await fetch(`${BASE_URL}/admin/services/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ status }),
  });
  return await handleResponse(res, '상태 변경 실패');
}

export async function adminUpdateServiceCategory(id: number, category: string, token: string) {
  const res = await fetch(`${BASE_URL}/admin/services/${id}/category`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ category }),
  });
  return await handleResponse(res, '카테고리 변경 실패');
}

export async function adminUpdateService(
  id: number,
  payload: Partial<Service> & { tags?: string[] },
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(payload),
  });
  return await handleResponse(res, '서비스 정보 수정 실패');
}

export async function adminDeleteService(id: number, token: string) {
  const res = await fetch(`${BASE_URL}/admin/services/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '서비스 삭제 실패');
}

export async function adminGetCategories(token: string): Promise<{ categories: string[] }> {
  const res = await fetch(`${BASE_URL}/admin/categories`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '분야 목록 조회 실패');
}

export async function adminAddCategory(name: string, token: string): Promise<{ success: boolean; message: string; categories: string[] }> {
  const res = await fetch(`${BASE_URL}/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ name }),
  });
  return await handleResponse(res, '분야 추가 실패');
}

export async function adminSaveCategories(categories: string[], token: string): Promise<{ success: boolean; message: string; categories: string[] }> {
  const res = await fetch(`${BASE_URL}/admin/categories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ categories }),
  });
  return await handleResponse(res, '분야 목록 저장 실패');
}

export async function adminRenameCategory(name: string, new_name: string, token: string): Promise<{ success: boolean; message: string; categories: string[] }> {
  const res = await fetch(`${BASE_URL}/admin/categories/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ new_name }),
  });
  return await handleResponse(res, '분야 수정 실패');
}

export async function adminDeleteCategory(name: string, token: string): Promise<{ success: boolean; message: string; categories: string[] }> {
  const res = await fetch(`${BASE_URL}/admin/categories/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '분야 삭제 실패');
}

export async function adminDownloadBackup(token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/admin/backup`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '백업 데이터 다운로드 실패');
}

export async function adminRestoreBackup(
  backupData: any,
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ backup: backupData }),
  });
  return await handleResponse(res, '데이터 복원 실패');
}

export async function adminGetReports(token: string): Promise<{ reports: ReportItem[] }> {
  const res = await fetch(`${BASE_URL}/admin/reports`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '신고 내역 조회 실패');
}

export async function adminResolveReport(id: number, status: string, token: string) {
  const res = await fetch(`${BASE_URL}/admin/reports/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ status }),
  });
  return await handleResponse(res, '신고 처리 실패');
}

export async function adminGetReviews(token: string): Promise<{ reviews: Review[] }> {
  const res = await fetch(`${BASE_URL}/admin/reviews`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '리뷰 목록 조회 실패');
}

export async function adminUpdateReviewStatus(id: number, status: string, token: string) {
  const res = await fetch(`${BASE_URL}/admin/reviews/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ status }),
  });
  return await handleResponse(res, '리뷰 상태 변경 실패');
}

export async function adminGetTags(token: string): Promise<{ tags: TagItem[] }> {
  const res = await fetch(`${BASE_URL}/admin/tags`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '태그 관리 목록 조회 실패');
}

export async function adminMergeTags(sourceTagId: number, targetTagId: number, token: string) {
  const res = await fetch(`${BASE_URL}/admin/tags/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ source_tag_id: sourceTagId, target_tag_id: targetTagId }),
  });
  return await handleResponse(res, '태그 병합 실패');
}

export async function adminGetCurations(token: string): Promise<{ curations: Curation[] }> {
  const res = await fetch(`${BASE_URL}/admin/curations`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '큐레이션 목록 조회 실패');
}

export async function adminCreateCuration(
  payload: { service_id: number; badge_text: string; editorial_blurb: string; display_order?: number },
  token: string
) {
  const res = await fetch(`${BASE_URL}/admin/curations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(payload),
  });
  return await handleResponse(res, '큐레이션 등록 실패');
}

export async function adminDeleteCuration(id: number, token: string) {
  const res = await fetch(`${BASE_URL}/admin/curations/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '큐레이션 삭제 실패');
}

export async function adminGetPromotions(token: string): Promise<{ promotions: Promotion[] }> {
  const res = await fetch(`${BASE_URL}/admin/promotions`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '스폰서 목록 조회 실패');
}

export async function adminCreatePromotion(
  payload: { service_id: number; slot_type?: string; start_date?: string; end_date?: string },
  token: string
) {
  const res = await fetch(`${BASE_URL}/admin/promotions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(payload),
  });
  return await handleResponse(res, '스폰서 등록 실패');
}

export async function adminTogglePromotion(id: number, status: string, token: string) {
  const res = await fetch(`${BASE_URL}/admin/promotions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ status }),
  });
  return await handleResponse(res, '스폰서 상태 수정 실패');
}

export async function adminGetStats(token: string): Promise<{ stats: AdminStats }> {
  const res = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '통계 조회 실패');
}

export async function fetchSettings(): Promise<{ settings: { slogan: string; slogan_history?: string[]; show_ads?: boolean; site_title?: string } }> {
  try {
    const res = await fetch(`${BASE_URL}/settings`);
    return await handleResponse(res, '설정을 불러오지 못했습니다.');
  } catch {
    return {
      settings: {
        slogan: '바이브코딩 사이트 큐레이션',
        slogan_history: ['바이브코딩 사이트 큐레이션', '인터넷은 아직 재밌다', '웹이라는 게 숨긴다고 숨겨지는 것도 아니고'],
        show_ads: false,
        site_title: '바이브덤프 - 바이브코딩 사이트 큐레이션',
      }
    };
  }
}

export async function updateAdminSettings(
  settings: { slogan?: string; show_ads?: boolean; site_title?: string; new_admin_password?: string } | string,
  token: string
): Promise<any> {
  const body = typeof settings === 'string' ? { slogan: settings } : settings;
  const res = await fetch(`${BASE_URL}/admin/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(body),
  });
  return await handleResponse(res, '설정 저장 실패');
}

export async function adminSeedAdminTestData(token: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin/seed-test-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
  });
  return await handleResponse(res, '테스트 데이터 장전 실패');
}

export async function adminUpdateTagStatus(tagId: number, status: string, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/admin/tags/${tagId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ status }),
  });
  return await handleResponse(res, '태그 상태 변경 실패');
}

export async function adminDeleteTag(tagId: number, token: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/admin/tags/${tagId}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token },
  });
  return await handleResponse(res, '태그 삭제 실패');
}
