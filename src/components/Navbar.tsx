import React from 'react';
import { Sparkles, Bookmark, UserCheck, Shield, Plus, Compass } from 'lucide-react';

interface NavbarProps {
  onOpenSubmit: () => void;
  onOpenMakerStudio: () => void;
  onOpenAdmin: () => void;
  onOpenFavorites: () => void;
  onSelectNav: (tab: 'all' | 'curated' | 'tags' | 'favorites') => void;
  activeNav: string;
  favoritesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSubmit,
  onOpenMakerStudio,
  onOpenAdmin,
  onOpenFavorites,
  onSelectNav,
  activeNav,
  favoritesCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single line, no subtitle clutter) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectNav('all')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
              VibeDump
            </span>
          </button>
        </div>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectNav('all')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              activeNav === 'all' ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600' : ''
            }`}
          >
            발견 및 탐색
          </button>
          <button
            onClick={() => onSelectNav('curated')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              activeNav === 'curated' ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600' : ''
            }`}
          >
            이번 주의 발견
          </button>
          <button
            onClick={() => onSelectNav('tags')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1 ${
              activeNav === 'tags' ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600' : ''
            }`}
          >
            인기 태그
          </button>
          <button
            onClick={onOpenFavorites}
            className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1"
          >
            <Bookmark className="w-4 h-4 text-slate-400" />
            <span>찜 목록</span>
            {favoritesCount > 0 && (
              <span className="text-xs font-semibold text-indigo-600 tabular-nums">
                ({favoritesCount})
              </span>
            )}
          </button>
          <button
            onClick={onOpenMakerStudio}
            className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:text-slate-900 py-1"
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>제작자 스튜디오</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action button + Admin shortcut */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenAdmin}
            title="관리자 모드"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>서비스 등록</span>
          </button>
        </div>
      </div>
    </header>
  );
};
