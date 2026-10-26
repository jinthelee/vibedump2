import React, { useState } from 'react';
import { Service } from '../types';
import { Heart, ExternalLink, Bookmark, MessageSquare } from 'lucide-react';
import { toggleReaction, toggleFavorite, trackPromoClick } from '../lib/api';

interface ServiceCardProps {
  service: Service;
  onOpenDetail: (service: Service) => void;
  onOpenExternalNotice: (service: Service) => void;
  isFavorited: boolean;
  onToggleFavoriteSuccess: (serviceId: number, isFavorited: boolean) => void;
  showAds?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onOpenDetail,
  onOpenExternalNotice,
  isFavorited,
  onToggleFavoriteSuccess,
  showAds = false,
}) => {
  const [likesCount, setLikesCount] = useState(service.likes_count);
  const [hasLiked, setHasLiked] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [favState, setFavState] = useState(isFavorited);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleReaction(service.id, 'like');
      setLikesCount(res.likes_count);
      setHasLiked(!res.toggled_off);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleFavorite(service.id);
      setFavState(res.is_favorited);
      onToggleFavoriteSuccess(service.id, res.is_favorited);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (service.sponsor_id) {
      trackPromoClick(service.sponsor_id);
    }
    onOpenExternalNotice(service);
  };

  return (
    <article
      onClick={() => onOpenDetail(service)}
      className="group relative flex flex-col bg-white rounded-xl border-2 border-[#0A0A0A] overflow-hidden shadow-[4px_4px_0_#0A0A0A] hover:shadow-[6px_6px_0_#0A0A0A] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
    >
      {/* Cover / Image Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F1F0E8] border-b-2 border-[#0A0A0A]">
        {!imageError && service.thumbnail_url ? (
          <img
            src={service.thumbnail_url}
            alt={service.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#FFF3C4] text-[#0A0A0A]">
            <span className="font-display text-4xl text-[#0A0A0A]/40 mb-1">
              {service.name.charAt(0)}
            </span>
            <span className="text-xs font-bold text-[#0A0A0A] truncate max-w-[80%] text-center">
              {service.name}
            </span>
          </div>
        )}

        {/* Category Sticker (Top-Left) */}
        <div className="absolute top-3 left-3 bg-[#FFD23F] text-[#0A0A0A] text-[11px] font-black px-2.5 py-0.5 rounded border-2 border-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A]">
          {service.category}
        </div>

        {/* Sponsored / Ad Badge */}
        {showAds && service.is_sponsored && (
          <div className="absolute top-3 right-12 bg-[#0A0A0A] text-[#FFD23F] text-[10px] font-black px-2 py-0.5 rounded border border-black uppercase tracking-wider">
            스폰서
          </div>
        )}

        {/* Curation Badge */}
        {service.curation && !(showAds && service.is_sponsored) && (
          <div className="absolute top-3 right-12 bg-[#06D6A0] text-[#0A0A0A] text-[10px] font-black px-2 py-0.5 rounded border border-black">
            {service.curation.badge_text}
          </div>
        )}

        {/* Bookmark Quick Action */}
        <button
          onClick={handleFavorite}
          title={favState ? '찜 해제' : '찜하기'}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border-2 border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#FFD23F] shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Bookmark className={`w-3.5 h-3.5 ${favState ? 'fill-[#0A0A0A]' : ''}`} />
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Card Top Title */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg text-[#0A0A0A] group-hover:text-[#1F5FD1] transition-colors line-clamp-1">
              {service.name}
            </h3>
          </div>

          {/* Short description */}
          <p className="text-xs sm:text-sm text-[#52525B] font-medium line-clamp-2 leading-relaxed">
            {service.short_desc}
          </p>

          {/* Tags Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {service.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-bold text-[#0A0A0A] bg-[#F1F0E8] px-2 py-0.5 rounded border border-[#0A0A0A]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Card Footer: Metrics & Actions */}
        <div className="pt-3 border-t-2 border-[#0A0A0A] flex items-center justify-between gap-2 text-xs font-bold text-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded border border-[#0A0A0A] transition-all ${
                hasLiked
                  ? 'bg-[#FF6B9E] text-[#0A0A0A]'
                  : 'bg-white hover:bg-[#F1F0E8]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-[#0A0A0A]' : ''}`} />
              <span className="font-mono tabular-nums">{likesCount}</span>
            </button>

            <span className="inline-flex items-center gap-1 text-[#52525B] text-[11px] font-mono">
              <MessageSquare className="w-3.5 h-3.5 text-[#0A0A0A]" />
              <span>후기</span>
            </span>
          </div>

          {/* External visit link */}
          <button
            onClick={handleExternalClick}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFD23F] hover:bg-[#FFD23F]/80 text-[#0A0A0A] border-2 border-[#0A0A0A] rounded shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all text-xs font-bold"
          >
            <span>방문</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  );
};
