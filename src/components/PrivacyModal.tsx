import React from 'react';
import { X } from 'lucide-react';

interface PrivacyModalProps {
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center">
      <div className="relative w-full max-w-lg bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-[#0A0A0A] pb-3">
          <h3 className="font-display text-xl text-[#0A0A0A]">개인정보처리방침</h3>
          <button
            onClick={onClose}
            className="p-1 bg-white border border-[#0A0A0A] rounded hover:bg-[#F1F0E8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs text-[#52525B] leading-relaxed font-medium">
          <p>
            <strong>1. 최소 정보 수집</strong><br />
            바이브덤프는 서비스 등록 시 입력된 제작자 연락용 이메일을 운영자 비상 연락용으로만 보관하며, 공개 API 응답이나 일반 덤퍼 화면에 노출하지 않습니다.
          </p>
          <p>
            <strong>2. 익명 브라우저 식별</strong><br />
            좋아요 및 찜 기능은 로그인 없는 편리한 이용을 위해 로컬 브라우저 토큰을 활용합니다.
          </p>
          <p>
            <strong>3. 안전 및 책임 한계</strong><br />
            바이브덤프에 링크된 외부 웹사이트는 해당 제작자의 자체 방침을 따르며, 바이브덤프는 외부 서비스의 데이터 수집에 관여하지 않습니다.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg font-bold text-xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
