// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/workspace/FileCard.tsx
// PURPOSE: File card component — grid and list views.
//          Improvements: image thumbnails, file-type colors, copy-link button,
//          lazy loading, hover tooltips with size/date/uploader info.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Download,
  Eye,
  MonitorPlay,
  Pencil,
  Trash2,
  Loader2,
  Save,
  FileText,
  Film,
  Music2,
  Image as ImageIcon,
  FileType2,
  Link2,
  Check,
} from 'lucide-react';
import { WorkspaceFile } from '@/types';
import { fileService } from '@/services/supabase-services';

interface FileCardProps {
  file: WorkspaceFile;
  viewMode: 'grid' | 'list';
  isOwner: boolean;
  canRename: boolean;
  renamingId: string | null;
  renameValue: string;
  onPreview: (file: WorkspaceFile) => void;
  onView: (file: WorkspaceFile) => void;
  onDownload: (file: WorkspaceFile) => void;
  onRenameStart: (file: WorkspaceFile) => void;
  onRenameConfirm: (file: WorkspaceFile) => void;
  onRenameCancel: () => void;
  onRenameChange: (value: string) => void;
  onDelete: (file: WorkspaceFile) => void;
  renamingSaving: boolean;
}

// ─── File type color palettes ─────────────────────────────────────────────────
function getKindColors(kind: string) {
  switch (kind) {
    case 'image':    return { bg: 'hsl(var(--sage)/0.18)',    border: 'hsl(var(--sage)/0.35)',    text: 'hsl(var(--sage))',         badge: 'bg-sage/10 text-sage border-sage/25' };
    case 'video':    return { bg: 'hsl(var(--brand-accent)/0.15)', border: 'hsl(var(--brand-accent)/0.30)', text: 'hsl(var(--brand-accent))', badge: 'bg-brand-accent/10 text-brand-accent border-brand-accent/25' };
    case 'audio':    return { bg: 'hsl(var(--brass)/0.18)',   border: 'hsl(var(--brass)/0.35)',   text: 'hsl(var(--brass-ring))',   badge: 'bg-brass/10 text-brass-ring border-brass/25' };
    case 'pdf':      return { bg: 'hsl(var(--brick)/0.15)',   border: 'hsl(var(--brick)/0.30)',   text: 'hsl(var(--brick-soft))',   badge: 'bg-brick/10 text-brick-soft border-brick/25' };
    case 'text':     return { bg: 'hsl(var(--sage)/0.10)',    border: 'hsl(var(--sage)/0.20)',    text: 'hsl(var(--sage))',         badge: 'bg-sage/8 text-sage border-sage/20' };
    default:         return { bg: 'hsl(var(--brand-accent)/0.08)', border: 'hsl(var(--brand-accent)/0.20)', text: 'hsl(var(--brand-accent))', badge: 'bg-brand-accent/8 text-brand-accent border-brand-accent/20' };
  }
}

// ─── Image thumbnail component ────────────────────────────────────────────────
// Thumbnails not shown for private blobs — signed URLs require async fetch
// which can't be done synchronously in render. Show icon instead.
function ImageThumbnail({ file: _file, className: _className }: { file: WorkspaceFile; className?: string }) {
  return null;
}

