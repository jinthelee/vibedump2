import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileHeader } from './components/MobileHeader';
import { Hero } from './components/Hero';
import { CategoryFilter } from './components/CategoryFilter';
import { TagExplorer } from './components/TagExplorer';
import { ServiceCard } from './components/ServiceCard';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { SubmitServiceModal } from './components/SubmitServiceModal';
import { SiteManagementModal } from './components/SiteManagementModal';
import { ExternalNoticeModal } from './components/ExternalNoticeModal';
import { ReportModal } from './components/ReportModal';
import { AboutModal } from './components/AboutModal';
import { PolicyModal, PolicyTabType } from './components/PolicyModal';
import { CurationsSlider } from './components/CurationsSlider';
import { FloatingAdBanner } from './components/FloatingAdBanner';
import {
  fetchServices, fetchCategories, fetchTags, fetchCurations,
  fetchFavorites, fetchSettings, fetchCommunity
} from './lib/api';
import { Service, TagItem, Curation } from './types';
import { MessageSquare, Megaphone, Bookmark, Dices } from 'lucide-react';

export default function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [curations, setCurations] = useState<Curation[]>([]);
  const [favoritesList, setFavoritesList] = useState<Service[]>([]);

  // Community data (Requirement 5: only real manual maker posts & reviews)
  const [communityMakerPosts, setCommunityMakerPosts] = useState<any[]>([]);
  const [communityReviews, setCommunityReviews] = useState<any[]>([]);

  // Slogan & Ad Display State (Friend mode defaults to showAds: false)
  const [slogan, setSlogan] = useState<string>('인터넷은 아직 재밌다');
  const [siteTitle, setSiteTitle] = useState<string>('바이브덤프 - 인터넷은 아직 재밌다');
  const [showAds, setShowAds] = useState<boolean>(false);

  // Navigation: 'discover' | 'community' | 'tags' | 'favorites'
  const [activeTab, setActiveTab] = useState<'discover' | 'community' | 'tags' | 'favorites'>('discover');

  // Filtering & Sorting State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'latest' | 'popular' | 'views' | 'reviews'>('latest');
  const [tagSort, setTagSort] = useState<'count' | 'trending' | 'name'>('count');

  // Favorites tracking
  const [favoritesIds, setFavoritesIds] = useState<Set<number>>(new Set());

  // Modals state
  const [detailServiceId, setDetailServiceId] = useState<number | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [externalNoticeService, setExternalNoticeService] = useState<Service | null>(null);
  const [reportTarget, setReportTarget] = useState<{ targetType: 'service' | 'review'; targetId: number } | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [policyTab, setPolicyTab] = useState<PolicyTabType | null>(null);

  // Sync document.title dynamically
  useEffect(() => {
    if (detailServiceId) {
      const currentService = services.find((s) => s.id === detailServiceId);
      if (currentService) {
        document.title = `${currentService.name} | ${siteTitle}`;
        return;
      }
    }
    document.title = siteTitle;
  }, [siteTitle, detailServiceId, services]);

  const [isLoading, setIsLoading] = useState(true);

  // Load services with current filters
  const loadServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchServices({
        category: selectedCategory,
        tag: selectedTag || undefined,
        q: searchQuery,
        sort: sortOption,
      });
      setServices(res.services);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedTag, searchQuery, sortOption]);

  // Load metadata (categories, tags, curations, favorites, settings, community)
  const loadMetadata = useCallback(async () => {
    try {
      const [catRes, tagRes, curRes, favRes, setRes, comRes] = await Promise.all([
        fetchCategories(),
        fetchTags(tagSort),
        fetchCurations(),
        fetchFavorites(),
        fetchSettings().catch(() => ({ settings: { slogan: '인터넷은 아직 재밌다', show_ads: false, site_title: '바이브덤프 - 인터넷은 아직 재밌다' } })),
        fetchCommunity().catch(() => ({ maker_posts: [], reviews: [] })),
      ]);
      setCategories(catRes.categories);
      setTags(tagRes.tags);
      setCurations(curRes.curations);
      setFavoritesList(favRes.favorites);
      setFavoritesIds(new Set(favRes.favorites.map((f) => f.id)));
      if (setRes.settings?.slogan) {
        setSlogan(setRes.settings.slogan);
      }
      if (setRes.settings?.site_title) {
        setSiteTitle(setRes.settings.site_title);
      }
      if (typeof setRes.settings?.show_ads === 'boolean') {
        setShowAds(setRes.settings.show_ads);
      }
      setCommunityMakerPosts(comRes.maker_posts || []);
      setCommunityReviews(comRes.reviews || []);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  }, [tagSort]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Requirement 2 & 3: Random recommendation discovery ("두려워말고 전진")
  const handleRandomDiscover = () => {
    if (services.length === 0) return;
    const randomIndex = Math.floor(Math.random() * services.length);
    const randomService = services[randomIndex];
    setDetailServiceId(randomService.id);
  };

  const handleToggleFavoriteSuccess = (serviceId: number, isFavorited: boolean) => {
    setFavoritesIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) next.add(serviceId);
      else next.delete(serviceId);
      return next;
    });
    fetchFavorites()
      .then((res) => setFavoritesList(res.favorites))
      .catch(() => {});
  };

  const totalRegisteredCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="min-h-screen bg-[#F4F3ED] text-[#0A0A0A] font-sans flex flex-col md:flex-row pb-12">
      {/* 1. Mobile Top Header */}
      <MobileHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSubmit={() => setIsSubmitOpen(true)}
        onOpenManagement={() => setIsManagementOpen(true)}
        onRandomDiscover={handleRandomDiscover}
        favoritesCount={favoritesIds.size}
        slogan={slogan}
      />

      {/* 2. Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSubmit={() => setIsSubmitOpen(true)}
        onOpenManagement={() => setIsManagementOpen(true)}
        favorites={favoritesList}
        onSelectService={(s) => setDetailServiceId(s.id)}
        onOpenExternalNotice={(s) => setExternalNoticeService(s)}
        slogan={slogan}
        onOpenAboutModal={() => setIsAboutOpen(true)}
        onOpenPolicy={(tab) => setPolicyTab(tab)}
      />

      {/* 3. Main Content Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Tab 1: Discover Feed (사이트 찾기) */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Hero Section (Item 6: Random dice button placed left of 등록된 사이트 in space-y-6 pb-2 section) */}
            <Hero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalServicesCount={totalRegisteredCount}
              onRandomDiscover={handleRandomDiscover}
            />

            {/* Category Filter Buttons */}
            <section className="space-y-2">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setSelectedTag(null);
                }}
              />
            </section>

            {/* Tag Filter Bar */}
            <section>
              <TagExplorer
                tags={tags}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
                onTagCreated={loadMetadata}
                tagSort={tagSort}
                onTagSortChange={setTagSort}
              />
            </section>

            {/* Editor's Curations (Item 13: Sliding Banner Showcase with stable size) */}
            {curations.length > 0 && (
              <CurationsSlider
                curations={curations}
                onSelectService={(s) => setDetailServiceId(s.id)}
                onOpenExternalNotice={(s) => setExternalNoticeService(s)}
                showAds={showAds}
              />
            )}

            {/* Services Grid with Sort Controls */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t-2 border-[#0A0A0A]">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base text-[#0A0A0A]">
                    {selectedTag ? `#${selectedTag} 검색 결과` : selectedCategory !== 'all' ? `${selectedCategory} 카테고리` : '등록된 사이트'}
                  </span>
                  <span className="font-mono text-xs font-bold text-[#52525B]">
                    ({services.length}개)
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold">
                  {[
                    { id: 'latest', label: '최신순' },
                    { id: 'popular', label: '인기순' },
                    { id: 'views', label: '조회순' },
                    { id: 'reviews', label: '후기순' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSortOption(s.id as any)}
                      className={`px-2.5 py-1 rounded border-2 border-[#0A0A0A] transition-all ${
                        sortOption === s.id
                          ? 'bg-[#0A0A0A] text-white shadow-[1px_1px_0_#FFD23F]'
                          : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-64 bg-white/60 border-2 border-neutral-300 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="p-12 text-center bg-white border-2 border-[#0A0A0A] rounded-xl shadow-[4px_4px_0_#0A0A0A] space-y-4">
                  <div className="w-14 h-14 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#0A0A0A]">
                    <span className="text-2xl">{totalRegisteredCount === 0 ? '🚀' : '⌕'}</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-xl sm:text-2xl text-[#0A0A0A]">
                      {totalRegisteredCount === 0
                        ? '첫 번째 바이브 코딩 사이트를 등록해보세요!'
                        : '조건에 맞는 사이트가 없어요.'}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#52525B] font-medium max-w-md mx-auto leading-relaxed">
                      {totalRegisteredCount === 0
                        ? '아직 등록된 사이트가 없습니다. 내가 직접 만든 웹사이트나 웹앱을 첫 번째로 공유해보세요!'
                        : '다른 검색어를 입력하시거나 카테고리 필터를 변경해보세요!'}
                    </p>
                  </div>
                  {totalRegisteredCount === 0 ? (
                    <div className="pt-2">
                      <button
                        onClick={() => setIsSubmitOpen(true)}
                        className="px-5 py-2.5 bg-[#FF6B9E] hover:bg-[#FF6B9E]/85 text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-xl font-bold text-xs shadow-[3px_3px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all inline-flex items-center gap-1.5"
                      >
                        <span>+ 사이트 등록하기</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center justify-center gap-1.5 flex-wrap">
                      {['게임', '웹앱', 'AI', '시각화'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory('all');
                            setSelectedTag(cat);
                            setSearchQuery('');
                          }}
                          className="text-xs px-2.5 py-1 bg-[#F1F0E8] border border-[#0A0A0A] rounded font-bold hover:bg-[#FFD23F]"
                        >
                          #{cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onOpenDetail={(s) => setDetailServiceId(s.id)}
                      onOpenExternalNotice={(s) => setExternalNoticeService(s)}
                      isFavorited={favoritesIds.has(service.id)}
                      onToggleFavoriteSuccess={handleToggleFavoriteSuccess}
                      showAds={showAds}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 2: Community Feed (Requirement 3 & 5: 최신 덤퍼 후기 & 제작자 공지) */}
        {activeTab === 'community' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="inline-block text-[11px] font-black tracking-widest text-[#0A0A0A] bg-[#FFD23F] px-2.5 py-0.5 border-2 border-[#0A0A0A] rounded shadow-[2px_2px_0_#0A0A0A]">
                COMMUNITY & FEEDBACK
              </span>
              <h2 className="font-display text-3xl text-[#0A0A0A]">
                바이브덤프 커뮤니티
              </h2>
              <p className="text-xs sm:text-sm text-[#52525B] font-medium">
                등록된 사이트들의 최신 덤퍼 후기와 제작자들의 수기 공지를 실시간으로 확인하세요.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Reviews list (최신 덤퍼 후기) */}
              <div className="bg-white border-2 border-[#0A0A0A] rounded-xl p-5 shadow-[4px_4px_0_#0A0A0A] space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-[#0A0A0A] pb-2">
                  <MessageSquare className="w-4 h-4 text-[#0A0A0A]" />
                  <h3 className="font-display text-base text-[#0A0A0A]">최신 덤퍼 후기</h3>
                </div>

                <div className="space-y-3">
                  {communityReviews.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-2">
                      <MessageSquare className="w-8 h-8 text-[#52525B] mx-auto opacity-50" />
                      <p className="text-xs font-bold text-[#0A0A0A]">아직 등록된 덤퍼 후기가 없습니다.</p>
                      <p className="text-[11px] text-[#52525B]">
                        등록된 사이트 상세 페이지를 열고 첫 솔직한 후기를 남겨보세요!
                      </p>
                    </div>
                  ) : (
                    communityReviews.map((rev, idx) => (
                      <div key={idx} className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              if (rev.service_id) {
                                setDetailServiceId(rev.service_id);
                              } else {
                                const match = services.find((s) => s.name === rev.service_name);
                                if (match) setDetailServiceId(match.id);
                              }
                            }}
                            className="text-[#1F5FD1] hover:underline font-bold text-left truncate max-w-[65%] cursor-pointer flex items-center gap-1 group"
                            title={`${rev.service_name} 사이트 카드 열기`}
                          >
                            <span className="truncate">{rev.service_name}</span>
                            <span className="text-[10px] text-neutral-400 group-hover:text-[#1F5FD1]">↗</span>
                          </button>
                          <span className="font-mono text-[#0A0A0A]">{'★'.repeat(rev.rating)}</span>
                        </div>
                        <p className="text-xs text-[#0A0A0A] font-medium">{rev.content}</p>
                        <span className="text-[10px] text-[#52525B] block pt-0.5 font-bold">작성자: {rev.author_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Requirement 5: Maker devlog / updates list (수기 등록 공지만 노출) */}
              <div className="bg-white border-2 border-[#0A0A0A] rounded-xl p-5 shadow-[4px_4px_0_#0A0A0A] space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-[#0A0A0A] pb-2">
                  <Megaphone className="w-4 h-4 text-[#0A0A0A]" />
                  <h3 className="font-display text-base text-[#0A0A0A]">제작자 공지</h3>
                </div>

                <div className="space-y-3">
                  {communityMakerPosts.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-2">
                      <Megaphone className="w-8 h-8 text-[#52525B] mx-auto opacity-50" />
                      <p className="text-xs font-bold text-[#0A0A0A]">아직 등록된 수기 제작자 공지가 없습니다.</p>
                      <p className="text-[11px] text-[#52525B]">
                        제작자 스튜디오(사이트 관리 &gt; 제작자 영역)에서 내 사이트의 첫 공지를 직접 작성해보세요!
                      </p>
                    </div>
                  ) : (
                    communityMakerPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setDetailServiceId(post.service_id)}
                        className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg space-y-1 cursor-pointer hover:bg-[#FFF3C4] transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-[#FFD23F] px-1.5 py-0.5 rounded border border-[#0A0A0A] text-[10px]">
                              {post.post_type === 'update' ? '업데이트' : post.post_type === 'devlog' ? '개발일지' : '공지'}
                            </span>
                            <span className="text-[#1F5FD1] text-[11px] font-bold">[{post.service_name}]</span>
                          </div>
                          <span className="text-[11px] font-mono text-[#52525B]">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-[#0A0A0A] line-clamp-1">
                          {post.title}
                        </h4>
                        <p className="text-xs text-[#52525B] line-clamp-2">
                          {post.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Dedicated Tag Explorer View (Requirement 10: 덤프 태그 디렉토리) */}
        {activeTab === 'tags' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="inline-block text-[11px] font-black tracking-widest text-[#0A0A0A] bg-[#FFD23F] px-2.5 py-0.5 border-2 border-[#0A0A0A] rounded shadow-[2px_2px_0_#0A0A0A]">
                TAG DIRECTORY
              </span>
              <h2 className="font-display text-3xl text-[#0A0A0A]">
                덤프 태그 디렉토리
              </h2>
              <p className="text-xs sm:text-sm text-[#52525B] font-medium">
                서로 다른 공개 서비스에 연결된 빈도와 최근 7일 급상승 추이 순으로 정리된 태그 목록입니다.
              </p>
            </div>

            <TagExplorer
              tags={tags}
              selectedTag={selectedTag}
              onSelectTag={(t) => {
                setSelectedTag(t);
                setActiveTab('discover');
              }}
              onTagCreated={loadMetadata}
              tagSort={tagSort}
              onTagSortChange={setTagSort}
            />

            {/* Popular Tag Clouds */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-4 border-t-2 border-[#0A0A0A]">
              {tags.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTag(t.name);
                    setActiveTab('discover');
                  }}
                  className="p-3 bg-white border-2 border-[#0A0A0A] rounded-xl shadow-[3px_3px_0_#0A0A0A] hover:bg-[#FFD23F] transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="font-bold text-xs text-[#0A0A0A]">#{t.name}</span>
                  <span className="font-mono text-xs font-bold bg-[#F1F0E8] px-2 py-0.5 rounded border border-[#0A0A0A]">
                    {t.service_count}개
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Favorites Grid (Requirement 3: 찜한 사이트) */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="inline-block text-[11px] font-black tracking-widest text-[#0A0A0A] bg-[#FF6B9E] px-2.5 py-0.5 border-2 border-[#0A0A0A] rounded shadow-[2px_2px_0_#0A0A0A]">
                BOOKMARKED SITES
              </span>
              <h2 className="font-display text-3xl text-[#0A0A0A]">
                찜한 사이트
              </h2>
              <p className="text-xs sm:text-sm text-[#52525B] font-medium">
                브라우저에 보관된 나만의 즐겨찾기 목록입니다. ({favoritesList.length}개)
              </p>
              <div className="p-3 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl text-xs font-medium text-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A]">
                💡 <strong>보관 안내:</strong> 브라우저 로컬 저장소를 활용하므로 쿠키 및 사이트 데이터 삭제 시 찜한 사이트 목록이 리셋됩니다.
              </div>
            </div>

            {favoritesList.length === 0 ? (
              <div className="p-12 text-center bg-white border-2 border-[#0A0A0A] rounded-xl shadow-[4px_4px_0_#0A0A0A] space-y-3">
                <Bookmark className="w-10 h-10 text-neutral-400 mx-auto" />
                <h3 className="font-display text-xl text-[#0A0A0A]">
                  아직 찜한 사이트가 없어요.
                </h3>
                <p className="text-xs text-[#52525B] font-medium">
                  사이트 카드의 북마크 아이콘을 눌러 나만의 컬렉션을 만들어보세요!
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg font-bold text-xs shadow-[2px_2px_0_#0A0A0A]"
                  >
                    사이트 둘러보기
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {favoritesList.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onOpenDetail={(s) => setDetailServiceId(s.id)}
                    onOpenExternalNotice={(s) => setExternalNoticeService(s)}
                    isFavorited={true}
                    onToggleFavoriteSuccess={handleToggleFavoriteSuccess}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Modals */}
      {detailServiceId && (
        <ServiceDetailModal
          serviceId={detailServiceId}
          onClose={() => setDetailServiceId(null)}
          onOpenExternalNotice={(s) => setExternalNoticeService(s)}
          onOpenReport={(type, id) => setReportTarget({ targetType: type, targetId: id })}
          isFavorited={favoritesIds.has(detailServiceId)}
          onToggleFavoriteSuccess={handleToggleFavoriteSuccess}
          onSelectRelated={(rel) => setDetailServiceId(rel.id)}
          showAds={showAds}
        />
      )}

      {isSubmitOpen && (
        <SubmitServiceModal
          availableCategories={categories.map((c) => c.name)}
          onClose={() => setIsSubmitOpen(false)}
          onSuccess={() => {
            loadServices();
            loadMetadata();
          }}
        />
      )}

      {isManagementOpen && (
        <SiteManagementModal
          onClose={() => setIsManagementOpen(false)}
          onRefreshAll={() => {
            loadServices();
            loadMetadata();
          }}
          onSloganChange={(newSlogan) => setSlogan(newSlogan)}
          siteTitle={siteTitle}
          onSiteTitleChange={(newTitle) => setSiteTitle(newTitle)}
          showAds={showAds}
          onToggleShowAds={(val) => setShowAds(val)}
        />
      )}

      <ExternalNoticeModal
        service={externalNoticeService}
        onClose={() => setExternalNoticeService(null)}
      />

      {reportTarget && (
        <ReportModal
          targetType={reportTarget.targetType}
          targetId={reportTarget.targetId}
          onClose={() => setReportTarget(null)}
          initialMode="takedown"
        />
      )}

      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
      {policyTab && <PolicyModal initialTab={policyTab} onClose={() => setPolicyTab(null)} />}

      {/* 5. Floating Ad Banner (Only shown when showAds is enabled) */}
      {showAds && <FloatingAdBanner />}
    </div>
  );
}
