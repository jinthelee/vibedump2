import React, { useEffect, useState } from 'react';
import { X, Bookmark, Heart, ExternalLink, ArrowRight } from 'lucide-react';
import { fetchFavorites } from '../lib/api';
import { Service } from '../types';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: Service) => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen,
  onClose,
  onSelectService
}) => {
  const [favorites, setFavorites] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchFavorites()
        .then((res) => setFavorites(res.favorites))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-indigo-600 fill-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">내 찜 목록</h3>
            <span className="text-xs font-mono font-bold text-indigo-600 tabular-nums">
              ({favorites.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">찜 목록을 불러오는 중...</div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-16 space-y-2 text-slate-500">
              <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">아직 찜한 서비스가 없습니다.</p>
              <p className="text-xs text-slate-400">
                탐색 피드에서 마음에 드는 프로젝트의 찜 아이콘을 클릭해보세요.
              </p>
            </div>
          ) : (
            favorites.map((fav) => (
              <div
                key={fav.id}
                onClick={() => {
                  onSelectService(fav);
                  onClose();
                }}
                className="p-3.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1 overflow-hidden pr-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold">
                    <span>{fav.category}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {fav.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">{fav.short_desc}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-rose-500 font-mono">
                    <Heart className="w-3 h-3 fill-rose-500" />
                    <span>{fav.likes_count}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
