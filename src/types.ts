export const VALID_CATEGORIES = [
  '생산성',
  '비즈니스',
  '창작',
  '게임',
  '체크리스트',
  '사주타로',
  '밈',
  '덕질',
  '라이프',
  '학습',
  '소셜',
  '캐릭터소셜',
] as const;

export type CategoryType = typeof VALID_CATEGORIES[number] | string;

export interface Service {
  id: number;
  name: string;
  url: string;
  short_desc: string;
  description: string;
  category: CategoryType | string;
  thumbnail_url: string | null;
  screenshot_url: string | null;
  maker_name: string | null;
  maker_email?: string | null;
  status: 'approved' | 'pending' | 'rejected' | 'hidden';
  views_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  is_sponsored?: boolean;
  sponsor_id?: number | null;
  sponsor_slot?: string | null;
  curation?: {
    badge_text: string;
    editorial_blurb: string;
  } | null;
  reactions?: Record<string, number>;
}

export interface TagItem {
  id: number;
  name: string;
  normalized_name: string;
  service_count: number;
  recent_growth: number;
  status?: string;
  created_at: string;
}

export interface Review {
  id: number;
  service_id: number;
  rating: number;
  content: string;
  author_name: string;
  status?: string;
  created_at: string;
  service_name?: string;
}

export interface MakerPost {
  id: number;
  service_id: number;
  title: string;
  content: string;
  post_type: 'notice' | 'update' | 'devlog';
  created_at: string;
}

export interface Curation {
  curation_id: number;
  id: number;
  name: string;
  url: string;
  short_desc: string;
  category: CategoryType;
  thumbnail_url: string | null;
  screenshot_url?: string | null;
  likes_count: number;
  views_count: number;
  badge_text: string;
  editorial_blurb: string;
  display_order: number;
  tags: string[];
}

export interface Promotion {
  id: number;
  service_id: number;
  service_name?: string;
  slot_type: string;
  status: 'active' | 'paused' | 'expired';
  impressions: number;
  clicks: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface ReportItem {
  id: number;
  target_type: 'service' | 'review';
  target_id: number;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  target_label?: string;
}

export interface AdminStats {
  total_services: number;
  approved_services: number;
  pending_services: number;
  total_reviews: number;
  pending_reports: number;
  total_reactions: number;
  active_promotions: number;
  category_breakdown: { category: string; count: number }[];
}

export interface SiteSettings {
  slogan: string;
  slogan_history?: string[];
  show_ads?: boolean;
  site_title?: string;
}

