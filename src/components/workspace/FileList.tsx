// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/workspace/FileList.tsx
// PURPOSE: File list/grid — filtering, sorting, pagination, drag & drop zone,
//          view-mode persistence, beautiful empty states, skeleton loaders.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  FileText,
  UploadCloud,
  Image,
  Film,
  FileType2,
  Music2,
  Filter,
  SortAsc,
} from 'lucide-react';
import { WorkspaceFile, PaginationMeta, FileTypeFilter, FileSortBy } from '@/types';
import FileCard from './FileCard';
import Pagination from '@/components/common/Pagination';

interface FileListProps {
  files: WorkspaceFile[];
  pagination: PaginationMeta;
  loading: boolean;
  isOwner: boolean;
  currentUserId?: string;
  onPreview: (file: WorkspaceFile) => void;
  onView: (file: WorkspaceFile) => void;
  onDownload: (file: WorkspaceFile) => void;
  onDelete: (file: WorkspaceFile) => void;
  onPageChange: (page: number) => void;
  renamingId: string | null;
  renameValue: string;
  onRenameStart: (file: WorkspaceFile) => void;
  onRenameConfirm: (file: WorkspaceFile) => void;
  onRenameCancel: () => void;
  onRenameChange: (value: string) => void;
  renamingSaving: boolean;
  onUploadClick: () => void;
  onFileDrop?: (files: File[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  fileTypeFilter: FileTypeFilter;
  onFileTypeFilterChange: (filter: FileTypeFilter) => void;
  fileSortBy: FileSortBy;
  onFileSortByChange: (sort: FileSortBy) => void;
}

const FILE_TYPE_OPTIONS: { value: FileTypeFilter; label: string; icon: typeof FileText }[] = [
  { value: 'all',      label: 'كل الأنواع', icon: FileText },
  { value: 'image',    label: 'صور',        icon: Image    },
  { value: 'document', label: 'مستندات',    icon: FileType2},
  { value: 'media',    label: 'وسائط',      icon: Film     },
  { value: 'text',     label: 'نصوص',       icon: Music2   },
  { value: 'other',    label: 'أخرى',       icon: FileText },
];

const FILE_SORT_OPTIONS: { value: FileSortBy; label: string }[] = [
  { value: 'newest',   label: 'الأحدث'       },
  { value: 'oldest',   label: 'الأقدم'       },
  { value: 'name',     label: 'الاسم'        },
  { value: 'size_desc',label: 'الأكبر حجماً' },
  { value: 'size_asc', label: 'الأصغر حجماً' },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'grid') {
    return (
      <div className="rounded-2xl border border-line/40 bg-surface-2/50 p-4 animate-pulse">
        <div className="mx-auto mb-3 mt-2 h-14 w-14 rounded-2xl bg-surface-3/60" />
        <div className="mx-auto h-3 w-3/4 rounded bg-surface-3/60 mb-2" />
        <div className="mx-auto h-2 w-1/2 rounded bg-surface-3/40" />
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line/40 bg-surface-2/50 p-4 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-surface-3/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-surface-3/60" />
        <div className="h-2 w-1/3 rounded bg-surface-3/40" />
      </div>
    </div>
  );
}

// ─── Beautiful empty state ────────────────────────────────────────────────────
function EmptyState({ searchQuery, fileTypeFilter, onUploadClick }: {
  searchQuery: string;
  fileTypeFilter: FileTypeFilter;
  onUploadClick: () => void;
}) {
  const hasFilter = searchQuery || fileTypeFilter !== 'all';
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-brass/20"
        style={{ background: 'linear-gradient(135deg, hsl(var(--brass)/0.12), hsl(var(--brass)/0.04))' }}
      >
        {hasFilter
          ? <Search className="h-9 w-9 text-brass-ring opacity-60" />
          : <UploadCloud className="h-9 w-9 text-brass-ring opacity-80" />
        }
      </div>
      {hasFilter ? (
        <>
          <h3 className="text-lg font-semibold text-fg-1 mb-2">لا توجد نتائج</h3>
          <p className="text-sm text-fg-3 mb-6 max-w-xs">
            لم نجد ملفات تطابق بحثك أو الفلتر المحدد. جرّب تعديل البحث أو تغيير الفلتر.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-fg-1 mb-2">لا توجد ملفات بعد</h3>
          <p className="text-sm text-fg-3 mb-6 max-w-xs">
            ارفع أول ملف لمساحة العمل هذه. يمكنك سحب الملفات أو النقر على الزر أدناه.
          </p>
          <button
            onClick={onUploadClick}
            className="btn-primary px-6 py-2.5 text-sm"
          >
            <UploadCloud className="h-4 w-4" />
            ارفع ملفاً الآن
          </button>
        </>
      )}
    </div>
  );
}

export default function FileList({
  files,
  pagination,
  loading,
  isOwner,
  currentUserId,
  onPreview,
  onView,
  onDownload,
  onDelete,
  onPageChange,
  renamingId,
  renameValue,
  onRenameStart,
  onRenameConfirm,
  onRenameCancel,
  onRenameChange,
  renamingSaving,
  onUploadClick,
  onFileDrop,
  searchQuery,
  onSearchChange,
  fileTypeFilter,
  onFileTypeFilterChange,
  fileSortBy,
  onFileSortByChange,
}: FileListProps) {

  // ─── View mode with localStorage persistence ─────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try { return (localStorage.getItem('shairley-view-mode') as 'grid' | 'list') || 'list'; } catch { return 'list'; }
  });

  const [dragOver, setDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try { localStorage.setItem('shairley-view-mode', mode); } catch { /* ignore */ }
  };

  // ─── Drag & Drop handlers ────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      if (onFileDrop) {
        onFileDrop(droppedFiles);
      } else {
        onUploadClick();
      }
    }
  }, [onFileDrop, onUploadClick]);

  // ─── Client-side filter + sort ───────────────────────────────────────────
  const filteredFiles = [...files]
    .filter((file) => {
      if (fileTypeFilter === 'all') return true;
      if (fileTypeFilter === 'image')    return file.mime_type.startsWith('image/');
      if (fileTypeFilter === 'media')    return file.mime_type.startsWith('video/') || file.mime_type.startsWith('audio/');
      if (fileTypeFilter === 'text')     return file.mime_type.startsWith('text/') || file.mime_type === 'application/json';
      if (fileTypeFilter === 'document') {
        return (
          file.mime_type === 'application/pdf' ||
          file.mime_type.includes('document') ||
          file.mime_type.includes('sheet') ||
          file.mime_type.includes('presentation')
        );
      }
      return !(
        file.mime_type.startsWith('image/') ||
        file.mime_type.startsWith('video/') ||
        file.mime_type.startsWith('audio/') ||
        file.mime_type.startsWith('text/') ||
        file.mime_type === 'application/json' ||
        file.mime_type === 'application/pdf'
      );
    })
    .sort((a, b) => {
      if (fileSortBy === 'oldest')    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (fileSortBy === 'name')      return a.name.localeCompare(b.name, 'ar');
      if (fileSortBy === 'size_desc') return b.size - a.size;
      if (fileSortBy === 'size_asc')  return a.size - b.size;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div>
      {/* ── Drag & Drop Upload Zone ─────────────────────────────────────────── */}
      <div
        ref={dropZoneRef}
        onClick={onUploadClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
          dragOver
            ? 'border-brand-accent/70 bg-brand-accent/8 scale-[1.01]'
            : 'hover:border-brass/40 hover:bg-surface-2/40'
        }`}
      >
        <div
          className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
            dragOver ? 'border-brand-accent/50 bg-brand-accent/15' : 'border-brass/25'
          }`}
          style={dragOver ? {} : {
            background: 'linear-gradient(180deg, hsl(var(--brass) / 0.18), hsl(var(--brass) / 0.04))',
            boxShadow: 'inset 0 1px 0 0 hsl(var(--sheen) / 0.10)',
          }}
        >
          <UploadCloud className={`h-6 w-6 transition-colors ${dragOver ? 'text-brand-accent' : 'text-brass-ring'}`} />
        </div>
        {dragOver ? (
          <p className="font-semibold text-brand-accent">أفلت الملفات هنا للرفع</p>
        ) : (
          <>
            <p className="font-medium text-fg-1">اسحب الملفات هنا، أو انقر لاختيارها</p>
            <p className="mt-1 text-xs text-fg-4">
              يمكنك رفع عدة ملفات دفعة واحدة — مع إمكانية إضافة <strong className="text-fg-3">اسم</strong> و<strong className="text-fg-3">وصف</strong> لكل ملف
            </p>
          </>
        )}
      </div>

      {/* ── Filters & Controls Bar ──────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في الملفات..."
            className="field w-full pr-9 text-sm"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1 flex-wrap">
          {FILE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFileTypeFilterChange(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-all ${
                fileTypeFilter === opt.value
                  ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent'
                  : 'border-line/60 text-fg-3 hover:text-fg-1 hover:border-line'
              }`}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <SortAsc className="h-4 w-4 text-fg-4 shrink-0" />
          <select
            value={fileSortBy}
            onChange={(e) => onFileSortByChange(e.target.value as FileSortBy)}
            className="field !py-1.5 text-xs min-w-[120px]"
          >
            {FILE_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 bg-surface-2/70 rounded-xl p-1 border border-line/40">
          <button
            onClick={() => handleViewModeChange('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-accent/20 text-brand-accent' : 'text-fg-4 hover:text-fg-1'}`}
            title="عرض قائمة"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-accent/20 text-brand-accent' : 'text-fg-4 hover:text-fg-1'}`}
            title="عرض شبكة"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Count */}
        {!loading && (
          <span className="text-xs text-fg-4 shrink-0">
            {filteredFiles.length} ملف
          </span>
        )}
      </div>

      {/* ── File Grid/List ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
          : 'flex flex-col gap-3'
        }>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          searchQuery={searchQuery}
          fileTypeFilter={fileTypeFilter}
          onUploadClick={onUploadClick}
        />
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
          : 'flex flex-col gap-3'
        }>
          {filteredFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              viewMode={viewMode}
              isOwner={isOwner}
              canRename={isOwner || file.uploaded_by === currentUserId}
              renamingId={renamingId}
              renameValue={renameValue}
              onPreview={onPreview}
              onView={onView}
              onDownload={onDownload}
              onRenameStart={onRenameStart}
              onRenameConfirm={onRenameConfirm}
              onRenameCancel={onRenameCancel}
              onRenameChange={onRenameChange}
              onDelete={onDelete}
              renamingSaving={renamingSaving}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination pagination={pagination} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
