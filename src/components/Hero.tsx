import React from 'react';
import { X, Dices } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalServicesCount: number;
  onRandomDiscover?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  onSearchChange,
  totalServicesCount,
  onRandomDiscover,
}) => {
  return (
    <section className="space-y-6 pb-2">
      {/* Top Banner Row: Headline & Hero Sticker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-block text-[11px] font-black tracking-widest text-[#0A0A0A] bg-[#FFD23F] px-2.5 py-0.5 border-2 border-[#0A0A0A] rounded shadow-[2px_2px_0_#0A0A0A]">
            DUMP DIGGING
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display text-[#0A0A0A] leading-tight">
            새로운 인터넷,<br />
            <mark className="bg-[#FFD23F] text-[#0A0A0A] px-2.5 py-0.5 border-2 border-[#0A0A0A] rounded inline-block mt-1 shadow-[3px_3px_0_#0A0A0A]">
              여기서 찍먹!
            </mark>
          </h1>
          <p className="text-sm sm:text-base text-[#52525B] font-medium pt-1 max-w-xl">
            바이브코딩으로 태어난 새로운 서비스를 발견하고, 직접 써보고, 반응해 보세요.
          </p>
        </div>

        {/* Hero Sticker Box & Random Dice Button (Item 6: Left of 등록된 사이트 in space-y-6 pb-2 section) */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {onRandomDiscover && (
            <button
              type="button"
              onClick={onRandomDiscover}
              title="두려워말고 전진 (랜덤 추천)"
              className="p-3 bg-[#06D6A0] hover:bg-[#06D6A0]/85 text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-xl shadow-[3px_3px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0 flex items-center justify-center group"
            >
              <Dices className="w-5 h-5 stroke-[2.5] group-hover:rotate-12 transition-transform" />
            </button>
          )}

          <div className="bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-xl p-4 sm:p-5 shadow-[4px_4px_0_#0A0A0A] text-center shrink-0 min-w-[130px] -rotate-1 hover:rotate-0 transition-transform">
            <span className="text-xs font-bold text-[#0A0A0A] block leading-tight">등록된</span>
            <b className="font-display text-2xl sm:text-3xl text-[#0A0A0A] block mt-1 tracking-tight">
              사이트 {String(totalServicesCount).padStart(2, '0')}
            </b>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative max-w-2xl">
        <div className="relative flex items-center">
          <span className="absolute left-4 text-base font-mono text-[#52525B] pointer-events-none">
            ⌕
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="어떤 바이브의 사이트를 찾으시나요? (예: 게임, 신스, 메모...)"
            className="w-full pl-11 pr-10 py-3 bg-white border-2 border-[#0A0A0A] rounded-xl text-[#0A0A0A] placeholder-[#52525B] text-sm font-medium focus:outline-none shadow-[3px_3px_0_#0A0A0A] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 p-1 text-[#52525B] hover:text-[#0A0A0A] hover:bg-[#F1F0E8] rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
