import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Copy, AlertCircle, Sparkles, Mail, ExternalLink, Plus, RotateCcw } from 'lucide-react';
import { createService } from '../lib/api';
import { VALID_CATEGORIES } from '../types';

interface SubmitServiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
  availableCategories?: string[];
}

const DRAFT_STORAGE_KEY = 'vibedump_service_submit_draft';

// Rich dictionary for auto-complete tag suggestions (prioritizing operator requested 14 tags)
const POPULAR_TAG_SUGGESTIONS = [
  '웹앱', '웹게임', '글쓰기', '기록', '대시보드', '디자인', '템플릿',
  '메모', '분석', '생산성', 'AI챗', '시각화', '자동화', '협업',
  'AI', '챗봇', '생성', '프로토타입', '게임', '사주타로', '운세',
  '밈', '짤방', '덕질', '소셜', '커뮤니티', '유틸리티'
];

export const SubmitServiceModal: React.FC<SubmitServiceModalProps> = ({ onClose, onSuccess, availableCategories }) => {
  const categoryList = (availableCategories && availableCategories.length > 0) ? availableCategories : VALID_CATEGORIES;

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');

  // Category selection or new proposal
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>(categoryList[0] || '생산성');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['웹앱', '생산성']);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [makerName, setMakerName] = useState('');
  const [makerEmail, setMakerEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ maker_code: string; service_id: number; is_custom?: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftSavedNotice, setDraftSavedNotice] = useState(false);

  // Requirement 4: Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.name || draft.url || draft.shortDesc || draft.description) {
          if (draft.name) setName(draft.name);
          if (draft.url) setUrl(draft.url);
          if (draft.shortDesc) setShortDesc(draft.shortDesc);
          if (draft.description) setDescription(draft.description);
          if (draft.selectedCategoryOption) setSelectedCategoryOption(draft.selectedCategoryOption);
          if (draft.customCategoryInput) setCustomCategoryInput(draft.customCategoryInput);
          if (Array.isArray(draft.tags) && draft.tags.length > 0) setTags(draft.tags);
          if (draft.thumbnailUrl) setThumbnailUrl(draft.thumbnailUrl);
          if (draft.makerName) setMakerName(draft.makerName);
          if (draft.makerEmail) setMakerEmail(draft.makerEmail);
          setHasRestoredDraft(true);
        }
      }
    } catch (e) {
      console.warn('Failed to restore draft', e);
    }
  }, []);

  // Requirement 4: Save draft to localStorage automatically
  useEffect(() => {
    if (successData) return;
    try {
      const draft = {
        name,
        url,
        shortDesc,
        description,
        selectedCategoryOption,
        customCategoryInput,
        tags,
        thumbnailUrl,
        makerName,
        makerEmail
      };
      // Only save if at least one meaningful field has content
      if (name || url || shortDesc || description || customCategoryInput) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      }
    } catch (e) {
      console.warn('Failed to save draft', e);
    }
  }, [name, url, shortDesc, description, selectedCategoryOption, customCategoryInput, tags, thumbnailUrl, makerName, makerEmail, successData]);

  const handleManualSaveDraft = () => {
    try {
      const draft = {
        name,
        url,
        shortDesc,
        description,
        selectedCategoryOption,
        customCategoryInput,
        tags,
        thumbnailUrl,
        makerName,
        makerEmail,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftSavedNotice(true);
      setTimeout(() => setDraftSavedNotice(false), 3000);
    } catch (e) {
      console.warn('Failed to save draft', e);
    }
  };

  const handleSafeClose = () => {
    try {
      if (name || url || shortDesc || description || customCategoryInput) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            name,
            url,
            shortDesc,
            description,
            selectedCategoryOption,
            customCategoryInput,
            tags,
            thumbnailUrl,
            makerName,
            makerEmail,
          })
        );
      }
    } catch {}
    onClose();
  };

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setName('');
    setUrl('');
    setShortDesc('');
    setDescription('');
    setSelectedCategoryOption('AI');
    setCustomCategoryInput('');
    setTags(['웹앱', 'AI']);
    setThumbnailUrl('');
    setMakerName('');
    setMakerEmail('');
    setHasRestoredDraft(false);
  };

  // Auto-complete tag filtering
  const matchingSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!q) return [];
    return POPULAR_TAG_SUGGESTIONS.filter(
      (t) => t.toLowerCase().includes(q) && !tags.includes(t)
    ).slice(0, 6);
  }, [tagInput, tags]);

  const handleAddTag = (tagToAdd?: string) => {
    const clean = (tagToAdd || tagInput).trim().replace(/^#/, '');
    if (!clean) return;
    if (tags.includes(clean)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 5) {
      setErrorMessage('주요 기능 태그는 최대 5개까지만 등록 가능합니다.');
      return;
    }
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) return setErrorMessage('사이트명을 입력해주세요.');
    if (!url.trim()) return setErrorMessage('접속 주소(URL)를 입력해주세요.');
    if (!shortDesc.trim()) return setErrorMessage('한 줄 소개를 입력해주세요.');
    if (!description.trim()) return setErrorMessage('상세 설명을 입력해주세요.');
    if (tags.length === 0) return setErrorMessage('주요 태그를 1개 이상 추가해주세요.');

    try {
      new URL(url.trim());
    } catch {
      return setErrorMessage('유효한 웹사이트 주소(http:// 또는 https://)를 입력해주세요.');
    }

    // Determine final category (custom proposed or selected)
    let finalCategory = selectedCategoryOption;
    if (selectedCategoryOption === '__custom__') {
      const customClean = customCategoryInput.trim();
      if (!customClean) {
        return setErrorMessage('제안할 새 카테고리명을 입력해주세요.');
      }
      finalCategory = customClean;
    }

    setIsSubmitting(true);
    try {
      const res = await createService({
        name: name.trim(),
        url: url.trim(),
        short_desc: shortDesc.trim(),
        description: description.trim(),
        category: finalCategory,
        tags,
        thumbnail_url: thumbnailUrl.trim() || undefined,
        screenshot_url: screenshotUrl.trim() || thumbnailUrl.trim() || undefined,
        maker_name: makerName.trim() || undefined,
        maker_email: makerEmail.trim() || undefined,
        is_custom_category: selectedCategoryOption === '__custom__',
      });

      // Clear draft on success
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      const isCustom = selectedCategoryOption === '__custom__';
      setSuccessData({
        maker_code: res.maker_code,
        service_id: res.service_id,
        is_custom: isCustom,
      });
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || '서비스 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (successData?.maker_code) {
      navigator.clipboard.writeText(successData.maker_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-[#0A0A0A] flex items-center justify-between bg-[#FF6B9E]">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-[#0A0A0A]">사이트 등록</span>
            <span className="text-[11px] font-mono bg-white text-[#0A0A0A] px-2 py-0.5 rounded border border-[#0A0A0A] font-bold">
              SUBMIT SERVICE
            </span>
          </div>
          <button
            onClick={handleSafeClose}
            className="p-1.5 bg-white border border-[#0A0A0A] rounded text-[#0A0A0A] hover:bg-[#F1F0E8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto bg-white">
          {successData ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-2xl flex items-center justify-center mx-auto shadow-[3px_3px_0_#0A0A0A]">
                <Check className="w-8 h-8 stroke-[3] text-[#0A0A0A]" />
              </div>

              <div className="space-y-1">
                {successData.is_custom ? (
                  <>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                      심사 대기 · 사이트 ID: #{successData.service_id}
                    </span>
                    <h3 className="font-display text-2xl text-[#0A0A0A] pt-1">
                      사이트가 심사 대기 중입니다!
                    </h3>
                    <p className="text-xs text-[#52525B] max-w-md mx-auto leading-relaxed">
                      아래 발급된 <strong>제작자 관리 코드</strong>는 사이트 수정, 삭제 및 공지 작성에 필요하므로 반드시 복사해 안전하게 보관하세요.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-mono font-bold text-[#52525B]">
                      등록 완료 · 사이트 ID: #{successData.service_id}
                    </span>
                    <h3 className="font-display text-2xl text-[#0A0A0A] pt-1">
                      사이트가 등록되었습니다!
                    </h3>
                    <p className="text-xs text-[#52525B] max-w-md mx-auto leading-relaxed">
                      바이브덤프 둘러보기 피드에 즉시 공개되었습니다. 아래 발급된 <strong>제작자 관리 코드</strong>는 사이트 수정, 삭제 및 공지 작성에 필요하므로 반드시 복사해 안전하게 보관하세요.
                    </p>
                  </>
                )}
              </div>

              {/* Secure Maker Access Code Card */}
              <div className="max-w-md mx-auto p-4 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl text-left space-y-2 shadow-[3px_3px_0_#0A0A0A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0A0A0A] flex items-center gap-1.5">
                    🔑 제작자 관리 코드 (Maker Access Code)
                  </span>
                  <span className="text-[10px] bg-[#C81E4B] text-white px-1.5 py-0.5 rounded font-black">
                    재발급 불가
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={successData.maker_code}
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-white border-2 border-[#0A0A0A] rounded-lg select-all"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="px-3.5 py-2 bg-[#FFD23F] hover:bg-[#FFD23F]/80 text-[#0A0A0A] border-2 border-[#0A0A0A] rounded-lg text-xs font-bold flex items-center gap-1 shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>코드 복사</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-[#52525B]">
                  * 사이트 관리(설명/카테고리 수정, 게재 철회, 공지 작성) 시 이 코드를 입력하여 본인임을 인증합니다.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#0A0A0A] hover:bg-neutral-800 text-white text-xs font-bold rounded-lg shadow-[2px_2px_0_#FFD23F]"
                >
                  확인하고 사이트 둘러보기
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Draft Restored Banner */}
              {hasRestoredDraft && (
                <div className="p-2.5 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-center justify-between text-xs text-[#0A0A0A]">
                  <span className="font-medium flex items-center gap-1.5">
                    💾 <strong>임시 저장 안내:</strong> 작성 중이던 내용이 브라우저에서 자동 복원되었습니다.
                  </span>
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[#0A0A0A] rounded font-bold hover:bg-neutral-100"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>초기화</span>
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 text-[#C81E4B] font-bold text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Requirement 3: Promo banner updated to '현재 운영하지 않습니다.' */}
              <div className="p-3.5 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl flex items-center justify-between gap-3 text-xs shadow-[2px_2px_0_#0A0A0A]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#0A0A0A]">
                    <span className="bg-[#0A0A0A] text-[#FFD23F] px-1.5 py-0.2 rounded text-[10px] font-black uppercase">
                      PROMO
                    </span>
                    <span>유료 추천 노출 및 스폰서 배지 안내</span>
                  </div>
                  <p className="text-[11px] text-[#52525B] font-medium leading-relaxed">
                    현재 운영하지 않습니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    사이트명 <span className="text-[#C81E4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 던전 크롤러: 포션 마스터"
                    maxLength={80}
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    접속 주소(URL) <span className="text-[#C81E4B]">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Requirement 4 & 11: Representative Category selection + Custom Category proposal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0A0A0A] flex items-center justify-between">
                  <span>대표 카테고리 <span className="text-[#C81E4B]">*</span></span>
                  <span className="text-[11px] text-[#52525B] font-normal">
                    * 원하는 카테고리가 없다면 직접 제안할 수 있습니다.
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={selectedCategoryOption}
                    onChange={(e) => setSelectedCategoryOption(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  >
                    {categoryList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__custom__">➕ [새 카테고리 직접 입력/제안]</option>
                  </select>

                  {selectedCategoryOption === '__custom__' && (
                    <input
                      type="text"
                      required
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="제안할 카테고리명 (예: 오디오, 커머스, 운세)"
                      maxLength={20}
                      className="w-full px-3 py-2 text-xs bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-lg focus:outline-none font-bold"
                    />
                  )}
                </div>

                {selectedCategoryOption === '__custom__' && (
                  <div className="p-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-[11px] text-[#52525B] leading-tight">
                    📢 <strong>새 카테고리 제안 안내:</strong> 제안하신 카테고리는 운영진의 심사를 거쳐 최종 승인 및 정규 분류에 반영됩니다.
                  </div>
                )}
              </div>

              {/* Major functional tags with auto-complete and recommendations */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0A0A0A] flex items-center justify-between">
                  <span>주요 기능 태그 (최대 5개) <span className="text-[#C81E4B]">*</span></span>
                  <span className="text-[11px] text-[#52525B] font-normal">{tags.length}/5개 선택</span>
                </label>

                <div className="relative">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="단어를 입력하면 자동완성 추천 태그가 표시됩니다"
                      className="flex-1 px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag()}
                      className="px-3.5 py-2 text-xs font-bold bg-[#F1F0E8] border-2 border-[#0A0A0A] rounded-lg hover:bg-[#FFD23F] active:translate-x-0.5"
                    >
                      추가
                    </button>
                  </div>

                  {/* Auto-complete dropdown */}
                  {matchingSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-[#0A0A0A] rounded-lg p-1.5 shadow-[3px_3px_0_#0A0A0A] z-20 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-[#52525B] font-bold px-1.5">추천 태그:</span>
                      {matchingSuggestions.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleAddTag(st)}
                          className="px-2 py-0.5 bg-[#FFF3C4] border border-[#0A0A0A] rounded text-[11px] font-bold text-[#0A0A0A] hover:bg-[#FFD23F] flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>#{st}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected tag chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-[#FAFAF5] border-2 border-[#0A0A0A] px-2.5 py-1 rounded text-xs font-bold shadow-[1px_1px_0_#0A0A0A]"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-[#52525B] hover:text-[#C81E4B]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0A0A0A]">
                  한 줄 소개 <span className="text-[#C81E4B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  placeholder="서비스의 핵심 매력을 한 줄로 요약해주세요 (최대 150자)"
                  maxLength={150}
                  className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0A0A0A]">
                  상세 설명 <span className="text-[#C81E4B]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="바이브 코딩 제작 계기, 구현한 기능과 재미 요소를 자유롭게 소개해주세요."
                  className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                />
              </div>

              {/* Image URLs (Compact 16:10 Preview, No Presets) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    대표 썸네일 이미지 URL (선택)
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://... (웹상에 공개된 이미지 주소)"
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                  {thumbnailUrl && (
                    <div className="mt-1.5 flex items-center gap-2.5 p-2 bg-[#FAFAF5] border border-[#0A0A0A] rounded-lg">
                      <div className="w-24 sm:w-28 aspect-[16/10] rounded overflow-hidden border border-[#0A0A0A] bg-[#F1F0E8] shrink-0 shadow-[1px_1px_0_#0A0A0A]">
                        <img
                          src={thumbnailUrl}
                          alt="썸네일 미리보기"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-[#52525B]">
                        <span className="font-bold text-[#0A0A0A] block">카드 썸네일 미리보기</span>
                        <span className="text-[10px]">16:10 카드 비율</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    추가 스크린샷 이미지 URL (선택)
                  </label>
                  <input
                    type="url"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://... (상세 팝업용 스크린샷 주소)"
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                  {screenshotUrl && (
                    <div className="mt-1.5 flex items-center gap-2.5 p-2 bg-[#FAFAF5] border border-[#0A0A0A] rounded-lg">
                      <div className="w-24 sm:w-28 aspect-[16/10] rounded overflow-hidden border border-[#0A0A0A] bg-[#F1F0E8] shrink-0 shadow-[1px_1px_0_#0A0A0A]">
                        <img
                          src={screenshotUrl}
                          alt="스크린샷 미리보기"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-[11px] text-[#52525B]">
                        <span className="font-bold text-[#0A0A0A] block">상세 스크린샷 미리보기</span>
                        <span className="text-[10px]">상세 모달 노출용</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Maker Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t-2 border-[#0A0A0A]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    제작자 / 팀 닉네임 (선택)
                  </label>
                  <input
                    type="text"
                    value={makerName}
                    onChange={(e) => setMakerName(e.target.value)}
                    placeholder="예: 덤퍼개발자, 1인인디팀 (최대 30자)"
                    maxLength={30}
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">
                    제작자 연락처 이메일 (선택, 비공개)
                  </label>
                  <input
                    type="email"
                    value={makerEmail}
                    onChange={(e) => setMakerEmail(e.target.value)}
                    placeholder="maker@example.com (운영 문의 및 공지용)"
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t-2 border-[#0A0A0A] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] text-[#52525B]">
                    * 작성 중 언제든 임시저장하거나 복원할 수 있습니다.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSafeClose}
                    className="px-4 py-2 text-xs font-bold text-[#52525B] hover:text-[#0A0A0A]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleManualSaveDraft}
                    className={`px-3.5 py-2 text-xs font-bold border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 ${
                      draftSavedNotice
                        ? 'bg-[#06D6A0] text-[#0A0A0A]'
                        : 'bg-[#F1F0E8] hover:bg-[#FFF3C4] text-[#0A0A0A]'
                    }`}
                  >
                    {draftSavedNotice ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>임시저장 완료!</span>
                      </>
                    ) : (
                      <>
                        <span>💾 임시저장</span>
                      </>
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-[#0A0A0A] bg-[#FFD23F] hover:bg-[#FFD23F]/80 border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? '등록 중...' : '등록 신청하기'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
