import React, { useState } from 'react';
import { X, Key, Check, AlertCircle, Edit, Megaphone, Eye, Heart, Plus, Trash2, Tag } from 'lucide-react';
import { verifyMaker, updateMakerService, createMakerPost, deleteMakerPost } from '../lib/api';
import { Service, VALID_CATEGORIES } from '../types';

interface MakerStudioModalProps {
  onClose: () => void;
  onRefreshServices: () => void;
}

export const MakerStudioModal: React.FC<MakerStudioModalProps> = ({ onClose, onRefreshServices }) => {
  const [serviceIdInput, setServiceIdInput] = useState('');
  const [makerCodeInput, setMakerCodeInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [service, setService] = useState<Service | null>(null);
  const [makerCode, setMakerCode] = useState('');

  // Active Maker Studio tab
  const [activeTab, setActiveTab] = useState<'edit' | 'post'>('edit');

  // Edit fields
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('생산성');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [makerName, setMakerName] = useState('');
  const [makerEmail, setMakerEmail] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // New post fields
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'notice' | 'update' | 'devlog'>('notice');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postSuccessMsg, setPostSuccessMsg] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceIdInput.trim() || !makerCodeInput.trim()) return;

    setIsVerifying(true);
    setAuthError(null);
    try {
      const res = await verifyMaker(Number(serviceIdInput.trim()), makerCodeInput.trim());
      setService(res.service);
      setMakerCode(makerCodeInput.trim());
      setIsAuthenticated(true);

      // Populate edit fields
      setName(res.service.name || '');
      setUrl(res.service.url || '');
      setCategory(res.service.category || '생산성');
      setTags(Array.isArray(res.service.tags) ? [...res.service.tags] : []);
      setShortDesc(res.service.short_desc || '');
      setDescription(res.service.description || '');
      setThumbnailUrl(res.service.thumbnail_url || '');
      setScreenshotUrl(res.service.screenshot_url || '');
      setMakerName(res.service.maker_name || '');
      setMakerEmail(res.service.maker_email || '');
    } catch (err: any) {
      setAuthError(err.message || '인증에 실패했습니다. 서비스 ID와 코드를 확인해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const clean = (tagToAdd || tagInput).trim().replace(/^#/, '');
    if (!clean) return;
    if (tags.includes(clean)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 5) {
      setAuthError('주요 기능 태그는 최대 5개까지만 등록 가능합니다.');
      return;
    }
    setTags([...tags, clean]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    if (!name.trim()) return setAuthError('서비스명을 입력해주세요.');
    if (!url.trim()) return setAuthError('접속 주소(URL)를 입력해주세요.');
    if (!shortDesc.trim()) return setAuthError('한 줄 소개를 입력해주세요.');
    if (!description.trim()) return setAuthError('상세 설명을 입력해주세요.');
    if (tags.length === 0) return setAuthError('주요 태그를 1개 이상 추가해주세요.');

    setIsSavingEdit(true);
    setEditSuccessMsg(null);
    setAuthError(null);
    try {
      await updateMakerService(service.id, makerCode, {
        name: name.trim(),
        url: url.trim(),
        category,
        tags,
        short_desc: shortDesc.trim(),
        description: description.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        screenshot_url: screenshotUrl.trim() || null,
        maker_name: makerName.trim() || null,
        maker_email: makerEmail.trim() || null,
      });
      setEditSuccessMsg('서비스 정보가 성공적으로 저장되었습니다!');
      onRefreshServices();
      setTimeout(() => setEditSuccessMsg(null), 3000);
    } catch (err: any) {
      setAuthError(err.message || '저장에 실패했습니다.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !postTitle.trim() || !postContent.trim()) return;

    setIsSubmittingPost(true);
    setPostSuccessMsg(null);
    try {
      await createMakerPost(service.id, makerCode, {
        title: postTitle.trim(),
        content: postContent.trim(),
        post_type: postType,
      });
      setPostSuccessMsg('새 공지/업데이트가 등록되었습니다!');
      setPostTitle('');
      setPostContent('');
      onRefreshServices();
      setTimeout(() => setPostSuccessMsg(null), 3000);
    } catch (err: any) {
      setAuthError(err.message || '공지 등록에 실패했습니다.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">제작자 스튜디오 (Maker Studio)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isAuthenticated ? (
            /* Auth screen */
            <form onSubmit={handleVerify} className="space-y-4 max-w-md mx-auto py-6">
              <div className="text-center space-y-1 mb-6">
                <h3 className="text-lg font-bold text-slate-900">제작자 권한 인증</h3>
                <p className="text-xs text-slate-500">
                  서비스 등록 시 발급받은 서비스 ID와 제작자 코드를 입력하세요.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">서비스 ID</label>
                <input
                  type="number"
                  required
                  value={serviceIdInput}
                  onChange={(e) => setServiceIdInput(e.target.value)}
                  placeholder="예: 1"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  제작자 관리 코드 (Maker Access Code)
                </label>
                <input
                  type="text"
                  required
                  value={makerCodeInput}
                  onChange={(e) => setMakerCodeInput(e.target.value)}
                  placeholder="vd_..."
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400">
                  * 초기 시드 프로젝트 테스트용 코드: <code className="text-indigo-600 font-bold">vd_demo_potionmaster_2026</code> (ID: 1)
                </p>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
              >
                {isVerifying ? '코드 검증 중...' : '제작자 인증 및 관리 시작'}
              </button>
            </form>
          ) : (
            /* Authenticated Management Panel */
            <div className="space-y-6">
              {/* Service Quick Bar & KPI */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{service?.name}</h3>
                  <p className="text-xs text-slate-500">분야: {service?.category} · 서비스 ID: #{service?.id}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>조회수: {service?.views_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-rose-600">
                    <Heart className="w-3.5 h-3.5 fill-rose-500" />
                    <span>좋아요: {service?.likes_count}</span>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeTab === 'edit'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>정보 수정</span>
                </button>
                <button
                  onClick={() => setActiveTab('post')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeTab === 'post'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>공지 & 업데이트 작성</span>
                </button>
              </div>

              {/* Tab 1: Edit info */}
              {activeTab === 'edit' && (
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {editSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{editSuccessMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">서비스명 *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={80}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">접속 주소 (URL) *</label>
                      <input
                        type="url"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">대표 분야 (카테고리) *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    >
                      {VALID_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tag Management */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                        <span>주요 기능 태그 (1~5개) *</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-500">
                        {tags.length}/5개
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-white border border-slate-200 rounded-lg">
                      {tags.length === 0 ? (
                        <span className="text-xs text-slate-400">태그를 추가해주세요.</span>
                      ) : (
                        tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded"
                          >
                            #{t}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              className="hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
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
                        placeholder="태그 직접 입력 후 [추가] 또는 Enter"
                        maxLength={20}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTag()}
                        disabled={!tagInput.trim() || tags.length >= 5}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold"
                      >
                        + 추가
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200">
                      {[
                        '웹앱', '웹게임', '글쓰기', '기록', '대시보드', '디자인', '템플릿',
                        '메모', '분석', '생산성', 'AI챗', '시각화', '자동화', '협업'
                      ].map((t) => {
                        const hasTag = tags.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={hasTag || tags.length >= 5}
                            onClick={() => handleAddTag(t)}
                            className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
                              hasTag
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-400 opacity-60'
                                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {hasTag ? `✓ #${t}` : `+ #${t}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">한 줄 소개 *</label>
                    <input
                      type="text"
                      required
                      value={shortDesc}
                      onChange={(e) => setShortDesc(e.target.value)}
                      maxLength={150}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">상세 설명 *</label>
                    <textarea
                      rows={3}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">대표 썸네일 이미지 URL (선택)</label>
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://... (웹상에 공개된 이미지 주소)"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {thumbnailUrl && (
                        <div className="mt-1.5 flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="w-20 aspect-[16/10] rounded overflow-hidden border border-slate-300 bg-slate-100 shrink-0">
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
                          <span className="text-[10px] text-slate-500 font-medium">16:10 카드 썸네일</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">추가 스크린샷 이미지 URL (선택)</label>
                      <input
                        type="url"
                        value={screenshotUrl}
                        onChange={(e) => setScreenshotUrl(e.target.value)}
                        placeholder="https://... (상세 팝업용 스크린샷 주소)"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {screenshotUrl && (
                        <div className="mt-1.5 flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="w-20 aspect-[16/10] rounded overflow-hidden border border-slate-300 bg-slate-100 shrink-0">
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
                          <span className="text-[10px] text-slate-500 font-medium">상세 스크린샷</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">제작자 닉네임</label>
                      <input
                        type="text"
                        value={makerName}
                        onChange={(e) => setMakerName(e.target.value)}
                        placeholder="예: 덤퍼개발자"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">제작자 이메일</label>
                      <input
                        type="email"
                        value={makerEmail}
                        onChange={(e) => setMakerEmail(e.target.value)}
                        placeholder="maker@example.com"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingEdit}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                    >
                      {isSavingEdit ? '저장 중...' : '수정 사항 저장'}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 2: Create post */}
              {activeTab === 'post' && (
                <form onSubmit={handleCreatePost} className="space-y-4">
                  {postSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>{postSuccessMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">분류</label>
                      <select
                        value={postType}
                        onChange={(e) => setPostType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                      >
                        <option value="notice">공지사항</option>
                        <option value="update">업데이트</option>
                        <option value="devlog">개발일지</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-800">제목</label>
                      <input
                        type="text"
                        required
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="예: v1.1 업데이트 내역 안내"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                      >
                      </input>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">내용</label>
                    <textarea
                      required
                      rows={4}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="공지나 기능 업데이트 내용을 작성해주세요."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingPost}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
                    >
                      {isSubmittingPost ? '등록 중...' : '공지 게시하기'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
