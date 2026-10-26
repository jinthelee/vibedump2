import React from 'react';
import { X, ExternalLink, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { Service } from '../types';

interface ExternalNoticeModalProps {
  service: Service | null;
  onClose: () => void;
}

export const ExternalNoticeModal: React.FC<ExternalNoticeModalProps> = ({ service, onClose }) => {
  if (!service) return null;

  const handleProceed = () => {
    window.open(service.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center">
      <div className="relative w-full max-w-md bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#0A0A0A]">
            <span className="font-display text-lg">외부 사이트 이동 안내</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-white border border-[#0A0A0A] rounded hover:bg-[#F1F0E8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs text-[#0A0A0A] font-medium leading-relaxed">
          <p>
            바이브덤프를 벗어나 외부 사이트로 이동합니다:
          </p>
          <div className="p-3 bg-white border-2 border-[#0A0A0A] rounded-lg font-mono text-xs font-bold text-[#1F5FD1] break-all">
            {service.url}
          </div>
          <div className="p-3 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-lg text-[11px] leading-normal">
            <strong>주의:</strong> 해당 사이트는 독립적인 제작자가 바이브 코딩으로 제작한 프로젝트입니다.
            바이브덤프는 외부 서비스의 안전성을 직접 보증하지 않으므로 개인정보 입력 시 유의하세요.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#52525B] hover:text-[#0A0A0A]"
          >
            취소
          </button>
          <button
            onClick={handleProceed}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#0A0A0A] bg-[#FFD23F] hover:bg-[#FFD23F]/80 border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5"
          >
            <span>사이트 열기</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
