import React from 'react';
import { X } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center">
      <div className="relative w-full max-w-lg bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#0A0A0A] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 bg-[#FFD23F] text-[#0A0A0A] font-display text-base font-black border-2 border-[#0A0A0A] rounded flex items-center justify-center">
              V
            </span>
            <h3 className="font-display text-xl text-[#0A0A0A]">바이브덤프 소개 (About)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-white border border-[#0A0A0A] rounded hover:bg-[#F1F0E8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-[#0A0A0A] leading-relaxed font-medium">
          <p>
            <strong>바이브덤프</strong>는 AI 코딩 도구와 바이브 코딩을 통해 제작된 다양한 웹사이트, 웹앱, 실험적인 프로젝트를 한곳에 모아 보여주는 발견형 아카이브입니다.
          </p>
          <div className="p-3 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-lg space-y-1">
            <b className="text-sm block">핵심 원칙</b>
            <p>1. 정형화된 소프트웨어 마켓플레이스보다, 인터넷에서 우연히 흥미로운 것을 발견하는 경험을 지향합니다.</p>
            <p>2. 실용적인 AI 생산성 툴부터 1인 개발 클릭커 게임, 밈 캔버스, 개인 창작물까지 폭넓게 수용합니다.</p>
            <p>3. 상업적 유료 노출은 일반 콘텐츠와 명확히 구분되는 '스폰서' 표기를 제공합니다.</p>
          </div>
          <p className="text-[#52525B]">
            나만의 바이브 코딩 프로젝트가 있다면 언제든 자유롭게 등록하고 다른 사람들의 반응을 확인해보세요.
          </p>
          <div className="pt-2 border-t border-neutral-200 text-xs">
            <span className="font-bold text-[#0A0A0A]">문의 및 제안: </span>
            <a href="mailto:info.vibedump@gmail.com" className="text-[#1F5FD1] hover:underline font-mono">
              info.vibedump@gmail.com
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg font-bold text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
