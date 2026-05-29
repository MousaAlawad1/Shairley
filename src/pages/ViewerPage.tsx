// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/pages/ViewerPage.tsx
// PURPOSE: Full-page immersive viewer — one dedicated page per file type.
//
//  Flow:
//    FileCard → [👁 Quick Preview] → FilePreviewModal (side drawer, compact)
//    FileCard → [🖥 Full Viewer]   → ViewerPage       (this file, full screen)
//
//  Viewers:
//    🎬 video  → MediaPlayer  (custom controls, fullscreen, shortcuts)
//    🎵 audio  → MediaPlayer  (compact bar with waveform-style UI)
//    🖼 image  → ImageViewer  (zoom, pan, rotate, fit modes)
//    📄 PDF    → PdfViewer    (<object> tag, fallback message)
//    📝 text   → TextViewer   (markdown rendered / code with line numbers)
//    📦 other  → UnsupportedViewer (download CTA)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Download,
  AlertTriangle,
  Film,
  Music2,
  Image as ImageIcon,
  FileType2,
  FileText,
  BookOpen,
  ChevronLeft,
  LayoutDashboard,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseWorkspaceService } from '@/services/api-services';
import { fileService } from '@/services/supabase-services';
import { WorkspaceFile, Workspace } from '@/types';
import { PageLoader } from '@/components/common/PageLoader';
import { spring, tapScale } from '@/lib/motion';

// Viewers
import MediaPlayer from '@/components/media/MediaPlayer';
import ImageViewer from '@/components/viewers/ImageViewer';
import PdfViewer from '@/components/viewers/PdfViewer';
import TextViewer from '@/components/viewers/TextViewer';
import UnsupportedViewer from '@/components/viewers/UnsupportedViewer';

// ─── Kind helpers ─────────────────────────────────────────────────────────────

const KIND_META = {
  video: { icon: Film,      label: 'فيديو',   color: 'text-brand-accent', bg: 'bg-brand-accent/15', border: 'border-brand-accent/25' },
  audio: { icon: Music2,    label: 'صوت',     color: 'text-brass-ring',   bg: 'bg-brass/15',         border: 'border-brass/25' },
  image: { icon: ImageIcon, label: 'صورة',    color: 'text-sage',         bg: 'bg-sage/15',          border: 'border-sage/25' },
  pdf:   { icon: FileType2, label: 'PDF',     color: 'text-brick-soft',   bg: 'bg-brick/15',         border: 'border-brick/25' },
  text:  { icon: FileText,  label: 'نص',      color: 'text-fg-2',         bg: 'bg-surface-3',        border: 'border-line/50' },
  other: { icon: FileText,  label: 'ملف',     color: 'text-fg-3',         bg: 'bg-surface-3',        border: 'border-line/40' },
} as const;

// ─── Info panel ───────────────────────────────────────────────────────────────

