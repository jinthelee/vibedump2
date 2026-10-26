import React, { useState } from 'react';
import { X, Check, AlertCircle, ShieldAlert, Flag } from 'lucide-react';
import { submitReport } from '../lib/api';

interface ReportModalProps {
  targetType: 'service' | 'review';
  targetId: number;
  onClose: () => void;
  initialMode?: 'takedown' | 'general';
}

export const ReportModal: React.FC<ReportModalProps> = ({
  targetType,
  targetId,
  onClose,
  initialMode = 'takedown'
}) => {
  const [mode, setMode] = useState<'takedown' | 'general'>(targetType === 'service' ? initialMode : 'general');
  const [reason, setReason] = useState(
    mode === 'takedown' ? '본인이 제작한 사이트이며 노출 중단(삭제) 희망' : '악성 코드 또는 피싱 의심'
  );
  const [requesterEmail, setRequesterEmail] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const takedownReasons = [
    '본인이 제작한 사이트이며 노출 중단(삭제) 희망',
    '사전 허락 없는 큐레이팅으로 인한 게재 철회 요청',
    '도용 및 저작권/상표권 침해',
    '서비스 운영 중단 및 도메인 만료로 인한 삭제 요청',
    '기타 권리 침해'
  ];

  const generalReportReasons = [
    '악성 코드 또는 피싱 의심',
    '접속 불가 / 깨진 링크',
    '불법/음란물 또는 부적절한 콘텐츠',
    '스팸 및 과도한 광고 도배',
    '기타 운영 정책 위반'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (mode === 'takedown' && !requesterEmail.trim()) {
      setIsSubmitting(false);
      return setErrorMessage('권리자 본인 확인을 위한 이메일 주소를 입력해주세요.');
    }

    try {
      const fullReason = mode === 'takedown' ? `[권리침해/게재철회] ${reason}` : reason;
      const fullDetails = mode === 'takedown'
        ? `[신청자 이메일: ${requesterEmail.trim()}]\n${details.trim() || '즉시 게재 철회 요청'}`
        : (details.trim() || undefined);

      await submitReport({
        target_type: targetType,
        target_id: targetId,
        reason: fullReason,
        details: fullDetails,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || '신고 및 철회 접수에 실패했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center">
      <div className="relative w-full max-w-lg bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#0A0A0A] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-[#0A0A0A]">
              {mode === 'takedown' ? '🛡️ 권리 침해 신고 및 게재 철회 요청' : '🚨 일반 보안 및 콘텐츠 신고'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 bg-white border border-[#0A0A0A] rounded hover:bg-[#F1F0E8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher (if target is service) */}
        {targetType === 'service' && !isSuccess && (
          <div className="flex items-center gap-1.5 p-1 bg-white border-2 border-[#0A0A0A] rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('takedown');
                setReason(takedownReasons[0]);
              }}
              className={`flex-1 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'takedown' ? 'bg-[#FF6B9E] text-[#0A0A0A]' : 'text-[#52525B]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>권리자 게재 철회 요청</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('general');
                setReason(generalReportReasons[0]);
              }}
              className={`flex-1 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'general' ? 'bg-[#FFD23F] text-[#0A0A0A]' : 'text-[#52525B]'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>일반 문제 신고</span>
            </button>
          </div>
        )}

        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 bg-[#06D6A0] border-2 border-[#0A0A0A] rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#0A0A0A]">
              <Check className="w-7 h-7 stroke-[3] text-[#0A0A0A]" />
            </div>
            <h4 className="font-display text-lg text-[#0A0A0A]">
              {mode === 'takedown' ? '게재 철회 요청이 접수되었습니다.' : '신고가 정상 접수되었습니다.'}
            </h4>
            <p className="text-xs text-[#52525B] max-w-sm mx-auto leading-relaxed">
              {mode === 'takedown'
                ? '바이브덤프는 권리자의 권리를 최우선으로 존중합니다. 본 양식으로 요청하시면 확인 즉시 비공개 처리 후, 1주 후 데이터 영구 삭제 처리됩니다.'
                : '접수해주신 내용은 운영팀에서 신속히 검토하여 정책에 따라 조치하겠습니다.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            {mode === 'takedown' && (
              <div className="p-3 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-lg text-xs leading-relaxed space-y-1">
                <b className="text-[#0A0A0A] block">💡 권리자 권리 보호 원칙</b>
                <p className="text-[#52525B]">
                  바이브덤프는 인터넷의 흥미로운 바이브 코딩 사이트들을 소개하는 큐레이팅 플랫폼입니다. 
                  사전 협의 없이 등록되었거나 노출을 원치 않으실 경우, 본 양식으로 요청하시면 확인 즉시 <strong>비공개 처리 후, 1주 후 데이터 영구 삭제 처리</strong>됩니다.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-[#C81E4B] rounded-lg flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {mode === 'takedown' && (
              <div className="space-y-1">
                <label className="font-bold text-[#0A0A0A]">
                  신청자 확인용 이메일 <span className="text-[#C81E4B]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="권리자 확인 및 처리 결과 회신용 이메일"
                  className="w-full px-3 py-2 bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-[#0A0A0A]">
                {mode === 'takedown' ? '게재 철회 사유' : '신고 사유'} <span className="text-[#C81E4B]">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none text-xs"
              >
                {(mode === 'takedown' ? takedownReasons : generalReportReasons).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#0A0A0A]">상세 요청 내용 (선택)</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={
                  mode === 'takedown'
                    ? '권리자 본인 확인 정보나 추가로 남기실 말씀을 적어주세요.'
                    : '구체적인 내용을 적어주시면 빠른 확인에 도움이 됩니다.'
                }
                className="w-full px-3 py-2 bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 font-bold text-[#52525B] hover:text-[#0A0A0A]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 font-bold text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all ${
                  mode === 'takedown' ? 'bg-[#FF6B9E] hover:bg-[#FF6B9E]/90' : 'bg-[#FFD23F] hover:bg-[#FFD23F]/90'
                }`}
              >
                {isSubmitting ? '접수 중...' : mode === 'takedown' ? '게재 철회 요청하기' : '신고 접수하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
