// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/pages/WorkspacePage.tsx
// PURPOSE: Workspace page — stable version v2.1 (fixed infinite re-render bugs)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  FileText,
  Users,
  Activity,
  Settings,
  X,
  Link2,
  HardDrive,
  Check,
  Home,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWorkspaceService } from '@/services/api-services';
import { fileService, realtimeService } from '@/services/supabase-services';
import {
  Workspace,
  WorkspaceFile,
  WorkspaceMember,
  PaginationMeta,
  AuditLog,
  StorageInfo,
  FileVersion,
  FileComment,
  Role,
  FileTypeFilter,
  FileSortBy,
  Tab,
} from '@/types';
import { PageLoader } from '@/components/common/PageLoader';
import { NotificationBell } from '@/components/common/NotificationBell';
import UploadSheet, { type UploadSheetItem } from '@/components/files/UploadSheet';
import FileList from '@/components/workspace/FileList';
import FilePreviewModal from '@/components/workspace/FilePreviewModal';
import MemberList from '@/components/workspace/MemberList';
import ActivityLog from '@/components/workspace/ActivityLog';
import WorkspaceSettings from '@/components/workspace/WorkspaceSettings';
import FloatingUploadButton from '@/components/common/FloatingUploadButton';

// ─── Constants ────────────────────────────────────────────────────────────────

