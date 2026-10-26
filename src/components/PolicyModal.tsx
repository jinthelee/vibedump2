import React, { useState } from 'react';
import { X, FileText, Shield, AlertTriangle, Mail } from 'lucide-react';

export type PolicyTabType = 'terms' | 'privacy' | 'takedown' | 'contact';

interface PolicyModalProps {
  initialTab?: PolicyTabType;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTabType>(initialTab);

  const tabs = [
    { key: 'terms' as PolicyTabType, label: '이용약관', icon: FileText },
    { key: 'privacy' as PolicyTabType, label: '개인정보처리방침', icon: Shield },
    { key: 'takedown' as PolicyTabType, label: '권리침해 신고', icon: AlertTriangle },
    { key: 'contact' as PolicyTabType, label: '문의', icon: Mail },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-2xl sm:w-[672px] bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] overflow-hidden my-6 max-h-[90vh] flex flex-col shrink-0">
        {/* Header */}
        <div className="px-5 py-3 border-b-2 border-[#0A0A0A] flex items-center justify-between gap-4 bg-[#FFD23F]">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-[#0A0A0A]">바이브덤프 운영 정책 &amp; 법적 고지</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white border border-[#0A0A0A] rounded hover:bg-[#F1F0E8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b-2 border-[#0A0A0A] bg-white overflow-x-auto text-xs font-bold">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#0A0A0A] whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#0A0A0A] text-[#FFD23F] shadow-[2px_2px_0_#0A0A0A]'
                    : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-xs leading-relaxed text-[#0A0A0A] space-y-4">
          {/* 1) 이용약관 */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg text-[#0A0A0A]">바이브덤프 이용약관</h3>
                <p className="text-[11px] text-[#52525B] font-mono mt-0.5">
                  시행일: 2026-10-21 · 운영자: 바이브덤프 · 문의: info.vibedump@gmail.com
                </p>
              </div>

              <div className="space-y-3 font-medium">
                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제1조 (목적)</h4>
                  <p className="text-[#52525B]">
                    이 약관은 바이브덤프(VibeDump, 이하 '바이브덤프')의 이용과 관련하여 운영자와 이용자의 권리·의무 및 책임 사항을 정하는 것을 목적으로 합니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제2조 (서비스 내용)</h4>
                  <p className="text-[#52525B]">
                    바이브덤프는 바이브 코딩 및 AI 코딩 도구 등을 활용해 제작된 웹사이트, 웹앱, 게임 및 창작 프로젝트를 소개하고 탐색할 수 있는 플랫폼입니다. 프로젝트 등록, 검색, 좋아요, 즐겨찾기, 후기 등의 기능을 제공할 수 있습니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제3조 (등록 콘텐츠의 책임)</h4>
                  <ol className="list-decimal pl-4 space-y-1 text-[#52525B]">
                    <li>프로젝트 등록자는 자신이 제출한 정보의 정확성과 적법성을 확인해야 합니다.</li>
                    <li>등록자는 타인의 저작권, 상표권 및 기타 권리를 침해하는 콘텐츠를 등록해서는 안 됩니다.</li>
                    <li>허위 정보, 사기, 피싱, 악성코드 등 이용자에게 피해를 줄 수 있는 콘텐츠의 등록을 금지합니다.</li>
                    <li>등록 콘텐츠와 관련한 분쟁은 각 당사자의 귀책사유와 관련 법령에 따라 책임을 부담합니다.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제4조 (콘텐츠의 관리)</h4>
                  <ol className="list-decimal pl-4 space-y-1 text-[#52525B]">
                    <li>등록자는 등록 콘텐츠에 대한 권리를 보유합니다.</li>
                    <li>등록자는 운영자가 프로젝트를 소개하고 서비스를 운영하는 데 필요한 범위에서 등록 콘텐츠를 저장하고 표시하는 것을 허락합니다.</li>
                    <li>운영자는 법령 위반, 권리 침해, 허위 정보 또는 이용자 피해 우려가 있는 콘텐츠를 제한하거나 삭제할 수 있습니다.</li>
                    <li>등록자 및 권리자는 운영자에게 콘텐츠의 수정 또는 삭제를 요청할 수 있습니다.</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제5조 (외부 링크)</h4>
                  <p className="text-[#52525B]">
                    서비스에 등록된 웹사이트와 웹앱은 각 운영자가 제공하는 외부 서비스입니다. 운영자는 외부 서비스의 정확성, 안전성, 기능 및 지속적인 운영을 보증하지 않습니다. 다만, 관련 법령에 따라 운영자에게 책임이 인정되는 경우는 제외합니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제6조 (이용 제한)</h4>
                  <p className="text-[#52525B]">
                    이용자는 서비스의 정상적인 운영을 방해하거나 불법 콘텐츠를 등록하는 등 관련 법령 및 본 약관에 위반되는 행위를 해서는 안 됩니다. 운영자는 위반 사항이 확인되면 관련 콘텐츠를 제한하거나 삭제할 수 있습니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제7조 (서비스 변경 및 책임)</h4>
                  <p className="text-[#52525B]">
                    운영자는 서비스 개선, 점검 및 기술적 문제 등의 사유로 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다. 운영자의 책임은 관련 법령에 따르며, 본 약관은 법령상 이용자의 권리를 제한하지 않습니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">제8조 (약관의 변경 및 준거법)</h4>
                  <p className="text-[#52525B]">
                    운영자는 관련 법령에 따라 약관을 변경하고 변경 사항을 서비스에 게시할 수 있습니다. 서비스 이용과 관련된 사항은 대한민국 법령에 따릅니다.
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-200 text-[#52525B]">
                  <strong>부칙:</strong> 본 약관은 2026년 10월 21일부터 시행합니다.
                </div>
              </div>
            </div>
          )}

          {/* 2) 개인정보처리방침 */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg text-[#0A0A0A]">바이브덤프 개인정보처리방침</h3>
                <p className="text-[11px] text-[#52525B] font-mono mt-0.5">
                  시행일: 2026년 10월 21일
                </p>
              </div>

              <div className="space-y-3 font-medium text-[#52525B]">
                <p>
                  바이브덤프(VibeDump)는 이용자의 개인정보를 보호하고 관련 법령을 준수합니다.
                </p>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">1. 개인정보의 수집 및 이용 목적</h4>
                  <p>운영자는 다음 목적을 위해 필요한 정보를 처리합니다.</p>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1">
                    <li>프로젝트 등록 및 수정·관리</li>
                    <li>권리침해 신고 및 문의 처리</li>
                    <li>서비스 운영 및 오류 대응</li>
                    <li>부정 이용 방지</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">2. 처리하는 개인정보 항목</h4>
                  <p>서비스 이용 과정에서 다음 정보가 처리될 수 있습니다.</p>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1">
                    <li><strong>프로젝트 등록 정보:</strong> 프로젝트명, 설명, 웹사이트 주소, 카테고리 및 태그 등</li>
                    <li><strong>신고 및 문의 정보:</strong> 이메일 주소, 신고 내용, 관련 URL 및 첨부 자료 등</li>
                    <li><strong>서비스 이용 정보:</strong> 접속 기록, 오류 기록, 쿠키 또는 브라우저 저장소 정보 등 실제 수집되는 정보</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">3. 개인정보의 보유 및 이용 기간</h4>
                  <p>
                    개인정보는 처리 목적이 달성되면 지체 없이 파기합니다. 다만, 관련 법령에 따라 보관해야 하는 정보는 해당 법령에서 정한 기간 동안 보관합니다. 구체적인 보유 기간은 실제 운영 방식에 따라 정하며, 이용자가 확인할 수 있도록 필요한 사항을 공개합니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">4. 개인정보의 제3자 제공 및 처리 위탁</h4>
                  <p>
                    운영자는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다. 외부 업체에 개인정보 처리 업무를 위탁하거나 개인정보를 국외로 이전하는 경우에는 실제 이용 현황과 관련 법령에 따라 필요한 사항을 공개합니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">5. 개인정보의 파기 및 보호</h4>
                  <p>
                    운영자는 보유 기간이 경과하거나 처리 목적이 달성된 개인정보를 지체 없이 파기하며, 개인정보의 안전한 관리를 위해 필요한 보호 조치를 시행합니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">6. 이용자의 권리</h4>
                  <p>
                    이용자는 자신의 개인정보에 대한 열람, 정정, 삭제 또는 처리정지를 요청할 수 있습니다. 관련 요청은 아래 문의처로 접수할 수 있습니다.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">7. 개인정보 관련 문의</h4>
                  <p className="mt-1">
                    운영자: 바이브덤프<br />
                    이메일: <a href="mailto:info.vibedump@gmail.com" className="text-[#1F5FD1] hover:underline font-mono">info.vibedump@gmail.com</a>
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-[#0A0A0A]">8. 방침의 변경</h4>
                  <p>개인정보처리방침이 변경되는 경우 서비스 내에 변경 사항과 시행일을 게시합니다.</p>
                </div>
              </div>
            </div>
          )}

          {/* 3) 권리침해 신고 */}
          {activeTab === 'takedown' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg text-[#0A0A0A]">권리침해 신고</h3>
                <p className="text-[11px] text-[#52525B] mt-0.5">
                  바이브덤프에 등록된 프로젝트가 저작권, 상표권 또는 기타 권리를 침해한다고 판단되는 경우 운영자에게 신고할 수 있습니다.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl space-y-2">
                <b className="text-xs text-[#0A0A0A] block">신고 시 필요한 정보</b>
                <ul className="list-disc pl-4 space-y-1 text-xs text-[#52525B] font-medium">
                  <li>신고 대상 프로젝트 URL</li>
                  <li>침해가 의심되는 내용과 사유</li>
                  <li>신고자의 이메일 주소</li>
                  <li>필요한 경우 권리 보유 또는 대리 권한을 확인할 수 있는 자료</li>
                </ul>
              </div>

              <div className="space-y-2 text-[#52525B] font-medium">
                <p>
                  운영자는 신고 내용을 검토하고 필요한 경우 추가 자료를 요청하거나 해당 콘텐츠의 수정·삭제 또는 노출 제한을 검토합니다.
                </p>
                <p>
                  본 양식으로 요청하시면 확인 즉시 <strong>비공개 처리 후, 1주 후 데이터 영구 삭제 처리</strong>됩니다.
                </p>
                <p className="text-[11px]">
                  신고 내용은 신고 확인 및 처리에 필요한 범위에서 이용됩니다. 불필요한 개인정보나 민감정보는 제출하지 마세요.
                </p>
              </div>

              <div className="p-3.5 bg-white border-2 border-[#0A0A0A] rounded-xl space-y-1 shadow-[2px_2px_0_#0A0A0A]">
                <span className="font-bold text-xs text-[#0A0A0A] block">신고 접수</span>
                <a href="mailto:info.vibedump@gmail.com?subject=[권리침해신고]" className="text-xs font-mono font-bold text-[#1F5FD1] hover:underline">
                  info.vibedump@gmail.com
                </a>
              </div>
            </div>
          )}

          {/* 4) 문의 */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg text-[#0A0A0A]">문의</h3>
                <p className="text-[11px] text-[#52525B] mt-0.5">
                  바이브덤프 이용 중 문의 사항이나 문제가 있다면 이메일로 연락해 주세요.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-2">
                <ul className="list-disc pl-4 space-y-1 text-xs text-[#52525B] font-medium">
                  <li>프로젝트 등록·수정·삭제 문의</li>
                  <li>권리침해 신고 및 게재 철회 요청</li>
                  <li>웹사이트 링크 및 기능 오류 제보</li>
                  <li>개인정보 관련 문의</li>
                  <li>기타 서비스 이용 문의</li>
                </ul>
                <p className="text-[11px] text-[#52525B] pt-1">
                  * 문의 시 관련 프로젝트 URL과 문의 내용을 함께 보내주시면 확인에 도움이 됩니다.
                </p>
              </div>

              <div className="p-3.5 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl space-y-1">
                <span className="text-xs font-bold text-[#0A0A0A]">공식 이메일:</span>
                <p>
                  <a href="mailto:info.vibedump@gmail.com" className="font-mono text-xs font-bold text-[#1F5FD1] hover:underline">
                    info.vibedump@gmail.com
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t-2 border-[#0A0A0A] bg-[#FAFAF5] flex items-center justify-between">
          <span className="text-[11px] text-[#52525B]">
            Copyright 2026. vibedump. all rights reserved.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#FFD23F] hover:bg-[#FFD23F]/80 border-2 border-[#0A0A0A] rounded-lg font-bold text-xs shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
