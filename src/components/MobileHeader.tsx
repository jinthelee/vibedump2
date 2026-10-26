import React from 'react';
import { Menu, X, Dices, PlusCircle, Settings } from 'lucide-react';

interface MobileHeaderProps {
  activeTab: 'discover' | 'community' | 'tags' | 'favorites';
  onSelectTab: (tab: 'discover' | 'community' | 'tags' | 'favorites') => void;
  onOpenSubmit: () => void;
  onOpenManagement: () => void;
  onRandomDiscover: () => void;
  favoritesCount: number;
  slogan: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSubmit,
  onOpenManagement,
  onRandomDiscover,
  favoritesCount,
  slogan,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="md:hidden sticky top-0 z-40 bg-[#FAFAF5] border-b-2 border-[#0A0A0A] px-4 py-3">
      <div className="flex items-center justify-between">
        <div
          onClick={() => {
            onSelectTab('discover');
            setMenuOpen(false);
          }}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span className="w-9 h-9 bg-[#FFD23F] text-[#0A0A0A] font-display text-lg font-black border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] flex items-center justify-center shrink-0">
            V
          </span>
          <div className="flex flex-col justify-between h-9 py-0.5">
            <h1 className="font-bold text-base tracking-tight text-[#0A0A0A] block leading-none">
              바이브덤프
            </h1>
            <span className="text-[9px] font-mono font-bold tracking-wider text-[#52525B] block leading-none">
              VIBE CODE, DUMP HERE.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onRandomDiscover}
            title="두려워말고 전진 (랜덤 추천)"
            className="p-1.5 bg-[#06D6A0] text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5"
          >
            <Dices className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={onOpenSubmit}
            className="px-2.5 py-1.5 bg-[#FF6B9E] text-[#0A0A0A] font-bold text-xs border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>등록</span>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 bg-white border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A]"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Slogan banner on mobile */}
      <div className="mt-2 pt-1 border-t border-neutral-200 text-[11px] text-[#52525B] font-bold truncate">
        {slogan || '인터넷은 아직 재밌다'}
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="pt-3 pb-2 space-y-1.5 border-t-2 border-[#0A0A0A] mt-2">
          {[
            { id: 'discover', icon: '⌕', label: '사이트 찾기' },
            { id: 'community', icon: '☰', label: '커뮤니티' },
            { id: 'tags', icon: '⌗', label: '인기 태그' },
            { id: 'favorites', icon: '♥', label: `찜한 사이트 (${favoritesCount})` },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id as any);
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 border-[#0A0A0A] text-xs font-bold text-left ${
                activeTab === item.id ? 'bg-[#FFD23F]' : 'bg-white'
              }`}
            >
              <span className="font-mono text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => {
              onOpenManagement();
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 border-[#0A0A0A] text-xs font-bold text-left bg-[#F1F0E8]"
          >
            <Settings className="w-4 h-4 stroke-[2.5]" />
            <span>사이트 관리</span>
          </button>
        </div>
      )}
    </header>
  );
};