const FILES_LIMIT = 12;
const ACTIVITY_LIMIT = 10;
const FILE_COMMENTS_LIMIT = 20;

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 1,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // ─── State: Overview ─────────────────────────────────────────────────────
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({ used: 0, max: 0, percentage: 0 });
  const [overviewLoading, setOverviewLoading] = useState(true);

  // ─── State: Files ─────────────────────────────────────────────────────────
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [filesPagination, setFilesPagination] = useState<PaginationMeta>(emptyPagination);
  const [filesPage, setFilesPage] = useState(1);
  const [filesLoading, setFilesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [fileSortBy, setFileSortBy] = useState<FileSortBy>('newest');

  // ─── State: Preview Modal ─────────────────────────────────────────────────
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [fileComments, setFileComments] = useState<FileComment[]>([]);
  const [versionUploading, setVersionUploading] = useState(false);
  const [versionUploadProgress, setVersionUploadProgress] = useState(0);
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [commentInput, setCommentInput] = useState('');

  // ─── State: Members ───────────────────────────────────────────────────────
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<'all' | Role>('all');

  // ─── State: Activity ──────────────────────────────────────────────────────
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activityPagination, setActivityPagination] = useState<PaginationMeta>(emptyPagination);
  const [activityPage, setActivityPage] = useState(1);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityActionFilter, setActivityActionFilter] = useState('all');

  // ─── State: Settings ──────────────────────────────────────────────────────
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsStorageMb, setSettingsStorageMb] = useState('500');
  const [settingsSubject, setSettingsSubject] = useState('');
  const [settingsIsCourse, setSettingsIsCourse] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [inviteSingleUse, setInviteSingleUse] = useState(false);
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');

  // ─── State: UI ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>(() => (searchParams.get('tab') as Tab) || 'files');
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<WorkspaceFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── State: Rename ────────────────────────────────────────────────────────
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  // ─── State: Upload ────────────────────────────────────────────────────────
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadSheetSeed, setUploadSheetSeed] = useState<File[] | undefined>(undefined);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const initialOverviewLoadedRef = useRef(false);
  const versionInputRef = useRef<HTMLInputElement>(null);

  // ─── Tab URL sync ─────────────────────────────────────────────────────────
  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab);
    setSearchParams((prev) => { prev.set('tab', newTab); return prev; }, { replace: true });
  }, [setSearchParams]);

  // ─── Esc closes modals ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInvite(false);
        setDeleteConfirm(null);
        setPreviewFile(null);
        setPreviewUrl(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ─── Ctrl+K focuses search ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleTabChange('files');
        window.setTimeout(() => {
          const el = document.querySelector<HTMLInputElement>('input[placeholder*="ابحث"]');
          el?.focus();
        }, 100);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleTabChange]);

  // ─── Auth redirect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [authLoading, user, navigate]);

  // ─── Load Overview ────────────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    if (!id) return;
    const first = !initialOverviewLoadedRef.current;
    if (first) setOverviewLoading(true);
    setError('');
    try {
      const [workspaceData, membersData, storageData] = await Promise.all([
        supabaseWorkspaceService.getById(id),
        supabaseWorkspaceService.getMembers(id),
        supabaseWorkspaceService.getStorage(id),
      ]);
      setWorkspace(workspaceData);
      setMembers(membersData);
      setStorageInfo(storageData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر تحميل بيانات المساحة';
      setError(msg);
      navigate('/dashboard');
    } finally {
      if (first) {
        initialOverviewLoadedRef.current = true;
        setOverviewLoading(false);
      }
    }
  }, [id, navigate]);

  // ─── Load Files ───────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    if (!id) return;
    setFilesLoading(true);
    try {
      const result = await supabaseWorkspaceService.getFiles(id, {
        page: filesPage,
        limit: FILES_LIMIT,
        search: searchQuery.trim() || undefined,
      });
      setFiles(result.data);
      setFilesPagination(result.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الملفات');
    } finally {
      setFilesLoading(false);
    }
  }, [id, filesPage, searchQuery]);

  // ─── Load Activity ────────────────────────────────────────────────────────
  const loadActivity = useCallback(async () => {
    if (!id) return;
    setActivityLoading(true);
    try {
      const result = await supabaseWorkspaceService.getActivity(id, {
        page: activityPage,
        limit: ACTIVITY_LIMIT,
      });
      setLogs(result.data);
      setActivityPagination(result.pagination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل النشاط');
    } finally {
      setActivityLoading(false);
    }
  }, [id, activityPage]);

  // ─── Load File Details ────────────────────────────────────────────────────
  const loadFileDetails = useCallback(async (selectedFile: WorkspaceFile) => {
    if (!id) return;
    setDetailLoading(true);
    setError('');
    setPreviewFile(selectedFile);
    setCommentInput('');
    setDescEditing(false);
    setDescDraft(selectedFile.description || '');
    try {
      const [versions, comments, signedUrl] = await Promise.all([
        supabaseWorkspaceService.getFileVersions(id, selectedFile.id),
        supabaseWorkspaceService.getFileComments(id, selectedFile.id, { page: 1, limit: FILE_COMMENTS_LIMIT }),
        fileService.canPreview(selectedFile.mime_type)
          ? fileService.getPreviewUrl(selectedFile.storage_path, id)
          : Promise.resolve(''),
      ]);
      setFileVersions(versions);
      setFileComments(comments.data);
      setPreviewUrl(signedUrl || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل تفاصيل الملف');
    } finally {
      setDetailLoading(false);
    }
  }, [id]);

  // ─── Refresh All ──────────────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadFiles(), loadActivity()]);
  }, [loadOverview, loadFiles, loadActivity]);

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !authLoading) loadOverview();
  }, [loadOverview, user, authLoading]);

  useEffect(() => {
    if (user && !authLoading) loadFiles();
  }, [loadFiles, user, authLoading]);

  useEffect(() => {
    if (user && !authLoading) loadActivity();
  }, [loadActivity, user, authLoading]);

  useEffect(() => {
    setFilesPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (workspace) {
      setSettingsName(workspace.name || '');
      setSettingsDescription(workspace.description || '');
      setSettingsStorageMb(String(workspace.max_storage_mb || 500));
      setSettingsSubject(workspace.subject || '');
      setSettingsIsCourse(Boolean(workspace.subject));
      setInviteSingleUse(workspace.invite_single_use || false);
      setInviteMaxUses(workspace.invite_max_uses ? String(workspace.invite_max_uses) : '');
      setInviteExpiresAt(workspace.invite_expires_at ? workspace.invite_expires_at.slice(0, 16) : '');
    }
  }, [workspace]);

  useEffect(() => {
    if (!id) return;
    realtimeService.subscribeToWorkspace(id, loadFiles, loadOverview);
    return () => realtimeService.unsubscribe();
  }, [id, loadFiles, loadOverview]);

  // ─── Upload Handlers ──────────────────────────────────────────────────────
  const handleUploadSheetItem = async (
    item: UploadSheetItem,
    controls: {
      onProgress: (pct: number) => void;
      onStatusChange: (status: 'preparing' | 'uploading' | 'finalizing') => void;
    }
  ) => {
    if (!id) throw new Error('Workspace غير محدد');
    await supabaseWorkspaceService.uploadFile(id, item.file, {
      displayName: item.displayName,
      description: item.description,
      onProgress: controls.onProgress,
      onStageChange: controls.onStatusChange,
    });
  };

  const handleFileDrop = (droppedFiles: File[]) => {
    setUploadSheetSeed(droppedFiles);
    setUploadSheetOpen(true);
  };

  const handleUploadSheetDone = () => { void refreshAll(); };

  // ─── File Handlers ────────────────────────────────────────────────────────
  const handleDownload = async (file: { storage_path: string; name: string }) => {
    try {
      await fileService.downloadFile(file.storage_path, file.name, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الملف');
    }
  };

  const handleOpenViewer = (file: WorkspaceFile) => {
    if (!id) return;
    navigate(`/workspace/${id}/view/${file.id}`);
  };

  const handleDeleteFile = async (file: WorkspaceFile) => {
    if (!id) return;
    setDeleting(true);
    try {
      await supabaseWorkspaceService.deleteFile(id, file.id);
      setDeleteConfirm(null);
      setPreviewFile(null);
      setPreviewUrl(null);
      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حذف الملف');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Rename Handlers ──────────────────────────────────────────────────────
  const handleStartRename = (file: WorkspaceFile) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
  };
  const handleCancelRename = () => { setRenamingId(null); setRenameValue(''); };
  const handleConfirmRename = async (file: WorkspaceFile) => {
    if (!id) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === file.name) { handleCancelRename(); return; }
    setRenameSaving(true);
    setError('');
    try {
      const updated = await supabaseWorkspaceService.updateFile(id, file.id, { name: trimmed });
      setFiles((curr) => curr.map((f) => (f.id === file.id ? { ...f, ...updated } : f)));
      if (previewFile?.id === file.id) setPreviewFile({ ...previewFile, ...updated });
      handleCancelRename();
      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة تسمية الملف');
    } finally {
      setRenameSaving(false);
    }
  };

  // ─── Preview / Description / Comment / Version ────────────────────────────
  const handleDescriptionSave = async (description: string) => {
    if (!id || !previewFile) return;
    try {
      const updated = await supabaseWorkspaceService.updateFile(id, previewFile.id, { description });
      setPreviewFile({ ...previewFile, ...updated });
      setFiles((curr) => curr.map((f) => (f.id === previewFile.id ? { ...f, ...updated } : f)));
      setDescEditing(false);
      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الوصف');
    }
  };

  const handleAddComment = async (content: string) => {
    if (!id || !previewFile) return;
    try {
      const comment = await supabaseWorkspaceService.addFileComment(id, previewFile.id, content);
      setFileComments((curr) => [comment, ...curr]);
      setCommentInput('');
      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر إضافة التعليق');
    }
  };

  const handleVersionUpload = async (file: File) => {
    if (!id || !previewFile) return;
    setVersionUploading(true);
    setVersionUploadProgress(0);
    try {
      const updated = await supabaseWorkspaceService.uploadFileVersion(
        id, previewFile.id, file, setVersionUploadProgress
      );
      setPreviewFile(updated);
      await Promise.all([refreshAll(), loadFileDetails(updated)]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر رفع النسخة الجديدة');
    } finally {
      setVersionUploading(false);
      setVersionUploadProgress(0);
    }
  };

  // ─── Members Handlers ─────────────────────────────────────────────────────
  const handleRoleChange = async (member: WorkspaceMember, role: Role) => {
    if (!id || member.role === role) return;
    try {
      setError('');
      await supabaseWorkspaceService.updateMemberRole(id, member.id, role);
      setMembers((curr) => curr.map((m) => (m.id === member.id ? { ...m, role } : m)));
      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث دور العضو');
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!id) return;
    if (!window.confirm(`هل تريد إزالة ${member.display_name || 'هذا العضو'} من المساحة؟`)) return;
    try {
      setError('');
      await supabaseWorkspaceService.removeMember(id, member.id);
      setMembers((curr) => curr.filter((m) => m.id !== member.id));
      await refreshAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر إزالة العضو');
    }
  };

  // ─── Settings Handlers ────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!id) return;
    const parsedStorage = Number(settingsStorageMb);
    if (!settingsName.trim()) { setSettingsError('اسم المساحة مطلوب'); return; }
    if (!Number.isFinite(parsedStorage) || parsedStorage < 1) {
      setSettingsError('حد التخزين يجب أن يكون أكبر من صفر');
      return;
    }
    setSavingSettings(true);
    setSettingsError('');
    try {
      const parsedMaxUses = inviteMaxUses ? Number(inviteMaxUses) : null;
      const updated = await supabaseWorkspaceService.updateWorkspace(id, {
        name: settingsName.trim(),
        description: settingsDescription.trim(),
        max_storage_mb: isOwner ? parsedStorage : workspace?.max_storage_mb || parsedStorage,
        subject: settingsIsCourse ? (settingsSubject.trim() || settingsName.trim()) : null,
        invite_single_use: inviteSingleUse,
        invite_max_uses: parsedMaxUses && parsedMaxUses > 0 ? parsedMaxUses : null,
        invite_expires_at: inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : null,
      });
      setWorkspace(updated);
      await refreshAll();
    } catch (err: unknown) {
      setSettingsError(err instanceof Error ? err.message : 'تعذر حفظ إعدادات المساحة');
    } finally {
      setSavingSettings(false);
    }
  };

  const copyInviteLink = useCallback(() => {
    if (!workspace) return;
    const link = `${window.location.origin}/join/${workspace.invite_token}`;
    navigator.clipboard.writeText(link).catch(() => undefined);
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1800);
  }, [workspace]);

  const handleRegenerate = async () => {
    if (!id) return;
    try {
      const result = await supabaseWorkspaceService.regenerateInvite(id);
      setWorkspace((curr) => curr ? { ...curr, invite_token: result.invite_token } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر إعادة توليد رابط الدعوة');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!id || !window.confirm('هل أنت متأكد من حذف هذه المساحة؟')) return;
    try {
      await supabaseWorkspaceService.deleteWorkspace(id);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حذف مساحة العمل');
    }
  };

  // ─── Guard ────────────────────────────────────────────────────────────────
  if (authLoading || overviewLoading) return <PageLoader label="جاري تحميل مساحة العمل..." />;
  if (!workspace) return null;

  // ─── Derived ──────────────────────────────────────────────────────────────
  const isOwner = Boolean(user && workspace.owner_id === user.id);
  const currentUserRole = isOwner
    ? 'owner' as Role
    : members.find((m) => m.user_id === user?.id)?.role;

  const storagePercentage = storageInfo.percentage;
  const storageColor =
    storagePercentage > 90 ? 'text-brick-soft' :
    storagePercentage > 70 ? 'text-brass-ring' : 'text-sage';
  const storageBgColor =
    storagePercentage > 90 ? 'bg-brick' :
    storagePercentage > 70 ? 'bg-brass' : 'bg-sage';

  const tabs: { key: Tab; icon: typeof FileText; label: string; count?: number }[] = [
    { key: 'files',    icon: FileText,  label: 'الملفات',   count: filesPagination.total || undefined },
    { key: 'members',  icon: Users,     label: 'الأعضاء',   count: members.length || undefined },
    { key: 'activity', icon: Activity,  label: 'السجل' },
    { key: 'settings', icon: Settings,  label: 'الإعدادات' },
  ];

  const inviteLink = `${window.location.origin}/join/${workspace.invite_token}`;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div dir="rtl">
      {/* Header */}
      <header className="glass-header">
        <div className="container mx-auto px-6 py-3">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-xs text-fg-4 mb-2">
            <Link to="/" className="hover:text-fg-2 transition-colors flex items-center gap-1">
              <Home className="h-3 w-3" />
              الرئيسية
            </Link>
            <ChevronLeft className="h-3 w-3 opacity-40" />
            <Link to="/dashboard" className="hover:text-fg-2 transition-colors flex items-center gap-1">
              <LayoutDashboard className="h-3 w-3" />
              مساحات العمل
            </Link>
            <ChevronLeft className="h-3 w-3 opacity-40" />
            <span className="text-fg-2 truncate max-w-[140px]">{workspace.name}</span>
          </nav>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-fg-3 hover:text-fg-1 transition-colors"
                title="رجوع"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 bg-brass/15 rounded-lg flex items-center justify-center shrink-0">
                {workspace.subject
                  ? <Settings className="w-4 h-4 text-brass" />
                  : <FileText className="w-4 h-4 text-brass" />
                }
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate font-bold">{workspace.name}</h1>
                  {workspace.subject && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brass/30 bg-brass/10 px-2 py-0.5 text-[10px] font-semibold text-brass-ring">
                      مادة
                    </span>
                  )}
                </div>
                {workspace.subject && <p className="truncate text-xs text-brass-ring/90">{workspace.subject}</p>}
                {workspace.description && <p className="truncate text-xs text-fg-3">{workspace.description}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Storage badge */}
              <div className="hidden sm:flex items-center gap-2 bg-surface-2/70 rounded-xl px-3 py-1.5">
                <HardDrive className="w-4 h-4 text-fg-3" />
                <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${storageBgColor}`}
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${storageColor}`}>
                  {storagePercentage.toFixed(0)}%
                </span>
              </div>

              <NotificationBell compact />

              {/* One-click invite copy */}
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-2 bg-brass hover:bg-brass-hover px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {inviteCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {inviteCopied ? 'تم النسخ!' : 'دعوة'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-6 pt-4">
        <div className="flex gap-1 bg-surface-2/70 rounded-xl p-1 w-fit flex-wrap">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => handleTabChange(tabItem.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === tabItem.key ? 'bg-brass text-fg-1' : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              <tabItem.icon className="w-4 h-4" />
              {tabItem.label}
              {tabItem.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  tab === tabItem.key ? 'bg-white/20' : 'bg-surface-3 text-fg-4'
                }`}>
                  {tabItem.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 rounded-2xl border border-brick/40 bg-brick/10 px-4 py-3 text-sm text-brick-soft">
            {error}
          </div>
        )}

        {tab === 'files' && (
          <FileList
            files={files}
            pagination={filesPagination}
            loading={filesLoading}
            isOwner={isOwner}
            currentUserId={user?.id}
            onPreview={loadFileDetails}
            onView={handleOpenViewer}
            onDownload={handleDownload}
            onDelete={setDeleteConfirm}
            onPageChange={setFilesPage}
            renamingId={renamingId}
            renameValue={renameValue}
            onRenameStart={handleStartRename}
            onRenameConfirm={handleConfirmRename}
            onRenameCancel={handleCancelRename}
            onRenameChange={setRenameValue}
            renamingSaving={renameSaving}
            onUploadClick={() => setUploadSheetOpen(true)}
            onFileDrop={handleFileDrop}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            fileTypeFilter={fileTypeFilter}
            onFileTypeFilterChange={setFileTypeFilter}
            fileSortBy={fileSortBy}
            onFileSortByChange={setFileSortBy}
          />
        )}

        {tab === 'members' && (
          <MemberList
            members={members}
            currentUserId={user?.id}
            currentUserRole={currentUserRole || null}
            onRoleChange={handleRoleChange}
            onRemoveMember={handleRemoveMember}
            searchQuery={memberSearchQuery}
            onSearchChange={setMemberSearchQuery}
            roleFilter={memberRoleFilter}
            onRoleFilterChange={setMemberRoleFilter}
          />
        )}

        {tab === 'activity' && (
          <ActivityLog
            logs={logs}
            pagination={activityPagination}
            loading={activityLoading}
            onPageChange={setActivityPage}
            searchQuery={activitySearchQuery}
            onSearchChange={setActivitySearchQuery}
            actionFilter={activityActionFilter}
            onActionFilterChange={setActivityActionFilter}
          />
        )}

        {tab === 'settings' && (
          <WorkspaceSettings
            workspace={workspace}
            storageInfo={storageInfo}
            isOwner={isOwner}
            currentUserRole={currentUserRole}
            savingSettings={savingSettings}
            settingsError={settingsError}
            onSave={handleSaveSettings}
            onNameChange={setSettingsName}
            onDescriptionChange={setSettingsDescription}
            onSubjectChange={setSettingsSubject}
            onIsCourseChange={setSettingsIsCourse}
            onStorageMbChange={setSettingsStorageMb}
            onCopyInvite={copyInviteLink}
            onRegenerateInvite={handleRegenerate}
            onDeleteWorkspace={handleDeleteWorkspace}
            name={settingsName}
            description={settingsDescription}
            subject={settingsSubject}
            isCourse={settingsIsCourse}
            storageMb={settingsStorageMb}
            inviteCopied={inviteCopied}
            inviteSingleUse={inviteSingleUse}
            onInviteSingleUseChange={setInviteSingleUse}
            inviteMaxUses={inviteMaxUses}
            onInviteMaxUsesChange={setInviteMaxUses}
            inviteExpiresAt={inviteExpiresAt}
            onInviteExpiresAtChange={setInviteExpiresAt}
          />
        )}
      </main>

      {/* Invite Modal */}
      {showInvite && workspace && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowInvite(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface-2 border border-line-strong rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">دعوة أعضاء</h3>
              <button onClick={() => setShowInvite(false)} className="text-fg-3 hover:text-fg-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-fg-3 mb-4">شارك هذا الرابط مع من تريد دعوتهم:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 bg-surface-3/60 border border-line-strong rounded-lg py-2.5 px-3 text-sm text-fg-2"
              />
              <button
                onClick={() => { copyInviteLink(); setShowInvite(false); }}
                className="bg-brass hover:bg-brass-hover px-4 rounded-xl text-sm font-medium transition-colors"
              >
                نسخ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete File Confirmation */}
      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface-2 border border-brick/40 rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-brick/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-brick-soft" />
              </div>
              <h3 className="text-lg font-bold text-fg-1">حذف الملف</h3>
              <p className="text-sm text-fg-3 mt-1">هل أنت متأكد من حذف "{deleteConfirm.name}"؟</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteFile(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-brick hover:bg-brick/90 disabled:opacity-50 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 bg-surface-3 hover:bg-surface-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        previewUrl={previewUrl}
        loading={detailLoading}
        versions={fileVersions}
        comments={fileComments}
        versionUploading={versionUploading}
        versionUploadProgress={versionUploadProgress}
        currentUserId={user?.id}
        onClose={() => {
          setPreviewFile(null);
          setPreviewUrl(null);
          setFileComments([]);
          setFileVersions([]);
        }}
        onDownload={handleDownload}
        onOpenViewer={handleOpenViewer}
        onAddComment={handleAddComment}
        onVersionUpload={handleVersionUpload}
        onDescriptionSave={handleDescriptionSave}
        editingDescription={descEditing}
        descriptionDraft={descDraft}
        descriptionSaving={false}
        onDescriptionEditStart={() => {
          setDescDraft(previewFile?.description || '');
          setDescEditing(true);
        }}
        onDescriptionEditCancel={() => setDescEditing(false)}
        onDescriptionChange={setDescDraft}
      />

      {/* Upload Sheet */}
      <UploadSheet
        open={uploadSheetOpen}
        initialFiles={uploadSheetSeed}
        onClose={() => { setUploadSheetOpen(false); setUploadSheetSeed(undefined); }}
        onUpload={handleUploadSheetItem}
        onAllDone={handleUploadSheetDone}
      />

      {/* Mobile FAB */}
      <FloatingUploadButton onClick={() => setUploadSheetOpen(true)} />
    </div>
  );
}