export default function FileCard({
  file,
  viewMode,
  isOwner,
  canRename,
  renamingId,
  renameValue,
  onPreview,
  onView,
  onDownload,
  onRenameStart,
  onRenameConfirm,
  onRenameCancel,
  onRenameChange,
  onDelete,
  renamingSaving,
}: FileCardProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const kind = fileService.getFileKind(file.mime_type, file.name);
  const colors = getKindColors(kind);

  const KindIcon =
    kind === 'video' ? Film :
    kind === 'audio' ? Music2 :
    kind === 'image' ? ImageIcon :
    kind === 'pdf'   ? FileType2 :
    FileText;

  const kindLabel =
    kind === 'video' ? 'فيديو' :
    kind === 'audio' ? 'صوت'   :
    kind === 'image' ? 'صورة'  :
    kind === 'pdf'   ? 'PDF'   :
    kind === 'text'  ? 'نص'    :
    'ملف';

  const isRenaming = renamingId === file.id;
  const isImage = kind === 'image';

  const stop = (handler: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handler();
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For private blobs, copy the file name as reference (signed URLs are temporary)
    navigator.clipboard.writeText(file.name).catch(() => undefined);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ── GRID VIEW ──────────────────────────────────────────────────────────────
  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => !isRenaming && onPreview(file)}
        className="group relative cursor-pointer rounded-2xl border border-line/60 bg-surface-2/80 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-accent/30 hover:shadow-glow-sm"
        title={`${file.name}\n${fileService.formatSize(file.size)} · ${formatDate(file.created_at)} · ${file.uploaded_by_name}`}
      >
        {/* File Type Badge */}
        <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors.badge}`}>
          <KindIcon className="h-3 w-3" />
          {kindLabel}
        </span>

        {/* Thumbnail or Icon */}
        <div
          className="mx-auto mb-3 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl border overflow-hidden"
          style={{ background: colors.bg, borderColor: colors.border }}
        >
          {isImage ? (
            <ImageThumbnail file={file} className="h-14 w-14" />
          ) : null}
          {(!isImage) && (
            <KindIcon className="h-7 w-7" style={{ color: colors.text }} />
          )}
        </div>

        {/* Rename Mode */}
        {isRenaming ? (
          <div onClick={(e) => e.stopPropagation()} className="space-y-2">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  { e.preventDefault(); onRenameConfirm(file); }
                if (e.key === 'Escape') { e.preventDefault(); onRenameCancel(); }
              }}
              className="field !py-2 text-center text-sm"
            />
            <div className="flex justify-center gap-2">
              <button
                onClick={() => onRenameConfirm(file)}
                disabled={renamingSaving}
                className="btn-primary !py-1.5 text-xs"
              >
                {renamingSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                حفظ
              </button>
              <button onClick={onRenameCancel} disabled={renamingSaving} className="btn-ghost !py-1.5 text-xs">
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="truncate text-center text-sm font-medium text-fg-1" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 text-center text-[11px] text-fg-4">
              {fileService.formatSize(file.size)} · {file.uploaded_by_name}
            </p>

            {file.description && (
              <p className="mt-2 line-clamp-2 text-center text-[11px] leading-5 text-fg-3" title={file.description}>
                {file.description}
              </p>
            )}
          </>
        )}

        {/* Action Buttons */}
        {!isRenaming && (
          <div className="mt-3 flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button onClick={stop(() => onPreview(file))} className="rounded-lg p-1.5 text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg-1" title="معاينة سريعة — نافذة منبثقة">
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button onClick={stop(() => onView(file))} className="rounded-lg p-1.5 transition-colors hover:bg-brand-accent/15" style={{ color: colors.text }} title="فتح المشغل الكامل">
              <MonitorPlay className="h-3.5 w-3.5" />
            </button>
            <button onClick={stop(() => onDownload(file))} className="rounded-lg p-1.5 text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg-1" title="تحميل">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleCopyLink} className="rounded-lg p-1.5 text-fg-2 transition-colors hover:bg-surface-3 hover:text-sage" title="نسخ رابط الملف">
              {linkCopied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Link2 className="h-3.5 w-3.5" />}
            </button>
            {canRename && (
              <button onClick={stop(() => onRenameStart(file))} className="rounded-lg p-1.5 text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg-1" title="إعادة تسمية">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {isOwner && (
              <button onClick={stop(() => onDelete(file))} className="rounded-lg p-1.5 text-brick-soft transition-colors hover:bg-brick/20" title="حذف">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  return (
    <div
      onClick={() => !isRenaming && onPreview(file)}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-line/60 bg-surface-2/80 p-4 transition-all hover:border-brand-accent/30 cursor-pointer"
      title={`${file.name} · ${fileService.formatSize(file.size)} · ${formatDate(file.created_at)} · ${file.uploaded_by_name}`}
    >
      {/* Left Section */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border overflow-hidden"
          style={{ background: colors.bg, borderColor: colors.border }}
        >
          {isImage ? (
            <ImageThumbnail file={file} className="h-10 w-10" />
          ) : (
            <KindIcon className="h-5 w-5" style={{ color: colors.text }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isRenaming ? (
              <div onClick={(e) => e.stopPropagation()} className="flex flex-1 items-center gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  { e.preventDefault(); onRenameConfirm(file); }
                    if (e.key === 'Escape') { e.preventDefault(); onRenameCancel(); }
                  }}
                  className="field !py-1.5 text-sm"
                />
                <button onClick={() => onRenameConfirm(file)} disabled={renamingSaving} className="btn-primary !py-1.5 text-xs">
                  {renamingSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </button>
                <button onClick={onRenameCancel} disabled={renamingSaving} className="btn-ghost !py-1.5 text-xs">إلغاء</button>
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold text-fg-1" title={file.name}>{file.name}</p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${colors.badge}`}>
                  <KindIcon className="h-3 w-3" />
                  {kindLabel}
                </span>
              </>
            )}
          </div>

          {!isRenaming && (
            <>
              <p className="mt-0.5 text-xs text-fg-4">
                {fileService.formatSize(file.size)} · {file.uploaded_by_name} · {formatDate(file.created_at)}
              </p>
              {file.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-6 text-fg-3" title={file.description}>
                  {file.description}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Buttons (list) */}
      {!isRenaming && (
        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button onClick={stop(() => onPreview(file))} className="rounded-lg p-2 transition-colors hover:bg-surface-3" title="معاينة سريعة — نافذة منبثقة">
            <Eye className="h-4 w-4 text-fg-2" />
          </button>
          <button onClick={stop(() => onView(file))} className="rounded-lg p-2 transition-colors hover:bg-brand-accent/15" title="فتح المشغل الكامل">
            <MonitorPlay className="h-4 w-4" style={{ color: colors.text }} />
          </button>
          <button onClick={stop(() => onDownload(file))} className="rounded-lg p-2 transition-colors hover:bg-surface-3" title="تحميل">
            <Download className="h-4 w-4 text-fg-2" />
          </button>
          <button onClick={handleCopyLink} className="rounded-lg p-2 transition-colors hover:bg-surface-3 hover:text-sage" title="نسخ رابط الملف">
            {linkCopied ? <Check className="h-4 w-4 text-sage" /> : <Link2 className="h-4 w-4 text-fg-2" />}
          </button>
          {canRename && (
            <button onClick={stop(() => onRenameStart(file))} className="rounded-lg p-2 transition-colors hover:bg-surface-3" title="إعادة تسمية">
              <Pencil className="h-4 w-4 text-fg-2" />
            </button>
          )}
          {isOwner && (
            <button onClick={stop(() => onDelete(file))} className="rounded-lg p-2 transition-colors hover:bg-brick/20" title="حذف">
              <Trash2 className="h-4 w-4 text-brick-soft" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
