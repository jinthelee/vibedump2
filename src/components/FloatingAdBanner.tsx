import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

export const FloatingAdBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <aside
      aria-label="스폰서 광고"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF3C4] border-t-2 border-[#0A0A0A] py-1.5 px-4 shadow-[0_-2px_0_#0A0A0A] flex items-center justify-between gap-3 text-xs"
    >
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="bg-[#0A0A0A] text-[#FFD23F] text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">
            AD
          </span>
          <span className="font-bold text-[#0A0A0A] truncate">
            자체 광고 타임: 이한울 심바 번쩍 쭈~압~
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="mailto:info.vibedump@gmail.com?subject=[광고문의]%20바이브덤프%20스폰서%20신청"
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#0A0A0A] hover:underline bg-[#FFD23F] border border-[#0A0A0A] px-2 py-0.5 rounded"
          >
            <span>광고 문의</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => setIsVisible(false)}
            title="광고 닫기"
            className="p-1 hover:bg-[#F1F0E8] rounded border border-transparent hover:border-[#0A0A0A] text-[#0A0A0A] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
