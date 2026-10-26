import React, { useState, useEffect } from 'react';
import {
  X, Shield, AlertCircle, Check, Eye, Heart, Edit, Megaphone, Trash2, Tag,
  DollarSign, BarChart2, Ban, Sparkles, RefreshCw, ShieldAlert, RotateCcw, ExternalLink,
  Download, Upload, Save, FolderKanban, ArrowUp, ArrowDown, Plus, RotateCw
} from 'lucide-react';
import {
  verifyMaker, updateMakerService, createMakerPost, deleteMakerService,
  adminAuth, adminGetServices, adminUpdateService, adminUpdateServiceStatus, adminUpdateServiceCategory, adminDeleteService,
  adminGetReports, adminResolveReport, adminGetReviews, adminUpdateReviewStatus,
  adminGetTags, adminMergeTags, adminGetCurations, adminCreateCuration,
  adminDeleteCuration, adminGetPromotions, adminCreatePromotion,
  adminTogglePromotion, adminGetStats, fetchSettings, updateAdminSettings,
  adminUpdateTagStatus, adminDeleteTag, adminDownloadBackup, adminRestoreBackup,
  adminGetCategories, adminAddCategory, adminSaveCategories, adminRenameCategory, adminDeleteCategory
} from '../lib/api';
import { Service, ReportItem, Review, TagItem, Curation, Promotion, AdminStats, VALID_CATEGORIES } from '../types';

interface SiteManagementModalProps {
  onClose: () => void;
  onRefreshAll: () => void;
  onSloganChange?: (newSlogan: string) => void;
  siteTitle?: string;
  onSiteTitleChange?: (newTitle: string) => void;
  showAds?: boolean;
  onToggleShowAds?: (showAds: boolean) => void;
}

const MAKER_POST_DRAFT_KEY = 'vibedump_maker_post_draft';

const MAKER_PRIORITY_TAGS = [
  '웹앱', '웹게임', '글쓰기', '기록', '대시보드', '디자인', '템플릿',
  '메모', '분석', '생산성', 'AI챗', '시각화', '자동화', '협업'
];

