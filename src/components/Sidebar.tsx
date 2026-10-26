import React from 'react';
import { Search, MessageSquare, Tag, PlusCircle, Settings } from 'lucide-react';
import { Service } from '../types';
import { PolicyTabType } from './PolicyModal';

interface SidebarProps {
  activeTab: 'discover' | 'community' | 'tags' | 'favorites';
  onSelectTab: (tab: 'discover' | 'community' | 'tags' | 'favorites') => void;
  onOpenSubmit: () => void;
  onOpenManagement: () => void;
  favorites: Service[];
  onSelectService: (service: Service) => void;
  onOpenExternalNotice: (service: Service) => void;
  slogan: string;
  onOpenAboutModal: () => void;
  onOpenPolicy: (tab: PolicyTabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSubmit,
  onOpenManagement,
  favorites,
  onSelectService,
  onOpenExternalNotice,
  slogan,
  onOpenAboutModal,
  onOpenPolicy,
}) => {
  const navItems: Array<{ id: 'discover' | 'community' | 'tags' | 'favorites'; icon: React.ReactNode; label: string }> = [
    {
      id: 'discover',
      icon: <Search className="w-4 h-4 stroke-[2.5] text-[#0A0A0A]" />,
      label: '사이트 찾기',
    },
    {
      id: 'community',
      icon: <MessageSquare className="w-4 h-4 stroke-[2.5] text-[#0A0A0A]" />,
      label: '커뮤니티',
    },
    {
      id: 'tags',
      icon: <Tag className="w-4 h-4 stroke-[2.5] text-[#0A0A0A]" />,
      label: '인기 태그',
    },
    {
      id: 'favorites',
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-[#0A0A0A] stroke-[#0A0A0A] stroke-[1.5]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ),
      label: '찜한 사이트',
    },
  ];

  return (
    <aside className="w-64 lg:w-72 shrink-0 bg-[#FAFAF5] border-r-2 border-[#0A0A0A] min-h-screen p-5 flex flex-col justify-between hidden md:flex sticky top-0 h-screen overflow-y-auto">
      <div className="space-y-5">
        {/* Brand Area */}
        <div>
          <div
            onClick={() => onSelectTab('discover')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            aria-label="바이브덤프"
          >
            {/* V logo matching typography height */}
            <span className="w-10 h-10 bg-[#FFD23F] text-[#0A0A0A] font-display text-xl font-black border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              V
            </span>
            <div className="flex flex-col justify-between h-10 py-0.5">
              <h1 className="font-bold text-[17px] tracking-tight text-[#0A0A0A] block leading-none">
                바이브덤프
              </h1>
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#52525B] block leading-none">
                VIBE CODE, DUMP HERE.
              </span>
            </div>
          </div>

          {/* Slogan separated clearly */}
          <div className="mt-4 pt-2.5 pl-0.5 border-t border-[#0A0A0A]/20">
            <p className="text-xs text-[#52525B] font-bold tracking-tight">
              {slogan || '인터넷은 아직 재밌다'}
            </p>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1.5 pt-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border-2 border-[#0A0A0A] text-sm font-bold transition-all text-left ${
                    isActive
                      ? 'bg-[#FFD23F] text-[#0A0A0A] shadow-[3px_3px_0_#0A0A0A] translate-x-0.5'
                      : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8] shadow-[2px_2px_0_#0A0A0A] hover:-translate-y-0.5'
                  }`}
                >
                  <span className="w-5 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === 'favorites' && favorites.length > 0 && (
                    <span className="ml-auto text-xs font-mono bg-[#0A0A0A] text-[#FFD23F] px-1.5 py-0.5 rounded-full font-black">
                      {favorites.length}
                    </span>
                  )}
                </button>

                {/* When favorited, list appears under '찜한 사이트' */}
                {item.id === 'favorites' && favorites.length > 0 && (
                  <div className="p-3 bg-white border-2 border-[#0A0A0A] rounded-xl shadow-[3px_3px_0_#0A0A0A] space-y-2 mt-1 mb-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#0A0A0A]">
                      <span>찜한 사이트</span>
                      <span className="font-mono text-[11px] text-[#52525B]">{favorites.length}개</span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {favorites.slice(0, 5).map((fav) => (
                        <div
                          key={fav.id}
                          className="w-full flex items-center justify-between group py-0.5 gap-1"
                        >
                          <button
                            onClick={() => onSelectService(fav)}
                            className="text-left text-xs text-[#0A0A0A] hover:text-[#1F5FD1] hover:underline font-medium truncate flex-1"
                          >
                            {fav.name}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenExternalNotice(fav);
                            }}
                            title="외부 사이트 이동 안내 열기"
                            className="px-1.5 py-0.5 bg-[#FFD23F] hover:bg-[#FFD23F]/80 text-[#0A0A0A] border border-[#0A0A0A] rounded text-[10px] font-bold shadow-[1px_1px_0_#0A0A0A] active:translate-x-0.5 shrink-0"
                          >
                            ↗
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#52525B] leading-tight pt-1.5 border-t border-neutral-200">
                      💡 보관 안내: 브라우저 로컬 저장소를 활용하므로 쿠키 및 사이트 데이터 삭제 시 찜한 사이트 목록이 리셋됩니다.
                    </p>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Bottom Nav & Footer */}
      <div className="space-y-4 pt-5 border-t-2 border-[#0A0A0A]">
        {/* Action Buttons - Unified icon sizes and Lucide stroke style matching nav items (Item 7) */}
        <div className="space-y-2">
          <button
            onClick={onOpenSubmit}
            className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2.5 rounded-lg border-2 border-[#0A0A0A] bg-[#FF6B9E] text-[#0A0A0A] font-bold text-sm shadow-[3px_3px_0_#0A0A0A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <span className="w-5 flex items-center justify-center">
              <PlusCircle className="w-4 h-4 stroke-[2.5] text-[#0A0A0A]" />
            </span>
            <span>사이트 등록</span>
          </button>
          <button
            onClick={onOpenManagement}
            className="w-full flex items-center justify-center gap-2.5 px-3.5 py-2 rounded-lg border-2 border-[#0A0A0A] bg-white text-[#0A0A0A] font-bold text-xs shadow-[2px_2px_0_#0A0A0A] hover:bg-[#F1F0E8] transition-all"
          >
            <span className="w-5 flex items-center justify-center">
              <Settings className="w-4 h-4 stroke-[2.5] text-[#0A0A0A]" />
            </span>
            <span>사이트 관리</span>
          </button>
        </div>

        {/* Note & Policy Footer (Items 15 & 16) */}
        <div className="space-y-2 text-[11px] text-[#52525B]">
          <div>
            <b className="text-[#0A0A0A] block">바이브코딩 사이트 큐레이팅 서비스</b>
            <span>Copyright 2026. vibedump. all rights reserved.</span>
          </div>

          {/* Links Row 1: About & Contact */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-[#52525B]">
            <button
              onClick={onOpenAboutModal}
              className="hover:text-[#0A0A0A] hover:underline font-medium"
            >
              소개 (About)
            </button>
            <span>·</span>
            <a
              href="mailto:info.vibedump@gmail.com"
              className="hover:text-[#0A0A0A] hover:underline font-mono"
            >
              연락처 (info.vibedump@gmail.com)
            </a>
          </div>

          {/* Links Row 2: Policies (Item 16) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] text-[#52525B] border-t border-neutral-200">
            <button
              onClick={() => onOpenPolicy('terms')}
              className="hover:text-[#0A0A0A] hover:underline font-semibold"
            >
              이용약관
            </button>
            <span>·</span>
            <button
              onClick={() => onOpenPolicy('privacy')}
              className="hover:text-[#0A0A0A] hover:underline font-semibold"
            >
              개인정보처리방침
            </button>
            <span>·</span>
            <button
              onClick={() => onOpenPolicy('takedown')}
              className="hover:text-[#0A0A0A] hover:underline font-semibold"
            >
              권리침해 신고
            </button>
            <span>·</span>
            <button
              onClick={() => onOpenPolicy('contact')}
              className="hover:text-[#0A0A0A] hover:underline font-semibold"
            >
              문의
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