function InfoPanel({ file, onClose }: { file: WorkspaceFile; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={spring.smooth}
      className="fixed sm:absolute inset-0 sm:inset-auto sm:top-0 sm:left-0 sm:h-full w-full sm:w-72 bg-surface-2/95 backdrop-blur-xl border-b sm:border-b-0 sm:border-r border-line/60 z-30 overflow-auto p-4 sm:p-5 flex flex-col gap-3 sm:gap-4"
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-fg-1 text-sm">تفاصيل الملف</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-3 text-fg-3 hover:text-fg-1 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs text-fg-4 mb-1">الاسم</p>
          <p className="text-fg-1 font-medium break-all">{file.name}</p>
        </div>
        <div>
          <p className="text-xs text-fg-4 mb-1">الحجم</p>
          <p className="text-fg-2">{fileService.formatSize(file.size)}</p>
        </div>
        <div>
          <p className="text-xs text-fg-4 mb-1">النوع</p>
          <p className="text-fg-2 font-mono text-xs">{file.mime_type || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-fg-4 mb-1">رُفع بواسطة</p>
          <p className="text-fg-2">{file.uploaded_by_name}</p>
        </div>
        <div>
          <p className="text-xs text-fg-4 mb-1">تاريخ الرفع</p>
          <p className="text-fg-2">{new Date(file.created_at).toLocaleString('ar')}</p>
        </div>
        {file.description && (
          <div>
            <p className="text-xs text-fg-4 mb-1">الوصف</p>
            <p className="text-fg-2 leading-6 whitespace-pre-wrap">{file.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ViewerPage() {
  const { id: workspaceId, fileId } = useParams<{ id: string; fileId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [file, setFile]           = useState<WorkspaceFile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [viewUrl, setViewUrl]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showInfo, setShowInfo]   = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [authLoading, user, navigate]);

  const loadData = useCallback(async () => {
    if (!workspaceId || !fileId || !user) return;
    setLoading(true);
    setError(null);
    try {
      const [ws, found] = await Promise.all([
        supabaseWorkspaceService.getById(workspaceId),
        supabaseWorkspaceService.getFileById(workspaceId, fileId),
      ]);
      setWorkspace(ws);
      setFile(found);

      if (fileService.canPreview(found.mime_type)) {
        const signed = await fileService.getPreviewUrl(found.storage_path, workspaceId);
        setViewUrl(signed || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل الملف.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, fileId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDownload = async () => {
    if (!file) return;
    await fileService.downloadFile(file.storage_path, file.name, workspaceId);
  };

  // ── Loading ──
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <PageLoader label="جاري تحميل الملف…" />
      </div>
    );
  }

  // ── Error ──
  if (error || !file) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-6 p-6 text-center" dir="rtl">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy}
          className="w-16 h-16 rounded-full bg-brick/15 border border-brick/25 flex items-center justify-center"
        >
          <AlertTriangle className="w-8 h-8 text-brick-soft" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-fg-1 mb-2">تعذّر تحميل الملف</h2>
          <p className="text-sm text-fg-3">{error ?? 'الملف غير موجود.'}</p>
        </div>
        <Link to={workspaceId ? `/workspace/${workspaceId}` : '/dashboard'} className="btn-secondary">
          <ArrowRight className="w-4 h-4" />
          العودة للمساحة
        </Link>
      </div>
    );
  }

  const kind = fileService.getFileKind(file.mime_type, file.name);
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;
  const canPreview = fileService.canPreview(file.mime_type);

  return (
    <div className="min-h-screen bg-ink text-fg-1 flex flex-col" dir="rtl">

      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={spring.smooth}
        className="sticky top-0 z-40 border-b border-line/50 bg-ink/90 backdrop-blur-xl shrink-0"
      >
        <div className="px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-3 max-w-screen-2xl mx-auto">

          {/* Left: breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to={`/workspace/${workspaceId}`}
              className="flex items-center gap-1.5 text-fg-3 hover:text-fg-1 transition-colors shrink-0 text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:block max-w-[100px] truncate">{workspace?.name ?? 'المساحة'}</span>
            </Link>

            <ChevronLeft className="h-3.5 w-3.5 text-fg-4 shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${meta.bg} ${meta.border} ${meta.color}`}>
                <KindIcon className="h-3 w-3" />
                {meta.label}
              </span>
              <h1 className="text-xs sm:text-sm font-semibold text-fg-1 truncate max-w-[120px] sm:max-w-none" title={file.name}>
                {file.name}
              </h1>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden md:block text-xs text-fg-4">
              {fileService.formatSize(file.size)} · {file.uploaded_by_name}
            </span>

            <button
              onClick={() => setShowInfo(v => !v)}
              className={`p-2 rounded-xl transition-all ${showInfo ? 'bg-surface-3 text-fg-1' : 'text-fg-3 hover:text-fg-1 hover:bg-surface-2'}`}
              title="تفاصيل الملف"
            >
              <Info className="h-4 w-4" />
            </button>

            <motion.button
              {...tapScale}
              onClick={handleDownload}
              className="btn-primary !py-1.5 !px-3 text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:block">تحميل</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* Info Panel */}
        <AnimatePresence>
          {showInfo && (
            <InfoPanel file={file} onClose={() => setShowInfo(false)} />
          )}
        </AnimatePresence>

        {/* Main viewer area */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col overflow-auto"
        >
          {/* Description banner */}
          {file.description && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mx-2 sm:mx-6 mt-2 sm:mt-4 rounded-xl sm:rounded-2xl border border-brand-accent/20 bg-brand-accent/5 px-3 sm:px-4 py-2 sm:py-3 shrink-0"
            >
              <div className="flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-brand-accent mt-0.5 shrink-0" />
                <p className="text-sm leading-7 text-fg-2 whitespace-pre-wrap">{file.description}</p>
              </div>
            </motion.div>
          )}

          {/* Viewer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 px-2 sm:px-6 py-2 sm:py-4"
          >

            {/* 🎬 Video */}
            {kind === 'video' && viewUrl && (
              <div className="w-full max-w-5xl mx-auto">
                <MediaPlayer src={viewUrl} kind="video" />
                <p className="text-center text-xs text-fg-4 mt-2 hidden sm:block">
                  مفاتيح: مسافة = تشغيل/إيقاف · ← → = ±5 ثوانٍ · F = ملء شاشة · M = كتم
                </p>
              </div>
            )}

            {/* 🎵 Audio */}
            {kind === 'audio' && viewUrl && (
              <div className="w-full max-w-2xl mx-auto mt-2 sm:mt-6">
                <div className="rounded-2xl border border-line/50 bg-surface-2/60 p-4 sm:p-6">
                  {/* Audio art */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-brass/10 border-2 border-brass/20 flex items-center justify-center">
                      <Music2 className="h-14 w-14 text-brass-ring opacity-60" />
                    </div>
                  </div>
                  <p className="text-center font-semibold text-fg-1 mb-1 truncate">{file.name}</p>
                  <p className="text-center text-xs text-fg-4 mb-5">{file.uploaded_by_name} · {fileService.formatSize(file.size)}</p>
                  <MediaPlayer src={viewUrl} kind="audio" title={file.name} />
                </div>
                <p className="text-center text-xs text-fg-4 mt-2 hidden sm:block">
                  مفاتيح: مسافة = تشغيل/إيقاف · ← → = ±5 ثوانٍ · M = كتم
                </p>
              </div>
            )}

            {/* 🖼 Image */}
            {kind === 'image' && viewUrl && (
              <ImageViewer url={viewUrl} name={file.name} />
            )}

            {/* 📄 PDF */}
            {kind === 'pdf' && viewUrl && (
              <PdfViewer url={viewUrl} name={file.name} />
            )}

            {/* 📝 Text / Code / Markdown */}
            {kind === 'text' && viewUrl && (
              <TextViewer url={viewUrl} name={file.name} mimeType={file.mime_type} />
            )}

            {/* 📦 Unsupported or failed */}
            {(!canPreview || !viewUrl) && (
              <UnsupportedViewer
                name={file.name}
                mimeType={file.mime_type}
                size={fileService.formatSize(file.size)}
                onDownload={handleDownload}
                onRetry={canPreview ? loadData : undefined}
                reason={!canPreview ? 'unsupported' : 'error'}
              />
            )}
          </motion.div>
        </motion.main>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-line/30 py-2 shrink-0 hidden sm:block">
        <div className="px-4 sm:px-6 flex items-center justify-between text-xs text-fg-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-3 w-3" />
            <span>Shairley · شيّرلي</span>
          </div>
          <span>{file.uploaded_by_name} · {new Date(file.created_at).toLocaleDateString('ar')}</span>
        </div>
      </footer>
    </div>
  );
}
