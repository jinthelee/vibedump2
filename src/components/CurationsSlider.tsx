import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Heart, Sparkles, Eye, ArrowUpRight } from 'lucide-react';
import { Curation, Service } from '../types';

interface CurationsSliderProps {
  curations: Curation[];
  onSelectService: (service: Service) => void;
  onOpenExternalNotice: (service: Service) => void;
  showAds?: boolean;
}

export const CurationsSlider: React.FC<CurationsSliderProps> = ({
  curations,
  onSelectService,
  onOpenExternalNotice,
  showAds = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<any>(null);

  const total = curations.length;

  useEffect(() => {
    if (total <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 5500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isPaused]);

  if (total === 0) return null;

  const current = curations[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  return (
    <section className="space-y-3 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded flex items-center justify-center font-bold text-xs shadow-[2px_2px_0_#0A0A0A]">
            ✦
          </span>
          <h3 className="font-display text-lg text-[#0A0A0A] tracking-tight">
            에디터 큐레이션 <span className="text-xs font-sans font-normal text-[#52525B]">/ 주목할 만한 바이브 프로젝트</span>
          </h3>
          {showAds && (
            <span className="hidden sm:inline-block bg-[#0A0A0A] text-[#FFD23F] font-mono text-[10px] font-black px-2 py-0.5 rounded border border-[#0A0A0A]">
              SPONSORED SPOTLIGHT
            </span>
          )}
        </div>

        {/* Carousel controls */}
        {total > 1 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#52525B] bg-white px-2 py-0.5 border border-[#0A0A0A] rounded">
              {currentIndex + 1} / {total}
            </span>
            <button
              onClick={handlePrev}
              aria-label="이전 큐레이션"
              className="p-1.5 bg-white hover:bg-[#F1F0E8] border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all text-[#0A0A0A]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="다음 큐레이션"
              className="p-1.5 bg-white hover:bg-[#F1F0E8] border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all text-[#0A0A0A]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Sliding Banner Card with stable height */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onClick={() => onSelectService(current as any)}
        className="relative overflow-hidden bg-gradient-to-br from-[#FFFBEA] via-white to-[#F6F5EE] border-3 border-[#0A0A0A] rounded-2xl p-5 sm:p-6 shadow-[6px_6px_0_#0A0A0A] hover:shadow-[8px_8px_0_#0A0A0A] transition-all cursor-pointer group"
      >
        {/* Decorative corner tag */}
        <div className="absolute top-0 right-0 bg-[#FFD23F] border-l-2 border-b-2 border-[#0A0A0A] px-3 py-1 text-[11px] font-black text-[#0A0A0A] rounded-bl-xl shadow-[-1px_1px_0_#0A0A0A] flex items-center gap-1 z-10">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FEATURED</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 items-stretch min-h-[220px]">
          {/* Left / Info column (7 cols) with stable height distribution */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#06D6A0] text-[#0A0A0A] text-xs font-black px-2.5 py-1 rounded-md border-2 border-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A]">
                {current.badge_text || '에디터 픽'}
              </span>
              <span className="text-xs font-mono font-bold text-[#52525B] bg-white px-2 py-0.5 rounded border border-[#0A0A0A]">
                #{current.category}
              </span>
              {current.tags && current.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-bold text-[#52525B] bg-[#FAFAF5] px-2 py-0.5 rounded border border-neutral-300"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <div className="space-y-1.5 flex-1">
              <h4 className="font-display text-xl sm:text-2xl lg:text-3xl text-[#0A0A0A] leading-tight group-hover:text-[#1F5FD1] transition-colors flex items-center gap-2">
                <span className="truncate line-clamp-1">{current.name}</span>
                <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-[#1F5FD1] shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </h4>
              <p className="text-xs sm:text-sm text-[#0A0A0A] font-semibold leading-relaxed line-clamp-1 h-5 overflow-hidden">
                "{current.editorial_blurb}"
              </p>
              <p className="text-xs text-[#52525B] line-clamp-2 h-9 overflow-hidden font-medium">
                {current.short_desc}
              </p>
            </div>

            {/* Metrics & Actions */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-3 border-t border-[#0A0A0A]/15">
              <div className="flex items-center gap-3 text-xs font-bold text-[#0A0A0A]">
                <div className="flex items-center gap-1 text-[#C81E4B] font-mono">
                  <Heart className="w-4 h-4 fill-[#C81E4B]" />
                  <span>{current.likes_count}</span>
                </div>
                <div className="flex items-center gap-1 text-[#52525B] font-mono">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{current.views_count}회 조회</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectService(current as any);
                  }}
                  className="px-3.5 py-1.5 bg-white hover:bg-[#F1F0E8] text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-lg text-xs font-bold shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 transition-all"
                >
                  상세보기
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenExternalNotice(current as any);
                  }}
                  className="px-4 py-1.5 bg-[#FFD23F] hover:bg-[#FFD23F]/90 text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-lg text-xs font-bold shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 flex items-center gap-1.5 transition-all"
                >
                  <span>방문하기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right / Visual Preview column (5 cols) with fixed height */}
          <div className="md:col-span-5 flex items-center">
            <div className="relative h-[180px] sm:h-[200px] md:h-[215px] w-full rounded-xl overflow-hidden border-2 border-[#0A0A0A] shadow-[4px_4px_0_#0A0A0A] bg-neutral-900 group-hover:scale-[1.01] transition-transform">
              {current.thumbnail_url || current.screenshot_url ? (
                <img
                  src={current.thumbnail_url || current.screenshot_url || undefined}
                  alt={current.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}

              {/* Overlay with Neo-Brutalist Frame details */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3.5 text-white">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="font-mono text-[11px] bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                    {current.url.replace(/^https?:\/\//, '').split('/')[0]}
                  </span>
                  <span className="px-2 py-0.5 bg-[#FFD23F] text-[#0A0A0A] font-bold text-[10px] rounded border border-black">
                    바로가기 ↗
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Pagination Dots */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-4 mt-2">
            {curations.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`슬라이드 ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  currentIndex === idx
                    ? 'w-6 bg-[#0A0A0A]'
                    : 'w-2 bg-[#0A0A0A]/30 hover:bg-[#0A0A0A]/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