export const SiteManagementModal: React.FC<SiteManagementModalProps> = ({
  onClose,
  onRefreshAll,
  onSloganChange,
  siteTitle,
  onSiteTitleChange,
  showAds = false,
  onToggleShowAds,
}) => {
  const [mode, setMode] = useState<'maker' | 'admin'>('maker');
  const [currentShowAds, setCurrentShowAds] = useState(showAds);
  const [currentSiteTitle, setCurrentSiteTitle] = useState(siteTitle || '바이브덤프 - 인터넷은 아직 재밌다');

  useEffect(() => {
    setCurrentShowAds(showAds);
  }, [showAds]);

  useEffect(() => {
    if (siteTitle) setCurrentSiteTitle(siteTitle);
  }, [siteTitle]);

  // Maker Studio state
  const [serviceIdInput, setServiceIdInput] = useState('');
  const [makerCodeInput, setMakerCodeInput] = useState('');
  const [makerAuth, setMakerAuth] = useState(false);
  const [makerService, setMakerService] = useState<Service | null>(null);
  const [makerError, setMakerError] = useState<string | null>(null);
  const [makerSuccess, setMakerSuccess] = useState<string | null>(null);
  const [makerTab, setMakerTab] = useState<'edit' | 'post'>('edit');

  // Maker edit fields (all registration fields available)
  const [name, setName] = useState('');
  const [makerUrl, setMakerUrl] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [makerCategory, setMakerCategory] = useState<string>('생산성');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [makerScreenshotUrl, setMakerScreenshotUrl] = useState('');
  const [makerName, setMakerName] = useState('');
  const [makerEmail, setMakerEmail] = useState('');
  const [makerTags, setMakerTags] = useState<string[]>([]);
  const [makerTagInput, setMakerTagInput] = useState('');

  // Maker post fields
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'notice' | 'update' | 'devlog'>('notice');
  const [hasRestoredPostDraft, setHasRestoredPostDraft] = useState(false);

  // Admin state
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'stats' | 'services' | 'categories' | 'tags' | 'reports' | 'slogan' | 'curations' | 'promotions' | 'backup'>('stats');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  // Category management state
  const [adminCategories, setAdminCategories] = useState<string[]>([...VALID_CATEGORIES]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');

  // Admin Slogan state (Requirement 1: max length increased & history preserved)
  const [currentSlogan, setCurrentSlogan] = useState('인터넷은 아직 재밌다');
  const [sloganHistory, setSloganHistory] = useState<string[]>([
    '인터넷은 아직 재밌다',
    '웹이라는 게 숨긴다고 숨겨지는 것도 아니고',
    '덤프 진행하겠습니다...'
  ]);

  const sloganPresets = [
    '인터넷은 아직 재밌다',
    '웹이라는 게 숨긴다고 숨겨지는 것도 아니고',
    '덤프 진행하겠습니다...',
    '바이브 코딩의 모든 것',
    '새로운 인터넷, 여기서 찍먹!',
  ];

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [curations, setCurations] = useState<Curation[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Admin direct service card editing state
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    url: '',
    short_desc: '',
    description: '',
    category: 'AI',
    customCategory: '',
    thumbnail_url: '',
    screenshot_url: '',
    maker_name: '',
    status: 'approved',
    tags: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Admin tags merge
  const [mergeSource, setMergeSource] = useState<number | ''>('');
  const [mergeTarget, setMergeTarget] = useState<number | ''>('');

  // Admin Curation
  const [curServiceId, setCurServiceId] = useState('');
  const [curBadgeText, setCurBadgeText] = useState('이번 주의 발견');
  const [curBlurb, setCurBlurb] = useState('');

  // Admin Promotion
  const [promoServiceId, setPromoServiceId] = useState('');
  const [promoSlot, setPromoSlot] = useState('floating_ad');

  // Requirement 4: Restore Maker post draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MAKER_POST_DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.postTitle || draft.postContent) {
          if (draft.postTitle) setPostTitle(draft.postTitle);
          if (draft.postContent) setPostContent(draft.postContent);
          if (draft.postType) setPostType(draft.postType);
          setHasRestoredPostDraft(true);
        }
      }
    } catch {}
  }, []);

  // Save Maker post draft automatically
  useEffect(() => {
    try {
      if (postTitle || postContent) {
        localStorage.setItem(
          MAKER_POST_DRAFT_KEY,
          JSON.stringify({ postTitle, postContent, postType })
        );
      }
    } catch {}
  }, [postTitle, postContent, postType]);

  const handleClearPostDraft = () => {
    try {
      localStorage.removeItem(MAKER_POST_DRAFT_KEY);
    } catch {}
    setPostTitle('');
    setPostContent('');
    setPostType('notice');
    setHasRestoredPostDraft(false);
  };

  // Maker Auth
  const handleMakerVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceIdInput || !makerCodeInput.trim()) return;
    setMakerError(null);
    try {
      const res = await verifyMaker(Number(serviceIdInput), makerCodeInput.trim());
      setMakerService(res.service);
      setMakerAuth(true);
      setName(res.service.name || '');
      setMakerUrl(res.service.url || '');
      setShortDesc(res.service.short_desc || '');
      setDescription(res.service.description || '');
      if (adminCategories.includes(res.service.category)) {
        setMakerCategory(res.service.category);
        setCustomCategory('');
      } else {
        setMakerCategory('__custom__');
        setCustomCategory(res.service.category || '');
      }
      setThumbnailUrl(res.service.thumbnail_url || '');
      setMakerScreenshotUrl(res.service.screenshot_url || '');
      setMakerName(res.service.maker_name || '');
      setMakerEmail(res.service.maker_email || '');
      setMakerTags(Array.isArray(res.service.tags) ? [...res.service.tags] : []);
    } catch (err: any) {
      setMakerError(err.message || '관리 코드가 올바르지 않아요.');
    }
  };

  const handleAddMakerTag = (tagToAdd?: string) => {
    const clean = (tagToAdd || makerTagInput).trim().replace(/^#/, '');
    if (!clean) return;
    if (makerTags.includes(clean)) {
      setMakerTagInput('');
      return;
    }
    if (makerTags.length >= 5) {
      setMakerError('주요 기능 태그는 최대 5개까지만 등록 가능합니다.');
      return;
    }
    setMakerTags([...makerTags, clean]);
    setMakerTagInput('');
    setMakerError(null);
  };

  const handleRemoveMakerTag = (t: string) => {
    setMakerTags(makerTags.filter((item) => item !== t));
  };

  // Save updated category, URL, description, tags, screenshots, maker info
  const handleMakerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!makerService) return;
    setMakerSuccess(null);
    setMakerError(null);
    try {
      if (!name.trim()) return setMakerError('서비스명을 입력해주세요.');
      if (!makerUrl.trim()) return setMakerError('접속 주소(URL)를 입력해주세요.');
      try {
        new URL(makerUrl.trim());
      } catch {
        return setMakerError('유효한 웹사이트 주소(http:// 또는 https://)를 입력해주세요.');
      }
      if (!shortDesc.trim()) return setMakerError('한 줄 소개를 입력해주세요.');
      if (!description.trim()) return setMakerError('상세 설명을 입력해주세요.');
      if (makerTags.length === 0) return setMakerError('주요 태그를 최소 1개 이상 등록해주세요.');
      if (makerTags.length > 5) return setMakerError('주요 태그는 최대 5개까지만 등록 가능합니다.');

      const finalCategory = makerCategory === '__custom__' ? customCategory.trim() : makerCategory;
      if (!finalCategory) {
        return setMakerError('카테고리를 입력해주세요.');
      }
      await updateMakerService(makerService.id, makerCodeInput.trim(), {
        name: name.trim(),
        url: makerUrl.trim(),
        short_desc: shortDesc.trim(),
        description: description.trim(),
        category: finalCategory,
        tags: makerTags,
        thumbnail_url: thumbnailUrl.trim() || null,
        screenshot_url: makerScreenshotUrl.trim() || null,
        maker_name: makerName.trim() || null,
        maker_email: makerEmail.trim() || null,
      });
      setMakerSuccess('서비스 정보(태그/카테고리/상세내용/이미지 등)가 성공적으로 저장되었습니다!');
      setMakerService((prev) => prev ? {
        ...prev,
        name: name.trim(),
        url: makerUrl.trim(),
        short_desc: shortDesc.trim(),
        description: description.trim(),
        category: finalCategory,
        tags: makerTags,
        thumbnail_url: thumbnailUrl.trim() || null,
        screenshot_url: makerScreenshotUrl.trim() || null,
        maker_name: makerName.trim() || null,
        maker_email: makerEmail.trim() || null,
      } : null);
      onRefreshAll();
      setTimeout(() => setMakerSuccess(null), 3000);
    } catch (err: any) {
      setMakerError(err.message || '저장에 실패했어요.');
    }
  };

  // Requirement 9: Maker permanent site deletion
  const handleMakerDelete = async () => {
    if (!makerService) return;
    const confirmDelete = window.confirm(
      `정말 #${makerService.id} [${makerService.name}] 사이트를 영구 삭제(게재 철회)하시겠습니까?\n등록된 모든 후기, 북마크, 태그 연결이 함께 삭제되며 되돌릴 수 없습니다.`
    );
    if (!confirmDelete) return;

    try {
      await deleteMakerService(makerService.id, makerCodeInput.trim());
      alert('사이트가 성공적으로 영구 삭제(게재 철회)되었습니다.');
      setMakerAuth(false);
      setMakerService(null);
      setServiceIdInput('');
      setMakerCodeInput('');
      onRefreshAll();
    } catch (err: any) {
      setMakerError(err.message || '사이트 삭제에 실패했습니다.');
    }
  };

  const handleMakerPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!makerService || !postTitle.trim() || !postContent.trim()) return;
    setMakerSuccess(null);
    try {
      await createMakerPost(makerService.id, makerCodeInput.trim(), {
        title: postTitle.trim(),
        content: postContent.trim(),
        post_type: postType,
      });
      setMakerSuccess('제작자 공지를 등록했어요.');
      setPostTitle('');
      setPostContent('');
      try {
        localStorage.removeItem(MAKER_POST_DRAFT_KEY);
      } catch {}
      setHasRestoredPostDraft(false);
      onRefreshAll();
      setTimeout(() => setMakerSuccess(null), 3000);
    } catch (err: any) {
      setMakerError(err.message || '등록에 실패했어요.');
    }
  };

  // Admin Auth
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasscode) return;
    setAdminError(null);
    try {
      const res = await adminAuth(adminPasscode);
      setAdminToken(res.token);
      loadAdminData(res.token);
      fetchSettings().then((sRes) => {
        if (sRes.settings?.slogan) setCurrentSlogan(sRes.settings.slogan);
        if (Array.isArray(sRes.settings?.slogan_history)) {
          setSloganHistory(sRes.settings.slogan_history);
        }
        if (typeof sRes.settings?.show_ads === 'boolean') {
          setCurrentShowAds(sRes.settings.show_ads);
        }
      }).catch(() => {});
    } catch (err: any) {
      setAdminError(err.message || '운영자 관리 코드가 올바르지 않아요.');
    }
  };



  const handleToggleAdsMode = async () => {
    if (!adminToken) return;
    const nextVal = !currentShowAds;
    try {
      await updateAdminSettings({ show_ads: nextVal }, adminToken);
      setCurrentShowAds(nextVal);
      onToggleShowAds?.(nextVal);
      setAdminMsg(
        nextVal
          ? '📢 상업 모드 활성화: 하단 플로팅 AD 배너 및 스폰서 영역이 노출됩니다.'
          : '🌿 친구 모드(클린) 활성화: AD 배너, 스폰서십 문의, 광고 뱃지가 모두에게 숨겨집니다.'
      );
      setTimeout(() => setAdminMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || '광고 모드 변경 실패');
    }
  };

  const loadAdminData = async (token: string) => {
    try {
      const [sRes, svRes, repRes, revRes, tagRes, curRes, pRes, catRes] = await Promise.all([
        adminGetStats(token),
        adminGetServices(token),
        adminGetReports(token),
        adminGetReviews(token),
        adminGetTags(token),
        adminGetCurations(token),
        adminGetPromotions(token),
        adminGetCategories(token).catch(() => ({ categories: [...VALID_CATEGORIES] })),
      ]);
      setStats(sRes.stats);
      setServices(svRes.services);
      setReports(repRes.reports);
      setReviews(revRes.reviews);
      setTags(tagRes.tags);
      setCurations(curRes.curations);
      setPromotions(pRes.promotions);
      if (Array.isArray(catRes.categories) && catRes.categories.length > 0) {
        setAdminCategories(catRes.categories);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Requirement 1: Save slogan with length up to 150 & history update
  const handleSaveSlogan = async (sloganToSave?: string) => {
    if (!adminToken) return;
    const value = (sloganToSave || currentSlogan).trim().slice(0, 150);
    if (!value) return;
    try {
      await updateAdminSettings(value, adminToken);
      setCurrentSlogan(value);
      setSloganHistory((prev) => [value, ...prev.filter((item) => item !== value)].slice(0, 20));
      setAdminMsg(`문구가 '${value}'(으)로 즉시 변경되었습니다.`);
      onSloganChange?.(value);
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSiteTitle = async (titleToSave?: string) => {
    if (!adminToken) return;
    const value = (titleToSave || currentSiteTitle).trim().slice(0, 120);
    if (!value) return;
    try {
      await updateAdminSettings({ site_title: value }, adminToken);
      setCurrentSiteTitle(value);
      setAdminMsg(`브라우저 탭 타이틀이 '${value}'(으)로 즉시 변경되었습니다.`);
      onSiteTitleChange?.(value);
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '타이틀 저장 실패');
    }
  };

  const handleChangeAdminPassword = async () => {
    if (!adminToken) return;
    const val = newPasswordInput.trim();
    if (val.length < 6) {
      alert('새 운영자 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    try {
      const res = await updateAdminSettings({ new_admin_password: val }, adminToken);
      if (res.new_token) {
        setAdminToken(res.new_token);
      }
      setNewPasswordInput('');
      setAdminMsg('운영자 비밀번호가 성공적으로 변경되었습니다!');
      setTimeout(() => setAdminMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || '비밀번호 변경 실패');
    }
  };



  const handleServiceStatus = async (id: number, status: string) => {
    if (!adminToken) return;
    try {
      await adminUpdateServiceStatus(id, status, adminToken);
      setAdminMsg('서비스 공개 상태를 저장했어요.');
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleServiceCategoryChange = async (id: number, newCategory: string) => {
    if (!adminToken) return;
    try {
      await adminUpdateServiceCategory(id, newCategory, adminToken);
      setAdminMsg(`카테고리가 '${newCategory}'(으)로 변경되었습니다.`);
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, category: newCategory } : s))
      );
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '카테고리 변경에 실패했습니다.');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!adminToken || !confirm(`정말 #${id} 사이트를 영구 삭제할까요?\n연결된 모든 후기, 북마크, 태그 연결이 함께 영구 삭제됩니다.`)) return;
    try {
      await adminDeleteService(id, adminToken);
      setAdminMsg('서비스가 성공적으로 영구 삭제되었습니다.');
      setServices((prev) => prev.filter((s) => s.id !== id));
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '서비스 영구 삭제에 실패했습니다.');
    }
  };

  const handleStartEditService = (s: Service) => {
    setEditingService(s);
    const isStandard = adminCategories.includes(s.category as any);
    setEditForm({
      name: s.name || '',
      url: s.url || '',
      short_desc: s.short_desc || '',
      description: s.description || '',
      category: isStandard ? s.category : '__custom__',
      customCategory: isStandard ? '' : s.category,
      thumbnail_url: s.thumbnail_url || '',
      screenshot_url: s.screenshot_url || '',
      maker_name: s.maker_name || '',
      status: s.status || 'approved',
      tags: Array.isArray(s.tags) ? s.tags.join(', ') : '',
    });
  };

  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingService) return;
    setIsSavingEdit(true);
    try {
      const finalCategory = editForm.category === '__custom__' ? editForm.customCategory.trim() : editForm.category;
      if (!finalCategory) {
        alert('카테고리를 입력해주세요.');
        setIsSavingEdit(false);
        return;
      }

      const tagList = editForm.tags
        .split(',')
        .map((t) => t.trim().replace(/^#+/, ''))
        .filter(Boolean);

      await adminUpdateService(
        editingService.id,
        {
          name: editForm.name.trim(),
          url: editForm.url.trim(),
          short_desc: editForm.short_desc.trim(),
          description: editForm.description.trim(),
          category: finalCategory,
          thumbnail_url: editForm.thumbnail_url.trim() || undefined,
          screenshot_url: editForm.screenshot_url.trim() || undefined,
          maker_name: editForm.maker_name.trim() || undefined,
          status: editForm.status as any,
          tags: tagList,
        },
        adminToken
      );

      setAdminMsg(`'${editForm.name}' 서비스 카드 내용이 성공적으로 수정되었습니다.`);
      setEditingService(null);
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || '서비스 수정 실패');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleExportBackup = async () => {
    if (!adminToken) return;
    try {
      const data = await adminDownloadBackup(adminToken);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibedump-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAdminMsg('전체 데이터 백업 JSON 다운로드가 완료되었습니다.');
      setTimeout(() => setAdminMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || '백업 다운로드 실패');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!adminToken || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const confirmRestore = window.confirm(
      `[${file.name}] 백업 파일로 복원하시겠습니까?\n모든 서비스, 태그, 후기, 사이트 설정이 복원되며 중복 데이터는 최신 버전으로 갱신됩니다.`
    );
    if (!confirmRestore) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await adminRestoreBackup(parsed, adminToken);
      alert(res.message || '성공적으로 복원되었습니다.');
      loadAdminData(adminToken);
      onRefreshAll();
    } catch (err: any) {
      alert(`복원 실패: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !newCategoryInput.trim()) return;
    const clean = newCategoryInput.trim();
    try {
      const res = await adminAddCategory(clean, adminToken);
      setAdminCategories(res.categories);
      setNewCategoryInput('');
      setAdminMsg(`'${clean}' 분야가 새로 추가되었습니다.`);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '분야 추가 실패');
    }
  };

  const handleSaveCategoryOrder = async (newList: string[]) => {
    if (!adminToken) return;
    try {
      const res = await adminSaveCategories(newList, adminToken);
      setAdminCategories(res.categories);
      setAdminMsg('분야 순서가 저장되었습니다.');
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '순서 저장 실패');
    }
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= adminCategories.length) return;
    const next = [...adminCategories];
    const [removed] = next.splice(index, 1);
    next.splice(targetIndex, 0, removed);
    handleSaveCategoryOrder(next);
  };

  const handleStartRenameCategory = (index: number, name: string) => {
    setEditingCatIndex(index);
    setEditingCatValue(name);
  };

  const handleSaveRenameCategory = async (oldName: string) => {
    if (!adminToken || !editingCatValue.trim()) return;
    const newName = editingCatValue.trim();
    if (newName === oldName) {
      setEditingCatIndex(null);
      return;
    }
    try {
      const res = await adminRenameCategory(oldName, newName, adminToken);
      setAdminCategories(res.categories);
      setEditingCatIndex(null);
      setAdminMsg(`'${oldName}' 분야가 '${newName}'(으)로 변경되었습니다. (기존 서비스도 함께 갱신됨)`);
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '분야 수정 실패');
    }
  };

  const handleDeleteCategory = async (name: string) => {
    if (!adminToken) return;
    const count = services.filter((s) => s.category === name).length;
    const confirmMsg =
      count > 0
        ? `'${name}' 분야를 목록에서 삭제하시겠습니까?\n현재 이 분야로 등록된 서비스가 ${count}개 있습니다.`
        : `'${name}' 분야를 목록에서 삭제하시겠습니까?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await adminDeleteCategory(name, adminToken);
      setAdminCategories(res.categories);
      setAdminMsg(`'${name}' 분야가 삭제되었습니다.`);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || '분야 삭제 실패');
    }
  };

  const handleResetDefaultCategories = async () => {
    if (!adminToken || !confirm('기본 12개 분야(생산성, 비즈니스, 창작, 게임, 체크리스트, 사주타로, 밈, 덕질, 라이프, 학습, 소셜, 캐릭터소셜)로 초기화할까요?')) return;
    const defaults = [
      '생산성', '비즈니스', '창작', '게임', '체크리스트', '사주타로',
      '밈', '덕질', '라이프', '학습', '소셜', '캐릭터소셜'
    ];
    handleSaveCategoryOrder(defaults);
  };

  const handleResolveReport = async (id: number, status: string) => {
    if (!adminToken) return;
    try {
      await adminResolveReport(id, status, adminToken);
      setAdminMsg('신고 처리 상태를 저장했어요.');
      loadAdminData(adminToken);
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveTag = async (tagId: number) => {
    if (!adminToken) return;
    try {
      await adminUpdateTagStatus(tagId, 'approved', adminToken);
      setAdminMsg('제안된 태그가 정식 공개 승인되었습니다.');
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectTag = async (tagId: number) => {
    if (!adminToken || !confirm('이 제안 태그를 삭제(반려)할까요?')) return;
    try {
      await adminDeleteTag(tagId, adminToken);
      setAdminMsg('제안된 태그를 반려 및 삭제했습니다.');
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMergeTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
    try {
      await adminMergeTags(Number(mergeSource), Number(mergeTarget), adminToken);
      setAdminMsg('태그 병합 완료');
      setMergeSource('');
      setMergeTarget('');
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCuration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !curServiceId || !curBadgeText.trim() || !curBlurb.trim()) return;
    try {
      await adminCreateCuration(
        {
          service_id: Number(curServiceId),
          badge_text: curBadgeText.trim(),
          editorial_blurb: curBlurb.trim(),
          display_order: curations.length + 1,
        },
        adminToken
      );
      setCurServiceId('');
      setCurBlurb('');
      setAdminMsg('큐레이션 추가 완료');
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCuration = async (curationId: number) => {
    if (!adminToken) return;
    try {
      await adminDeleteCuration(curationId, adminToken);
      loadAdminData(adminToken);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Requirement 8: Create promotion with floating_ad slot
  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !promoServiceId) return;
    try {
      await adminCreatePromotion(
        {
          service_id: Number(promoServiceId),
          slot_type: promoSlot,
        },
        adminToken
      );
      setAdminMsg('스폰서 캠페인 생성 완료');
      setPromoServiceId('');
      loadAdminData(adminToken);
      onRefreshAll();
      setTimeout(() => setAdminMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePromotion = async (promoId: number, status: string) => {
    if (!adminToken) return;
    try {
      await adminTogglePromotion(promoId, status, adminToken);
      loadAdminData(adminToken);
      onRefreshAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const pendingTags = tags.filter((t) => (t as any).status === 'pending');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-4xl bg-[#FAFAF5] rounded-xl border-2 border-[#0A0A0A] shadow-[8px_8px_0_#0A0A0A] overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header with Mode Switcher */}
        <div className="px-5 py-3 border-b-2 border-[#0A0A0A] flex items-center justify-between gap-4 bg-[#FFD23F]">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-[#0A0A0A]">사이트 관리</span>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-[#0A0A0A] text-xs font-bold ml-2">
              <button
                onClick={() => setMode('maker')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  mode === 'maker' ? 'bg-[#0A0A0A] text-white' : 'text-[#0A0A0A]'
                }`}
              >
                제작자 영역
              </button>
              <button
                onClick={() => setMode('admin')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  mode === 'admin' ? 'bg-[#0A0A0A] text-white' : 'text-[#0A0A0A]'
                }`}
              >
                운영자 영역
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white border border-[#0A0A0A] rounded text-[#0A0A0A] hover:bg-[#F1F0E8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
          {mode === 'maker' ? (
            /* Maker Area */
            !makerAuth ? (
              <form onSubmit={handleMakerVerify} className="max-w-md mx-auto py-8 space-y-4">
                <div className="text-center space-y-1 mb-4">
                  <h3 className="font-display text-xl text-[#0A0A0A]">등록 사이트 관리</h3>
                  <p className="text-xs text-[#52525B]">
                    서비스 등록 시 발급받은 사이트 ID와 관리 코드를 입력하세요.
                  </p>
                </div>

                {makerError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 text-[#C81E4B] text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{makerError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">사이트 ID</label>
                  <input
                    type="number"
                    required
                    value={serviceIdInput}
                    onChange={(e) => setServiceIdInput(e.target.value)}
                    placeholder="예: 1"
                    className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0A0A0A]">사이트 관리 코드</label>
                  <input
                    type="text"
                    required
                    value={makerCodeInput}
                    onChange={(e) => setMakerCodeInput(e.target.value)}
                    placeholder="vd_..."
                    className="w-full px-3 py-2 text-xs font-mono bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                  />
                  <p className="text-[11px] text-[#52525B]">
                    * 사이트 등록 완료 시 발급받은 비밀 관리 코드를 입력하세요.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-bold text-[#0A0A0A] bg-[#FFD23F] hover:bg-[#FFD23F]/80 border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  관리 화면 열기
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="p-4 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl flex items-center justify-between flex-wrap gap-2 shadow-[2px_2px_0_#0A0A0A]">
                  <div>
                    <h3 className="font-display text-lg text-[#0A0A0A]">{makerService?.name}</h3>
                    <p className="text-xs text-[#52525B]">카테고리: {makerService?.category} · 사이트 ID: #{makerService?.id}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 font-mono">
                      <Eye className="w-3.5 h-3.5" />
                      조회수: {makerService?.views_count}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[#C81E4B]">
                      <Heart className="w-3.5 h-3.5 fill-[#C81E4B]" />
                      좋아요: {makerService?.likes_count}
                    </span>
                  </div>
                </div>

                {/* Sub tabs */}
                <div className="flex items-center gap-2 border-b-2 border-[#0A0A0A] pb-2">
                  <button
                    onClick={() => setMakerTab('edit')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border-2 border-[#0A0A0A] transition-all ${
                      makerTab === 'edit' ? 'bg-[#FFD23F] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]'
                    }`}
                  >
                    사이트 전체 정보 & 태그 수정
                  </button>
                  <button
                    onClick={() => setMakerTab('post')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border-2 border-[#0A0A0A] transition-all ${
                      makerTab === 'post' ? 'bg-[#FFD23F] text-[#0A0A0A]' : 'bg-white text-[#0A0A0A]'
                    }`}
                  >
                    제작자 공지 작성
                  </button>
                </div>

                {makerSuccess && (
                  <div className="p-2.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-[1px_1px_0_#0A0A0A]">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{makerSuccess}</span>
                  </div>
                )}

                {makerTab === 'edit' ? (
                  <form onSubmit={handleMakerSave} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0A0A0A]">
                          서비스명 (사이트명) <span className="text-[#C81E4B]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={80}
                          placeholder="예: 던전 크롤러: 포션 마스터"
                          className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0A0A0A]">
                          접속 주소(URL) <span className="text-[#C81E4B]">*</span>
                        </label>
                        <input
                          type="url"
                          required
                          value={makerUrl}
                          onChange={(e) => setMakerUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0A0A0A]">대표 분야 (카테고리) *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={makerCategory}
                          onChange={(e) => setMakerCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none font-bold"
                        >
                          {adminCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="__custom__">➕ [새 카테고리 직접 입력]</option>
                        </select>
                        {makerCategory === '__custom__' && (
                          <input
                            type="text"
                            required
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="변경할 카테고리명"
                            className="w-full px-3 py-2 text-xs bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-lg font-bold"
                          />
                        )}
                      </div>
                    </div>

                    {/* Tags Management (Requirement: Full tag editability for maker) */}
                    <div className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-2.5 shadow-[2px_2px_0_#0A0A0A]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#0A0A0A] flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#0A0A0A]" />
                          <span>주요 기능 태그 (1~5개) *</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-[#52525B]">
                          {makerTags.length}/5개 선택됨
                        </span>
                      </div>

                      {/* Current Tags Chips */}
                      <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-white border border-[#0A0A0A] rounded-lg">
                        {makerTags.length === 0 ? (
                          <span className="text-[11px] text-neutral-400 py-0.5">선택된 태그가 없습니다. 아래에서 추천 태그를 누르거나 직접 입력하세요.</span>
                        ) : (
                          makerTags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#FFD23F] text-[#0A0A0A] border border-[#0A0A0A] rounded shadow-[1px_1px_0_#0A0A0A]"
                            >
                              #{t}
                              <button
                                type="button"
                                onClick={() => handleRemoveMakerTag(t)}
                                className="hover:text-red-700 ml-0.5"
                                title="태그 삭제"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Add Tag Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={makerTagInput}
                          onChange={(e) => setMakerTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMakerTag();
                            }
                          }}
                          placeholder="태그 직접 입력 후 [추가] 또는 Enter (예: AI챗, 대시보드)"
                          maxLength={20}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#0A0A0A] rounded-lg focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMakerTag()}
                          disabled={!makerTagInput.trim() || makerTags.length >= 5}
                          className="px-3 py-1.5 bg-[#06D6A0] hover:bg-[#06D6A0]/85 disabled:opacity-40 border border-[#0A0A0A] rounded-lg text-xs font-bold shadow-[1px_1px_0_#0A0A0A]"
                        >
                          + 태그 추가
                        </button>
                      </div>

                      {/* Recommended 14 Priority Tags Chips */}
                      <div className="pt-1.5 border-t border-neutral-200">
                        <span className="text-[11px] font-bold text-[#52525B] block mb-1">
                          ⚡ 추천 우선 태그 (클릭 시 즉시 추가):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {MAKER_PRIORITY_TAGS.map((tag) => {
                            const isIncluded = makerTags.includes(tag);
                            return (
                              <button
                                key={`maker-rec-tag-${tag}`}
                                type="button"
                                disabled={isIncluded || makerTags.length >= 5}
                                onClick={() => handleAddMakerTag(tag)}
                                className={`px-2 py-0.5 text-[11px] rounded border font-medium transition-all ${
                                  isIncluded
                                    ? 'bg-[#FF6B9E] text-[#0A0A0A] font-bold border-[#0A0A0A] opacity-60'
                                    : 'bg-white hover:bg-[#FFF3C4] text-[#0A0A0A] border-neutral-300 hover:border-[#0A0A0A]'
                                }`}
                              >
                                {isIncluded ? `✓ #${tag}` : `+ #${tag}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Short Desc & Description */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0A0A0A]">한 줄 소개 (카드 노출 문구) *</label>
                      <input
                        type="text"
                        required
                        value={shortDesc}
                        onChange={(e) => setShortDesc(e.target.value)}
                        maxLength={150}
                        placeholder="카드에 표시될 매력적인 한 줄 소개 (1~150자)"
                        className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0A0A0A]">상세 설명 *</label>
                      <textarea
                        rows={3}
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="서비스의 주요 기능, 사용 방법, 제작 배경 등 상세 소개"
                        className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                      />
                    </div>

                    {/* Image URLs (Compact 16:10 Preview, No Presets) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          value={makerScreenshotUrl}
                          onChange={(e) => setMakerScreenshotUrl(e.target.value)}
                          placeholder="https://... (상세 팝업용 스크린샷 주소)"
                          className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                        />
                        {makerScreenshotUrl && (
                          <div className="mt-1.5 flex items-center gap-2.5 p-2 bg-[#FAFAF5] border border-[#0A0A0A] rounded-lg">
                            <div className="w-24 sm:w-28 aspect-[16/10] rounded overflow-hidden border border-[#0A0A0A] bg-[#F1F0E8] shrink-0 shadow-[1px_1px_0_#0A0A0A]">
                              <img
                                src={makerScreenshotUrl}
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

                    {/* Maker Nickname & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0A0A0A]">제작자 / 팀 닉네임 (선택)</label>
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
                        <label className="text-xs font-bold text-[#0A0A0A]">제작자 연락처 이메일 (선택, 비공개)</label>
                        <input
                          type="email"
                          value={makerEmail}
                          onChange={(e) => setMakerEmail(e.target.value)}
                          placeholder="maker@example.com (운영 문의 및 공지용)"
                          className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                      <span className="text-[11px] text-[#52525B]">
                        * 저장 즉시 메인 피드와 상세 모달의 태그, 카테고리, 썸네일 등이 갱신됩니다.
                      </span>
                      <button
                        type="submit"
                        className="px-6 py-2.5 text-xs font-black text-[#0A0A0A] bg-[#FFD23F] hover:bg-[#FFD23F]/85 border-2 border-[#0A0A0A] rounded-xl shadow-[3px_3px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>수정 내용 저장</span>
                      </button>
                    </div>

                    {/* Requirement 9: Danger zone for site deletion */}
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 mt-6">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                            <Trash2 className="w-4 h-4 text-rose-600" />
                            <span>사이트 영구 삭제 및 게재 철회</span>
                          </h4>
                          <p className="text-[11px] text-[#52525B]">
                            등록된 사이트와 모든 후기, 북마크, 태그 연결을 영구적으로 삭제합니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleMakerDelete}
                          className="px-3.5 py-1.5 bg-[#C81E4B] hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5"
                        >
                          사이트 영구 삭제
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleMakerPost} className="space-y-3">
                    {/* Draft Restored Banner */}
                    {hasRestoredPostDraft && (
                      <div className="p-2.5 bg-amber-50 border-2 border-amber-300 rounded-lg flex items-center justify-between text-xs text-[#0A0A0A]">
                        <span>💾 작성 중이던 공지 글이 자동 복원되었습니다.</span>
                        <button
                          type="button"
                          onClick={handleClearPostDraft}
                          className="px-2 py-0.5 bg-white border border-[#0A0A0A] rounded font-bold hover:bg-neutral-100"
                        >
                          초기화
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#0A0A0A]">구분</label>
                        <select
                          value={postType}
                          onChange={(e) => setPostType(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                        >
                          <option value="notice">공지사항</option>
                          <option value="update">업데이트</option>
                          <option value="devlog">개발일지</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-[#0A0A0A]">제목</label>
                        <input
                          type="text"
                          required
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          placeholder="새 업데이트 안내"
                          className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#0A0A0A]">내용</label>
                      <textarea
                        rows={4}
                        required
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="공지 내용을 작성해주세요. (브라우저에 임시 저장됩니다)"
                        className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-[#0A0A0A] bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 active:translate-y-0.5"
                      >
                        공지 발행하기
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )
          ) : (
            /* Admin Area */
            !adminToken ? (
              <form onSubmit={handleAdminAuth} className="max-w-md mx-auto py-8 space-y-4">
                <div className="text-center space-y-1 mb-4">
                  <h3 className="font-display text-xl text-[#0A0A0A]">운영자 관리 센터</h3>
                  <p className="text-xs text-[#52525B]">운영 비밀번호를 입력해주세요.</p>
                </div>

                {adminError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 text-[#C81E4B] text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                <input
                  type="password"
                  required
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="운영자 관리 코드를 입력하세요"
                  className="w-full px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg text-center font-mono focus:outline-none"
                />

                <div className="space-y-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 text-xs font-bold text-white bg-[#0A0A0A] rounded-lg shadow-[2px_2px_0_#FFD23F] hover:bg-neutral-800"
                  >
                    관리 화면 열기
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">

                {/* AD & Commercial Mode Toggle Banner (Friend Mode) */}
                <div className="p-3.5 bg-white border-2 border-[#0A0A0A] rounded-xl flex items-center justify-between gap-3 shadow-[3px_3px_0_#0A0A0A]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-[#0A0A0A] flex items-center gap-1.5">
                        <span>📢 AD · 스폰서십 노출 모드 설정</span>
                      </strong>
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded border border-[#0A0A0A] ${
                        currentShowAds ? 'bg-[#FFD23F] text-[#0A0A0A]' : 'bg-[#06D6A0] text-[#0A0A0A]'
                      }`}>
                        {currentShowAds ? 'ON (상업/광고 모드)' : 'OFF (친구/클린 모드)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#52525B]">
                      {currentShowAds
                        ? '하단 플로팅 AD 배너 및 서비스 카드의 스폰서 뱃지가 방문자들에게 노출 중입니다.'
                        : '친구들과 쾌적하게 쓸 수 있도록 모든 AD 배너, 스폰서십 문의, 스폰서 뱃지를 숨겼습니다.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAdsMode}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg border-2 border-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 transition-all shrink-0 ${
                      currentShowAds
                        ? 'bg-[#FF6B9E] text-[#0A0A0A] hover:bg-[#FF6B9E]/85'
                        : 'bg-[#06D6A0] text-[#0A0A0A] hover:bg-[#06D6A0]/85'
                    }`}
                  >
                    {currentShowAds ? 'OFF로 끄기 (친구 모드)' : 'ON으로 켜기 (광고 모드)'}
                  </button>
                </div>

                {adminMsg && (
                  <div className="p-2.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>{adminMsg}</span>
                  </div>
                )}

                {/* Admin Subtabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b-2 border-[#0A0A0A] text-xs font-bold">
                  {[
                    { key: 'stats', label: '📊 운영 통계' },
                    { key: 'services', label: `서비스 관리 & 내용 수정 (${services.length})` },
                    { key: 'categories', label: `📂 분야(카테고리) 관리 (${adminCategories.length})` },
                    { key: 'tags', label: `태그 관리 & 심사 (${pendingTags.length ? `대기 ${pendingTags.length}개` : tags.length})` },
                    { key: 'reports', label: `보안 & 철회 신고 (${reports.filter((r) => r.status === 'pending').length})` },
                    { key: 'slogan', label: '브라우저 탭 & 슬로건' },
                    { key: 'curations', label: `이번 주 큐레이션 (${curations.length})` },
                    { key: 'promotions', label: `유료 추천 노출 (${promotions.length})` },
                    { key: 'backup', label: '💾 데이터 백업 & 복원' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setAdminTab(t.key as any)}
                      className={`px-3 py-1.5 rounded-lg border-2 border-[#0A0A0A] whitespace-nowrap transition-all ${
                        adminTab === t.key
                          ? 'bg-[#FFD23F] text-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A]'
                          : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Slogan & Browser Tab Title Management Tab */}
                {adminTab === 'slogan' && (
                  <div className="space-y-4">
                    {/* 1. Browser Tab Title Setting (Requirement: Dynamic tab text change without editing HTML) */}
                    <div className="p-4 bg-white border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[2px_2px_0_#0A0A0A]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#06D6A0] text-[#0A0A0A] border border-[#0A0A0A] text-[10px] font-black rounded">
                            실시간 연동
                          </span>
                          <h4 className="font-display text-base text-[#0A0A0A]">
                            브라우저 탭 텍스트 (사이트 타이틀) 변경
                          </h4>
                        </div>
                        <p className="text-xs text-[#52525B]">
                          HTML 코드를 매번 고치지 않아도 여기서 변경하면 모든 사용자의 브라우저 상단 탭 텍스트가 즉시 변경됩니다.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#0A0A0A]">현재 탭 타이틀 (최대 120자)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={currentSiteTitle}
                            onChange={(e) => setCurrentSiteTitle(e.target.value)}
                            placeholder="예: 바이브덤프 - 인터넷은 아직 재밌다"
                            maxLength={120}
                            className="flex-1 px-3 py-2 text-xs bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveSiteTitle()}
                            className="px-4 py-2 bg-[#06D6A0] border-2 border-[#0A0A0A] rounded-lg font-bold text-xs shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5"
                          >
                            탭 타이틀 저장
                          </button>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="space-y-1.5 pt-2 border-t border-neutral-200">
                        <span className="text-[11px] font-bold text-[#52525B]">추천 타이틀 프리셋 (클릭 시 즉시 적용):</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[
                            '바이브덤프 - 인터넷은 아직 재밌다',
                            '바이브덤프 | 바이브 코딩 웹서비스 발견 & 아카이브',
                            'VibeDump - 새로운 인터넷 서비스 찍먹하기',
                            '바이브덤프 - 세상의 모든 바이브 코딩 프로젝트',
                          ].map((preset, idx) => (
                            <button
                              key={`title-preset-${idx}`}
                              onClick={() => {
                                setCurrentSiteTitle(preset);
                                handleSaveSiteTitle(preset);
                              }}
                              className="px-2.5 py-1 text-xs rounded border border-[#0A0A0A] font-medium bg-[#FAFAF5] hover:bg-[#FFD23F] text-[#0A0A0A] transition-colors"
                            >
                              "{preset}"
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 2. Slogan Setting */}
                    <div className="p-4 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-4 shadow-[2px_2px_0_#0A0A0A]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
                          <h4 className="font-display text-base text-[#0A0A0A]">
                            사이트 메인 문구 (슬로건) 실시간 변경 & 이력 관리
                          </h4>
                        </div>
                        <p className="text-xs text-[#52525B]">
                          사이드바와 모바일 상단에 표시되는 대표 소개 문구를 자유롭게 설정할 수 있으며, 이전에 작성한 문구 이력이 자동 보존됩니다.
                        </p>
                      </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#0A0A0A]">현재 표시 문구 입력 (최대 150자)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentSlogan}
                          onChange={(e) => setCurrentSlogan(e.target.value)}
                          placeholder="예: 웹이라는 게 숨긴다고 숨겨지는 것도 아니고"
                          maxLength={150}
                          className="flex-1 px-3 py-2 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveSlogan()}
                          className="px-4 py-2 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg font-bold text-xs shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5"
                        >
                          문구 저장
                        </button>
                      </div>
                    </div>

                    {/* Slogan History (Requirement 1) */}
                    {sloganHistory.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-neutral-200">
                        <span className="text-[11px] font-bold text-[#52525B]">
                          🕒 문구 변경 이력 (클릭 시 즉시 선택 적용):
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {sloganHistory.map((h, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setCurrentSlogan(h);
                                handleSaveSlogan(h);
                              }}
                              className={`px-2.5 py-1 text-xs rounded border border-[#0A0A0A] font-medium transition-all ${
                                currentSlogan === h
                                  ? 'bg-[#FF6B9E] text-[#0A0A0A] font-bold shadow-[1px_1px_0_#0A0A0A]'
                                  : 'bg-white hover:bg-[#FFF3C4] text-[#0A0A0A]'
                              }`}
                            >
                              "{h}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preset Buttons */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-200">
                      <span className="text-[11px] font-bold text-[#52525B]">추천 프리셋:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sloganPresets.map((preset, idx) => (
                          <button
                            key={`preset-${idx}-${preset}`}
                            onClick={() => {
                              setCurrentSlogan(preset);
                              handleSaveSlogan(preset);
                            }}
                            className="px-2.5 py-1 text-xs rounded border border-[#0A0A0A] font-medium bg-white hover:bg-[#FFF3C4] text-[#0A0A0A]"
                          >
                            "{preset}"
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Security: Change Admin Password */}
                  <div className="p-4 bg-white border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[2px_2px_0_#0A0A0A]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#C81E4B]" />
                        <h4 className="font-display text-base text-[#0A0A0A]">
                          운영자 관리 비밀번호 변경 (보안 강화)
                        </h4>
                      </div>
                      <p className="text-xs text-[#52525B]">
                        기본 개발용 비밀번호 대신 본인만 아는 안전한 비밀번호로 변경할 수 있습니다. 변경 즉시 새로운 비밀번호로 인증됩니다.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#0A0A0A]">새 운영 비밀번호 입력 (최소 6자)</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="새로운 비밀번호를 입력하세요 (6자리 이상)"
                          className="flex-1 px-3 py-2 text-xs bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg font-mono focus:outline-none"
                        />
                        <button
                          onClick={handleChangeAdminPassword}
                          className="px-4 py-2 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded-lg font-bold text-xs shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5"
                        >
                          비밀번호 변경
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Category Management Tab */}
                {adminTab === 'categories' && (
                  <div className="space-y-4">
                    {/* Description banner */}
                    <div className="p-3.5 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl text-xs space-y-1 shadow-[2px_2px_0_#0A0A0A]">
                      <b className="text-[#0A0A0A] flex items-center gap-1.5">
                        <FolderKanban className="w-4 h-4 text-[#0A0A0A]" />
                        <span>분야(카테고리) 마스터 관리</span>
                      </b>
                      <p className="text-[#52525B] leading-relaxed">
                        메인 화면 상단 카테고리 필터와 사이트 등록 모달에 노출되는 대표 분야 목록입니다.
                        순서 변경(▲/▼), 이름 수정(연결된 사이트 자동 변경), 새 분야 추가, 삭제를 자유롭게 관리할 수 있습니다.
                      </p>
                    </div>

                    {/* Add new category form */}
                    <form onSubmit={handleAddCategory} className="p-3 bg-white border-2 border-[#0A0A0A] rounded-xl flex items-center gap-2 shadow-[2px_2px_0_#0A0A0A] flex-wrap">
                      <input
                        type="text"
                        required
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="새로 추가할 분야명 입력 (예: 캐릭터소셜, 체크리스트)"
                        className="flex-1 min-w-[200px] px-3 py-2 text-xs bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#06D6A0] hover:bg-[#06D6A0]/85 border-2 border-[#0A0A0A] rounded-lg text-xs font-bold shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>분야 추가</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDefaultCategories}
                        className="px-3 py-2 bg-white hover:bg-neutral-100 border-2 border-[#0A0A0A] rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                        title="기본 12개 카테고리로 초기화"
                      >
                        <RotateCw className="w-3 h-3 text-[#52525B]" />
                        <span>기본 12종 리셋</span>
                      </button>
                    </form>

                    {/* Categories list */}
                    <div className="bg-white border-2 border-[#0A0A0A] rounded-xl divide-y-2 divide-neutral-200 overflow-hidden shadow-[2px_2px_0_#0A0A0A]">
                      <div className="p-2.5 bg-[#F1F0E8] flex items-center justify-between text-xs font-bold text-[#0A0A0A]">
                        <span>분야 순번 및 명칭 (총 {adminCategories.length}개)</span>
                        <span className="text-[11px] text-[#52525B]">우측 버튼으로 순서 이동 및 수정</span>
                      </div>

                      <div className="divide-y divide-neutral-100 max-h-[420px] overflow-y-auto">
                        {adminCategories.map((cat, idx) => {
                          const serviceCount = services.filter((s) => s.category === cat).length;
                          const isEditing = editingCatIndex === idx;

                          return (
                            <div
                              key={`admin-cat-${cat}-${idx}`}
                              className="p-3 flex items-center justify-between gap-2 hover:bg-[#FAFAF5] transition-colors"
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <span className="w-6 h-6 rounded-full bg-[#0A0A0A] text-white flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                                  {idx + 1}
                                </span>

                                {isEditing ? (
                                  <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                                    <input
                                      type="text"
                                      value={editingCatValue}
                                      onChange={(e) => setEditingCatValue(e.target.value)}
                                      className="px-2.5 py-1 text-xs bg-white border-2 border-[#0A0A0A] rounded font-bold focus:outline-none flex-1"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveRenameCategory(cat)}
                                      className="px-2.5 py-1 bg-[#06D6A0] border border-[#0A0A0A] rounded text-xs font-bold whitespace-nowrap"
                                    >
                                      저장
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCatIndex(null)}
                                      className="px-2 py-1 bg-white border border-[#0A0A0A] rounded text-xs font-bold whitespace-nowrap"
                                    >
                                      취소
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="font-bold text-xs text-[#0A0A0A]">{cat}</span>
                                    <span className="px-1.5 py-0.5 bg-[#FAFAF5] border border-neutral-300 rounded text-[10px] text-[#52525B] font-mono">
                                      등록 {serviceCount}개
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveCategory(idx, 'up')}
                                  className="p-1.5 bg-white border border-[#0A0A0A] rounded hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
                                  title="위로 이동"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === adminCategories.length - 1}
                                  onClick={() => handleMoveCategory(idx, 'down')}
                                  className="p-1.5 bg-white border border-[#0A0A0A] rounded hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none"
                                  title="아래로 이동"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartRenameCategory(idx, cat)}
                                    className="px-2 py-1 bg-[#FFD23F] hover:bg-[#FFD23F]/85 border border-[#0A0A0A] rounded text-xs font-bold"
                                  >
                                    이름수정
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="px-2 py-1 bg-[#FF6B9E] hover:bg-[#FF6B9E]/85 border border-[#0A0A0A] rounded text-xs font-bold text-[#0A0A0A]"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Requirement 3: Tag Management and Proposal Review */}
                {adminTab === 'tags' && (
                  <div className="space-y-5">
                    <div className="p-3.5 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl text-xs space-y-1 shadow-[2px_2px_0_#0A0A0A]">
                      <b className="text-[#0A0A0A] block">📌 [새 태그 제안 심사 안내]</b>
                      <p className="text-[#52525B] leading-relaxed">
                        사용자가 메인 [덤프 태그 디렉토리]에서 제안한 태그는 자동 승인되지 않고 이곳 <strong>'심사 대기 태그'</strong>로 수집됩니다.
                        [공개 승인] 버튼을 누르면 정식 태그로 전환되어 전체 사이트 탐색에 노출됩니다.
                      </p>
                    </div>

                    <div className="p-4 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[2px_2px_0_#0A0A0A]">
                      <div className="flex items-center justify-between">
                        <h4 className="font-display text-sm text-[#0A0A0A] flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-[#C81E4B]" />
                          <span>심사 대기 태그 ({pendingTags.length}개)</span>
                        </h4>
                        <span className="text-[11px] text-[#52525B] font-bold">
                          승인 즉시 공개 피드 태그에 반영됩니다
                        </span>
                      </div>

                      {pendingTags.length === 0 ? (
                        <p className="text-xs text-[#52525B] py-3 text-center font-bold">
                          현재 대기 중인 신규 태그 제안이 없습니다. 상단의 [테스트 데이터 채우기]로 샘플 태그를 장전할 수 있습니다.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {pendingTags.map((t, idx) => (
                            <div
                              key={`pending-tag-${t.id || idx}-${t.name}`}
                              className="p-2.5 bg-white border-2 border-[#0A0A0A] rounded-lg flex items-center justify-between shadow-[1px_1px_0_#0A0A0A]"
                            >
                              <div>
                                <span className="font-bold text-xs text-[#0A0A0A]">#{t.name}</span>
                                <span className="text-[10px] text-[#C81E4B] block font-bold">심사 대기</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleApproveTag(t.id)}
                                  className="px-2 py-1 bg-[#06D6A0] hover:bg-[#06D6A0]/80 text-[#0A0A0A] border border-[#0A0A0A] rounded text-[11px] font-bold"
                                >
                                  승인
                                </button>
                                <button
                                  onClick={() => handleRejectTag(t.id)}
                                  className="px-2 py-1 bg-[#FF6B9E] hover:bg-[#FF6B9E]/80 text-[#0A0A0A] border border-[#0A0A0A] rounded text-[11px] font-bold"
                                >
                                  반려
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tag Merge */}
                    <div className="p-4 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[2px_2px_0_#0A0A0A]">
                      <b className="text-xs text-[#0A0A0A] block">중복 태그 병합</b>
                      <form onSubmit={handleMergeTags} className="flex items-center gap-2 flex-wrap">
                        <select
                          value={mergeSource}
                          onChange={(e) => setMergeSource(e.target.value ? Number(e.target.value) : '')}
                          className="px-2 py-1.5 bg-white border-2 border-[#0A0A0A] rounded text-xs font-bold"
                        >
                          <option value="">삭제 대상 태그</option>
                          {tags.map((t, idx) => (
                            <option key={`source-tag-${t.id || idx}-${t.name}`} value={t.id}>
                              #{t.name}
                            </option>
                          ))}
                        </select>
                        <span>➔</span>
                        <select
                          value={mergeTarget}
                          onChange={(e) => setMergeTarget(e.target.value ? Number(e.target.value) : '')}
                          className="px-2 py-1.5 bg-white border-2 border-[#0A0A0A] rounded text-xs font-bold"
                        >
                          <option value="">통합될 기준 태그</option>
                          {tags.map((t, idx) => (
                            <option key={`target-tag-${t.id || idx}-${t.name}`} value={t.id}>
                              #{t.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded font-bold text-xs shadow-[1px_1px_0_#0A0A0A]"
                        >
                          병합 실행
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Services Review & Direct Card Editing Tab */}
                {adminTab === 'services' && (
                  <div className="space-y-4">
                    {/* Inline Editor if a service is being edited */}
                    {editingService && (
                      <div className="p-4 bg-[#FFF8D6] border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[4px_4px_0_#0A0A0A] mb-5">
                        <div className="flex items-center justify-between border-b-2 border-[#0A0A0A] pb-2">
                          <div className="flex items-center gap-2">
                            <Edit className="w-4 h-4 text-[#0A0A0A]" />
                            <h4 className="font-display text-sm text-[#0A0A0A]">
                              사이트 카드 내용 수정 (ID #{editingService.id}: {editingService.name})
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingService(null)}
                            className="px-2.5 py-1 bg-white border border-[#0A0A0A] rounded text-xs font-bold hover:bg-neutral-100"
                          >
                            수정 취소
                          </button>
                        </div>

                        <form onSubmit={handleSaveEditService} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#0A0A0A]">서비스명 *</label>
                              <input
                                type="text"
                                required
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#0A0A0A]">접속 주소 (URL) *</label>
                              <input
                                type="url"
                                required
                                value={editForm.url}
                                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#0A0A0A]">카테고리 *</label>
                              <select
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                              >
                                {adminCategories.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="__custom__">➕ [직접 입력]</option>
                              </select>
                              {editForm.category === '__custom__' && (
                                <input
                                  type="text"
                                  required
                                  placeholder="새 카테고리명"
                                  value={editForm.customCategory}
                                  onChange={(e) => setEditForm({ ...editForm, customCategory: e.target.value })}
                                  className="w-full mt-1 px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                                />
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#0A0A0A]">공개 상태</label>
                              <select
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg font-bold focus:outline-none"
                              >
                                <option value="approved">공개 중 (승인됨)</option>
                                <option value="pending">심사 대기</option>
                                <option value="hidden">비공개(숨김)</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#0A0A0A]">제작자 닉네임</label>
                              <input
                                type="text"
                                value={editForm.maker_name}
                                onChange={(e) => setEditForm({ ...editForm, maker_name: e.target.value })}
                                placeholder="제작자명"
                                className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-[#0A0A0A]">한 줄 소개 (카드에 노출되는 문구) *</label>
                            <input
                              type="text"
                              required
                              value={editForm.short_desc}
                              onChange={(e) => setEditForm({ ...editForm, short_desc: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none font-medium"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-[#0A0A0A]">상세 설명</label>
                            <textarea
                              rows={3}
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="서비스 상세 소개 및 특징"
                              className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#0A0A0A]">대표 이미지(썸네일) URL</label>
                              <input
                                type="url"
                                value={editForm.thumbnail_url}
                                onChange={(e) => setEditForm({ ...editForm, thumbnail_url: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#0A0A0A]">스크린샷 이미지 URL</label>
                              <input
                                type="url"
                                value={editForm.screenshot_url}
                                onChange={(e) => setEditForm({ ...editForm, screenshot_url: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-[#0A0A0A]">연결 태그 (쉼표로 구분)</label>
                            <input
                              type="text"
                              value={editForm.tags}
                              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                              placeholder="예: AI, 자동화, 웹앱, 생산성"
                              className="w-full px-3 py-1.5 text-xs bg-white border-2 border-[#0A0A0A] rounded-lg focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingService(null)}
                              className="px-4 py-2 bg-white border-2 border-[#0A0A0A] rounded-lg text-xs font-bold hover:bg-[#F1F0E8]"
                            >
                              취소
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingEdit}
                              className="px-5 py-2 bg-[#06D6A0] hover:bg-[#06D6A0]/85 border-2 border-[#0A0A0A] rounded-lg text-xs font-bold shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 flex items-center gap-1.5"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{isSavingEdit ? '저장 중...' : '수정 내용 저장'}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#0A0A0A]">
                        <thead className="bg-[#F1F0E8] border-b-2 border-[#0A0A0A] font-bold">
                          <tr>
                            <th className="p-2">ID</th>
                            <th className="p-2">서비스명</th>
                            <th className="p-2">한 줄 소개</th>
                            <th className="p-2">카테고리</th>
                            <th className="p-2">상태</th>
                            <th className="p-2 text-right">조치</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {services.map((s, idx) => (
                            <tr key={`service-row-${s.id || idx}`} className="hover:bg-[#FAFAF5]">
                              <td className="p-2 font-mono">#{s.id}</td>
                              <td className="p-2 font-bold max-w-[140px] truncate" title={s.name}>
                                {s.name}
                              </td>
                              <td className="p-2 max-w-[200px] truncate text-[#52525B]" title={s.short_desc}>
                                {s.short_desc}
                              </td>
                              <td className="p-2">
                                <span className="px-2 py-0.5 bg-[#FFF3C4] border border-[#0A0A0A] rounded text-[11px] font-bold">
                                  {s.category}
                                </span>
                              </td>
                              <td className="p-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded border border-[#0A0A0A] text-[10px] font-bold ${
                                    s.status === 'approved'
                                      ? 'bg-[#06D6A0]'
                                      : s.status === 'pending'
                                      ? 'bg-[#FFD23F]'
                                      : 'bg-neutral-200'
                                  }`}
                                >
                                  {s.status === 'approved' ? '공개 중' : s.status === 'pending' ? '심사 대기' : '비공개'}
                                </span>
                              </td>
                              <td className="p-2 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => handleStartEditService(s)}
                                  className="px-2 py-0.5 bg-[#FFD23F] hover:bg-[#FFD23F]/80 border border-[#0A0A0A] rounded font-bold text-xs"
                                  title="사이트 카드 내용 직접 수정"
                                >
                                  수정
                                </button>
                                {s.status !== 'approved' && (
                                  <button
                                    onClick={() => handleServiceStatus(s.id, 'approved')}
                                    className="px-2 py-0.5 bg-[#06D6A0] border border-[#0A0A0A] rounded font-bold text-xs"
                                  >
                                    승인
                                  </button>
                                )}
                                {s.status !== 'hidden' && (
                                  <button
                                    onClick={() => handleServiceStatus(s.id, 'hidden')}
                                    className="px-2 py-0.5 bg-neutral-200 border border-[#0A0A0A] rounded font-bold text-xs"
                                  >
                                    숨김
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteService(s.id)}
                                  className="px-2 py-0.5 bg-[#FF6B9E] border border-[#0A0A0A] rounded font-bold text-xs"
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Requirement 2: Reports Tab with Rights Takedown Highlight */}
                {adminTab === 'reports' && (
                  <div className="space-y-3">
                    {reports.length === 0 ? (
                      <p className="text-xs text-[#52525B] text-center py-6 font-bold">
                        접수된 신고 및 게재 철회 요청이 없어요.
                      </p>
                    ) : (
                      reports.map((r, idx) => {
                        const isTakedown =
                          r.reason.includes('권리침해') ||
                          r.reason.includes('게재철회') ||
                          r.reason.includes('권리자') ||
                          r.reason.includes('원작자');

                        return (
                          <div
                            key={`admin-report-${r.id || idx}`}
                            className={`p-3.5 border-2 border-[#0A0A0A] rounded-xl text-xs space-y-2 shadow-[2px_2px_0_#0A0A0A] ${
                              isTakedown ? 'bg-rose-50 border-rose-600' : 'bg-[#FAFAF5]'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold flex-wrap gap-1">
                              <div className="flex items-center gap-1.5">
                                {isTakedown ? (
                                  <span className="bg-[#C81E4B] text-white px-2 py-0.5 rounded font-black text-[10px]">
                                    🚨 권리자 게재 철회 요청
                                  </span>
                                ) : (
                                  <span className="bg-[#0A0A0A] text-[#FFD23F] px-1.5 py-0.5 rounded text-[10px]">
                                    일반 신고
                                  </span>
                                )}
                                <span className="text-[#0A0A0A]">{r.reason}</span>
                                <span className="font-mono text-[#52525B]">
                                  대상 #{r.target_id} ({r.target_type})
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded border border-[#0A0A0A] text-[10px] font-bold ${
                                  r.status === 'pending'
                                    ? 'bg-[#FFD23F] text-[#0A0A0A]'
                                    : r.status === 'resolved'
                                    ? 'bg-[#06D6A0] text-[#0A0A0A]'
                                    : 'bg-neutral-200'
                                }`}
                              >
                                {r.status === 'pending' ? '미처리' : r.status === 'resolved' ? '처리 완료' : '반려'}
                              </span>
                            </div>

                            {r.details && (
                              <div className="p-2 bg-white border border-[#0A0A0A] rounded text-xs text-[#0A0A0A] whitespace-pre-line font-medium">
                                {r.details}
                              </div>
                            )}

                            {r.status === 'pending' && (
                              <div className="flex items-center justify-between pt-1 border-t border-neutral-200 flex-wrap gap-2">
                                <span className="text-[11px] text-[#52525B]">
                                  {isTakedown ? '권리자 요청 확인 시 즉시 비공개 처리 후, 1주 후 데이터 영구 삭제를 진행하세요.' : '신고 검토 후 처리 상태를 변경하세요.'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {r.target_type === 'service' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          handleServiceStatus(r.target_id, 'hidden');
                                          handleResolveReport(r.id, 'resolved');
                                        }}
                                        className="px-2.5 py-1 bg-neutral-200 hover:bg-neutral-300 border border-[#0A0A0A] rounded font-bold text-xs"
                                      >
                                        사이트 비공개 전환
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleDeleteService(r.target_id);
                                          handleResolveReport(r.id, 'resolved');
                                        }}
                                        className="px-2.5 py-1 bg-[#C81E4B] text-white border border-[#0A0A0A] rounded font-bold text-xs"
                                      >
                                        사이트 즉시 삭제
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleResolveReport(r.id, 'resolved')}
                                    className="px-2.5 py-1 bg-[#06D6A0] border border-[#0A0A0A] rounded font-bold text-xs"
                                  >
                                    조치 완료
                                  </button>
                                  <button
                                    onClick={() => handleResolveReport(r.id, 'dismissed')}
                                    className="px-2.5 py-1 bg-white border border-[#0A0A0A] rounded font-bold text-xs"
                                  >
                                    기각
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Admin Tab: Stats & Test Fields */}
                {adminTab === 'stats' && stats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl shadow-[2px_2px_0_#0A0A0A]">
                        <span className="text-xs text-[#52525B] font-bold block">전체 등록</span>
                        <b className="font-display text-2xl text-[#0A0A0A]">{stats.total_services}</b>
                        <span className="text-[11px] text-[#0F7B5F] block font-bold">{stats.approved_services}개 공개 중</span>
                      </div>
                      <div className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl shadow-[2px_2px_0_#0A0A0A]">
                        <span className="text-xs text-[#52525B] font-bold block">대기 중인 신고</span>
                        <b className="font-display text-2xl text-[#C81E4B]">{stats.pending_reports}</b>
                        <span className="text-[11px] text-[#52525B] block font-bold">검토 필요</span>
                      </div>
                      <div className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl shadow-[2px_2px_0_#0A0A0A]">
                        <span className="text-xs text-[#52525B] font-bold block">누적 반응</span>
                        <b className="font-display text-2xl text-[#1F5FD1]">{stats.total_reactions}</b>
                        <span className="text-[11px] text-[#52525B] block font-bold">좋아요/반응</span>
                      </div>
                      <div className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-xl shadow-[2px_2px_0_#0A0A0A]">
                        <span className="text-xs text-[#52525B] font-bold block">추천 캠페인</span>
                        <b className="font-display text-2xl text-[#0F7B5F]">{stats.active_promotions}</b>
                        <span className="text-[11px] text-[#52525B] block font-bold">활성 노출 중</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Tab: Curations */}
                {adminTab === 'curations' && (
                  <div className="space-y-3">
                    <form onSubmit={handleCreateCuration} className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg text-xs space-y-2">
                      <b className="block">이번 주 큐레이션 추가</b>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          required
                          value={curServiceId}
                          onChange={(e) => setCurServiceId(e.target.value)}
                          className="px-2 py-1.5 bg-white border-2 border-[#0A0A0A] rounded text-xs"
                        >
                          <option value="">서비스 선택</option>
                          {services.map((s, idx) => (
                            <option key={`cur-svc-${s.id || idx}`} value={s.id}>
                              #{s.id} {s.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          value={curBadgeText}
                          onChange={(e) => setCurBadgeText(e.target.value)}
                          placeholder="배지 문구"
                          className="px-2 py-1.5 bg-white border-2 border-[#0A0A0A] rounded text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={curBlurb}
                          onChange={(e) => setCurBlurb(e.target.value)}
                          placeholder="선정 소개 문구"
                          className="px-2 py-1.5 bg-white border-2 border-[#0A0A0A] rounded text-xs"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" className="px-3 py-1.5 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded font-bold">
                          큐레이션 추가
                        </button>
                      </div>
                    </form>

                    <div className="space-y-1.5">
                      {curations.map((c, idx) => {
                        const curId = c.id || c.curation_id || idx;
                        return (
                          <div key={`curation-${curId}-${idx}`} className="p-2.5 bg-white border-2 border-[#0A0A0A] rounded-lg flex items-center justify-between text-xs font-bold">
                            <div>
                              <span className="text-[#1F5FD1]">[{c.badge_text}]</span> {c.name || (c as any).service_name}
                              <span className="text-[#52525B] font-normal block italic">"{c.editorial_blurb}"</span>
                            </div>
                            <button onClick={() => handleDeleteCuration(Number(curId))} className="p-1 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Requirement 8: Promotions Tab with 'floating_ad' */}
                {adminTab === 'promotions' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl text-xs space-y-1 shadow-[2px_2px_0_#0A0A0A]">
                      <b className="text-[#0A0A0A] block">📢 유료 홍보 상품 안내</b>
                      <p className="text-[#52525B] font-medium">
                        메인 상단 스폰서 노출, 큐레이션 최상단 고정 등 유료 홍보 상품은 <strong>현재 운영하지 않습니다.</strong> (아래 폼은 관리자 시스템 기능 검증용 자체 슬롯 테스트 도구입니다.)
                      </p>
                    </div>

                    <form onSubmit={handleCreatePromotion} className="p-3 bg-[#FAFAF5] border-2 border-[#0A0A0A] rounded-lg text-xs space-y-2">
                      <b className="block">유료 추천 노출 캠페인 생성</b>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          required
                          value={promoServiceId}
                          onChange={(e) => setPromoServiceId(e.target.value)}
                          className="px-2 py-1.5 bg-white border-2 border-[#0A0A0A] rounded text-xs"
                        >
                          <option value="">공개 서비스 선택</option>
                          {services.map((s, idx) => (
                            <option key={`promo-svc-${s.id || idx}`} value={s.id}>
                              #{s.id} {s.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={promoSlot}
                          onChange={(e) => setPromoSlot(e.target.value)}
                          className="px-2 py-1.5 bg-white border-2 border-[#0A0A0A] rounded text-xs font-bold"
                        >
                          <option value="floating_ad">하단 플로팅 광고 바</option>
                          <option value="feed_sponsor">목록 스폰서 카드</option>
                          <option value="main_hero">메인 추천 영역</option>
                          <option value="category_top">카테고리 상단</option>
                        </select>
                        <button type="submit" className="px-3 py-1.5 bg-[#FFD23F] border-2 border-[#0A0A0A] rounded font-bold">
                          캠페인 생성
                        </button>
                      </div>
                    </form>

                    <div className="space-y-1.5">
                      {promotions.map((p, idx) => {
                        const slotLabel =
                          p.slot_type === 'floating_ad'
                            ? '하단 플로팅 광고 바'
                            : p.slot_type === 'feed_sponsor'
                            ? '목록 스폰서 카드'
                            : p.slot_type === 'main_hero'
                            ? '메인 추천'
                            : '카테고리 상단';

                        return (
                          <div
                            key={`admin-promo-${p.id || idx}`}
                            className="p-2.5 bg-white border-2 border-[#0A0A0A] rounded-lg flex items-center justify-between text-xs font-bold"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="bg-[#FFD23F] px-1.5 py-0.5 rounded border border-[#0A0A0A] text-[10px] font-black">
                                {slotLabel}
                              </span>
                              <span>#{p.service_id} · 노출 {p.impressions} · 클릭 {p.clicks}</span>
                            </div>
                            <button
                              onClick={() => handleTogglePromotion(p.id, p.status === 'active' ? 'paused' : 'active')}
                              className="px-2 py-0.5 bg-[#F1F0E8] border border-[#0A0A0A] rounded"
                            >
                              {p.status === 'active' ? '중지' : '재개'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data Backup & Restore Tab */}
                {adminTab === 'backup' && (
                  <div className="space-y-5">
                    {/* Notice Banner */}
                    <div className="p-4 bg-[#FFF3C4] border-2 border-[#0A0A0A] rounded-xl space-y-2 shadow-[3px_3px_0_#0A0A0A]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#0A0A0A] text-[#FFD23F] rounded text-xs font-black">
                          클라우드 배포 주의 안내
                        </span>
                        <h4 className="font-display text-sm text-[#0A0A0A]">
                          재퍼블리싱(Re-publish) 시 데이터 보존 방법
                        </h4>
                      </div>
                      <p className="text-xs text-[#0A0A0A] leading-relaxed">
                        구글 클라우드(Cloud Run)는 <strong>새로운 코드를 재배포(Re-publish)</strong>할 때 새 컨테이너 이미지가 생성되므로 로컬 SQLite DB 파일이 초기화될 수 있습니다.<br />
                        재배포하시기 전에 아래 <strong>[전체 데이터 백업 다운로드]</strong>를 눌러 JSON 파일로 보관해 두시면, 재배포 완료 후 <strong>[백업 파일로 복원]</strong> 한 번으로 모든 서비스와 설정을 1초 만에 그대로 복구할 수 있습니다!
                      </p>
                    </div>

                    {/* 1. Backup Section */}
                    <div className="p-4 bg-white border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[2px_2px_0_#0A0A0A]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="font-display text-sm text-[#0A0A0A] flex items-center gap-1.5">
                            <Download className="w-4 h-4 text-[#06D6A0]" />
                            <span>1. 전체 데이터 백업 (JSON 파일 다운로드)</span>
                          </h4>
                          <p className="text-xs text-[#52525B]">
                            현재 등록된 모든 서비스({services.length}개), 승인된 태그({tags.length}개), 슬로건 및 탭 타이틀, 후기 데이터를 하나의 파일로 안전하게 백업합니다.
                          </p>
                        </div>
                        <button
                          onClick={handleExportBackup}
                          className="px-4 py-2.5 bg-[#FFD23F] hover:bg-[#FFD23F]/80 border-2 border-[#0A0A0A] rounded-lg font-bold text-xs shadow-[2px_2px_0_#0A0A0A] active:translate-x-0.5 flex items-center gap-1.5"
                        >
                          <Download className="w-4 h-4" />
                          <span>전체 데이터 백업 다운로드 (.json)</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Restore Section */}
                    <div className="p-4 bg-white border-2 border-[#0A0A0A] rounded-xl space-y-3 shadow-[2px_2px_0_#0A0A0A]">
                      <div>
                        <h4 className="font-display text-sm text-[#0A0A0A] flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-[#C81E4B]" />
                          <span>2. 백업 파일로 복원 (JSON 파일 가져오기)</span>
                        </h4>
                        <p className="text-xs text-[#52525B]">
                          이전에 다운로드해 둔 <code>vibedump-backup-*.json</code> 파일을 선택하면 데이터베이스에 즉시 복원합니다.
                        </p>
                      </div>

                      <div className="p-3 bg-[#FAFAF5] border-2 border-dashed border-[#0A0A0A] rounded-lg flex items-center justify-between gap-3 flex-wrap">
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleImportBackup}
                          className="text-xs font-bold text-[#0A0A0A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-2 file:border-[#0A0A0A] file:bg-[#06D6A0] file:text-xs file:font-bold hover:file:bg-[#06D6A0]/80 cursor-pointer"
                        />
                        <span className="text-[11px] text-[#52525B] font-bold">
                          * 파일 선택 시 즉시 데이터베이스에 복원됩니다
                        </span>
                      </div>
                    </div>

                    {/* Permanent Cloud DB note */}
                    <div className="p-3 bg-[#FAFAF5] border border-neutral-300 rounded-lg text-xs text-[#52525B] space-y-1">
                      <b className="text-[#0A0A0A]">☁️ 완전 영구 보존 클라우드 DB 안내</b>
                      <p>
                        수동 백업/복원 과정 없이 재배포와 무관하게 100% 영구 데이터를 보존하고 싶으시다면,
                        외부 클라우드 DB인 <strong>Firebase Firestore</strong>로 언제든 원클릭 연결 및 전환이 가능합니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
