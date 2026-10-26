import React, { useState, useEffect } from 'react';
import { Service, Review, MakerPost } from '../types';
import {
  X, ExternalLink, Heart, Flame, Sparkles, Rocket, Lightbulb, ThumbsUp,
  Bookmark, Flag, MessageSquare, Megaphone, Share2, Star, Check
} from 'lucide-react';
import { fetchServiceDetail, toggleReaction, submitReview, toggleFavorite } from '../lib/api';

interface ServiceDetailModalProps {
  serviceId: number;
  onClose: () => void;
  onOpenExternalNotice: (service: Service) => void;
  onOpenReport: (targetType: 'service' | 'review', targetId: number) => void;
  isFavorited: boolean;
  onToggleFavoriteSuccess: (serviceId: number, isFavorited: boolean) => void;
  onSelectRelated: (service: Service) => void;
  showAds?: boolean;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  serviceId,
  onClose,
  onOpenExternalNotice,
  onOpenReport,
  isFavorited,
  onToggleFavoriteSuccess,
  onSelectRelated,
  showAds = false,
}) => {
  const [data, setData] = useState<{
    service: Service;
    reviews: Review[];
    maker_posts: MakerPost[];
    related: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'updates'>('info');

  // Review submission state
  const [rating, setRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Reaction state
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Record<string, boolean>>({});
  const [favState, setFavState] = useState(isFavorited);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchServiceDetail(serviceId)
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setReactions(res.service.reactions || {});
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [serviceId]);

  const handleReactionClick = async (type: 'like' | 'fire' | 'heart' | 'rocket' | 'mind_blown') => {
    try {
      const res = await toggleReaction(serviceId, type);
      setReactions(res.reactions);
      setUserReactions((prev) => ({ ...prev, [type]: !res.toggled_off }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleFavoriteClick = async () => {
    try {
      const res = await toggleFavorite(serviceId);
      setFavState(res.is_favorited);
      onToggleFavoriteSuccess(serviceId, res.is_favorited);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewContent.trim()) return;

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await submitReview(serviceId, {
        rating,
        content: reviewContent.trim(),
        author_name: authorName.trim() || undefined
      });
      if (data) {
        setData({
          ...data,
          reviews: [res.review, ...data.reviews]
        });
      }
      setReviewContent('');
      setAuthorName('');
    } catch (err: any) {
      setReviewError(err.message || '후기 작성에 실패했습니다.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] p-6 max-w-sm w-full text-center space-y-3 shadow-[6px_6px_0_#0A0A0A]">
          <div className="w-8 h-8 border-3 border-[#0A0A0A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#0A0A0A]">프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { service, reviews, maker_posts, related } = data;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-3xl bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Top Bar Window Title */}
        <div className="px-5 py-3 border-b-2 border-[#0A0A0A] flex items-center justify-between gap-4 bg-[#FFD23F]">
          <div className="flex items-center gap-2 overflow-hidden text-xs font-bold text-[#0A0A0A]">
            <span className="bg-[#0A0A0A] text-[#FFD23F] font-mono px-2 py-0.5 rounded border border-[#0A0A0A] font-black">
              ID: #{service.id}
            </span>
            <span className="bg-white px-2 py-0.5 rounded border border-[#0A0A0A]">
              {service.category}
            </span>
            <span>제작자: {service.maker_name || '익명'}</span>
            <span className="font-mono text-[#52525B]">({new Date(service.created_at).toLocaleDateString()})</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShare}
              title="링크 복사"
              className="p-1.5 bg-white border border-[#0A0A0A] rounded hover:bg-[#F1F0E8] transition-colors"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#0A0A0A]" />}
            </button>
            <button
              onClick={() => onOpenReport('service', service.id)}
              title="신고 및 권리자 게재 철회"
              className="p-1.5 bg-white border border-[#0A0A0A] rounded hover:bg-rose-50 text-rose-600 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-white border border-[#0A0A0A] rounded hover:bg-[#F1F0E8] text-[#0A0A0A]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Main Title & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl sm:text-3xl text-[#0A0A0A]">
                  {service.name}
                </h2>
                {showAds && service.is_sponsored && (
                  <span className="bg-[#0A0A0A] text-[#FFD23F] text-[10px] font-black px-2 py-0.5 rounded border border-black">
                    스폰서
                  </span>
                )}
                {service.curation && (
                  <span className="bg-[#06D6A0] text-[#0A0A0A] text-[10px] font-black px-2 py-0.5 rounded border border-black">
                    {service.curation.badge_text}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#52525B] font-medium">
                {service.short_desc}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleFavoriteClick}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border-2 border-[#0A0A0A] transition-all ${
                  favState
                    ? 'bg-[#FF6B9E] text-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A]'
                    : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8]'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${favState ? 'fill-[#0A0A0A]' : ''}`} />
                <span>{favState ? '찜 완료' : '찜하기'}</span>
              </button>

              <button
                onClick={() => onOpenExternalNotice(service)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-[#0A0A0A] bg-[#FFD23F] hover:bg-[#FFD23F]/80 border-2 border-[#0A0A0A] rounded-lg shadow-[3px_3px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <span>사이트 방문하기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Screenshot Preview */}
          {service.screenshot_url || service.thumbnail_url ? (
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#F1F0E8] border-2 border-[#0A0A0A] shadow-[3px_3px_0_#0A0A0A]">
              <img
                src={service.screenshot_url || service.thumbnail_url || ''}
                alt={service.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[#0A0A0A]">태그:</span>
            {service.tags.map((t) => (
              <span key={t} className="text-xs font-bold bg-[#F1F0E8] text-[#0A0A0A] px-2 py-0.5 rounded border border-[#0A0A0A]">
                #{t}
              </span>
            ))}
          </div>

          {/* Neo-brutalist Multi-Reactions Bar (Requirement 9) */}
          <div className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl flex items-center justify-around flex-wrap gap-2 shadow-[2px_2px_0_#0A0A0A]">
            {[
              { type: 'like', label: '좋아요', icon: Heart },
              { type: 'cheer', label: '응원해요', icon: Flame },
              { type: 'helpful', label: '도움돼요', icon: ThumbsUp },
              { type: 'fresh', label: '새로워요', icon: Sparkles },
              { type: 'amazed', label: '진짜 이게 바이브코딩이라고?', icon: Rocket },
            ].map((r) => {
              const count = reactions[r.type] || 0;
              const active = !!userReactions[r.type];
              const Icon = r.icon;
              return (
                <button
                  key={r.type}
                  onClick={() => handleReactionClick(r.type as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#0A0A0A] text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#FFD23F] text-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A] translate-x-0.5'
                      : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'fill-[#0A0A0A]' : ''}`} />
                  <span>{r.label}</span>
                  <span className="font-mono tabular-nums text-[11px] ml-0.5">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-Tabs: Info / Reviews / Maker Updates */}
          <div className="border-b-2 border-[#0A0A0A] flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2 px-1 transition-colors ${
                activeTab === 'info'
                  ? 'border-b-4 border-[#0A0A0A] text-[#0A0A0A]'
                  : 'text-[#52525B] hover:text-[#0A0A0A]'
              }`}
            >
              상세 설명
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-2 px-1 flex items-center gap-1 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-b-4 border-[#0A0A0A] text-[#0A0A0A]'
                  : 'text-[#52525B] hover:text-[#0A0A0A]'
              }`}
            >
              <span>후기 ({reviews.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`pb-2 px-1 flex items-center gap-1 transition-colors ${
                activeTab === 'updates'
                  ? 'border-b-4 border-[#0A0A0A] text-[#0A0A0A]'
                  : 'text-[#52525B] hover:text-[#0A0A0A]'
              }`}
            >
              <span>제작자 공지 ({maker_posts.length})</span>
            </button>
          </div>

          {/* Tab 1: Info */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2.5 bg-[#F1F0E8] border-2 border-[#0A0A0A] rounded-lg text-xs font-bold text-[#0A0A0A]">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#0A0A0A]">
                    사이트 고유 ID: #{service.id}
                  </span>
                  <span>카테고리: {service.category}</span>
                </div>
                <span className="text-[#52525B] text-[11px]">
                  등록일: {new Date(service.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="p-4 bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] text-xs sm:text-sm text-[#0A0A0A] leading-relaxed whitespace-pre-line">
                {service.description}
              </div>

              {/* Safety notice (PRD 1.4 & 9.2) */}
              <div className="p-3 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl text-xs text-[#0A0A0A] flex items-start gap-2">
                <span className="font-bold shrink-0">안내:</span>
                <p>
                  바이브덤프는 독립 제작자의 바이브 코딩 창작물을 모아 보여드리며, 외부 사이트의 보안성이나 무결성을 직접 보증하지 않습니다. 안전한 브라우징을 권장합니다.
                </p>
              </div>

              {/* Related services */}
              {related.length > 0 && (
                <div className="pt-2">
                  <h4 className="font-display text-sm text-[#0A0A0A] mb-3">
                    '{service.category}' 카테고리의 다른 프로젝트
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {related.map((rel) => (
                      <div
                        key={rel.id}
                        onClick={() => onSelectRelated(rel)}
                        className="p-3 bg-white border-2 border-[#0A0A0A] rounded-lg hover:bg-[#FAFAF5] transition-all cursor-pointer flex items-center justify-between shadow-[2px_2px_0_#0A0A0A]"
                      >
                        <div className="overflow-hidden pr-2">
                          <p className="text-xs font-bold text-[#0A0A0A] truncate">{rel.name}</p>
                          <p className="text-[11px] text-[#52525B] truncate mt-0.5">{rel.short_desc}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#C81E4B] shrink-0 font-mono">
                          <Heart className="w-3 h-3 fill-[#C81E4B]" />
                          <span>{rel.likes_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {/* Review Write Form */}
              <form onSubmit={handleReviewSubmit} className="p-4 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[2px_2px_0_#0A0A0A]">
                <h4 className="font-display text-sm text-[#0A0A0A]">후기 작성하기</h4>
                
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span>별점:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1 focus:outline-none"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            s <= rating ? 'fill-[#FFD23F] text-[#0A0A0A]' : 'text-neutral-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-mono text-xs font-bold ml-1">{rating}점</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="작성자 닉네임 (기본: 익명)"
                    maxLength={30}
                    className="px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="프로젝트를 사용해보신 후기를 남겨주세요 (2~500자)"
                      maxLength={500}
                      className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                {reviewError && (
                  <p className="text-xs font-bold text-[#C81E4B]">{reviewError}</p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !reviewContent.trim()}
                    className="px-4 py-2 text-xs font-bold text-[#0A0A0A] bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
                  >
                    {isSubmittingReview ? '작성 중...' : '후기 등록'}
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="space-y-2">
                {reviews.length === 0 ? (
                  <p className="text-xs text-[#52525B] text-center py-6 font-medium">
                    아직 등록된 후기가 없습니다. 첫 번째 후기를 남겨보세요!
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-3 bg-white border-2 border-[#0A0A0A] rounded-lg space-y-1 shadow-[2px_2px_0_#0A0A0A]">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-[#0A0A0A]">
                          <span>{rev.author_name}</span>
                          <span className="font-mono text-[#0A0A0A]">
                            {'★'.repeat(rev.rating)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[#52525B] text-[11px]">
                          <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                          <button
                            onClick={() => onOpenReport('review', rev.id)}
                            title="신고"
                            className="hover:text-rose-600"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#0A0A0A] leading-relaxed font-medium">{rev.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Maker Updates */}
          {activeTab === 'updates' && (
            <div className="space-y-3">
              {maker_posts.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#52525B] space-y-1">
                  <p className="font-bold">등록된 제작자 공지가 없습니다.</p>
                  <p>제작자 스튜디오에서 코드로 인증 후 새 소식을 공유할 수 있습니다.</p>
                </div>
              ) : (
                maker_posts.map((post) => (
                  <div key={post.id} className="p-4 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-2 shadow-[2px_2px_0_#0A0A0A]">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#FFD23F] text-[#0A0A0A] text-[10px] font-black px-2 py-0.5 rounded border border-[#0A0A0A]">
                          {post.post_type === 'update' ? '업데이트' : post.post_type === 'devlog' ? '개발일지' : '공지'}
                        </span>
                        <h4 className="font-bold text-[#0A0A0A]">{post.title}</h4>
                      </div>
                      <span className="text-[11px] text-[#52525B] font-mono">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#0A0A0A] whitespace-pre-line leading-relaxed font-medium">
                      {post.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
