import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UploadCloud,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Film,
  Music2,
  Image as ImageIcon,
  FileType2,
} from 'lucide-react';
import { fileService } from '@/services/supabase-services';

export type UploadSheetItemStatus = 'pending' | 'preparing' | 'uploading' | 'finalizing' | 'done' | 'error';

export interface UploadSheetItem {
  id: string;
  file: File;
  displayName: string;
  description: string;
  progress: number;
  status: UploadSheetItemStatus;
  error?: string;
}

interface UploadSheetProps {
  open: boolean;
  initialFiles?: File[];
  /** Upload a single file using a clear pipeline: prepare → upload → finalize. */
  onUpload: (
    item: UploadSheetItem,
    controls: {
      onProgress: (pct: number) => void;
      onStatusChange: (status: Extract<UploadSheetItemStatus, 'preparing' | 'uploading' | 'finalizing'>) => void;
    }
  ) => Promise<void>;
  onClose: () => void;
  /** Optional: triggered when all rows succeed. */
  onAllDone?: () => void;
}

function stripExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function getExtension(name: string) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

function makeItem(file: File): UploadSheetItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    displayName: stripExtension(file.name),
    description: '',
    progress: 0,
    status: 'pending',
  };
}

function fileKindIcon(file: File) {
  const kind = fileService.getFileKind(file.type, file.name);
  if (kind === 'video') return Film;
  if (kind === 'audio') return Music2;
  if (kind === 'image') return ImageIcon;
  if (kind === 'pdf') return FileType2;
  return FileText;
}

function kindBadge(file: File) {
  const kind = fileService.getFileKind(file.type, file.name);
  if (kind === 'video') return { label: 'فيديو', tone: 'bg-brass/15 text-brass-ring border-brass/30' };
  if (kind === 'audio') return { label: 'صوت', tone: 'bg-sage/15 text-sage border-sage/30' };
  if (kind === 'image') return { label: 'صورة', tone: 'bg-sage/10 text-sage border-sage/30' };
  if (kind === 'pdf') return { label: 'PDF', tone: 'bg-brick/10 text-brick-soft border-brick/30' };
  if (kind === 'text') return { label: 'نص', tone: 'bg-surface-3 text-fg-2 border-line' };
  return { label: 'ملف', tone: 'bg-surface-3 text-fg-2 border-line' };
}

export default function UploadSheet({
  open,
  initialFiles,
  onUpload,
  onClose,
  onAllDone,
}: UploadSheetProps) {
  const [items, setItems] = useState<UploadSheetItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<UploadSheetItem[]>(items) as MutableRefObject<UploadSheetItem[]>;

  // Keep ref in sync with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Seed when the sheet opens / files change
  useEffect(() => {
    if (!open) return;
    setGlobalError('');
    if (initialFiles?.length) {
      setItems(initialFiles.map(makeItem));
    } else {
      setItems([]);
    }
  }, [open, initialFiles]);

  // Reset state when closed (after a short delay to avoid flicker)
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => {
      setItems([]);
      setUploading(false);
      setGlobalError('');
    }, 250);
    return () => window.clearTimeout(t);
  }, [open]);

  const addFiles = useCallback((files: File[] | FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setItems((prev) => [...prev, ...arr.map(makeItem)]);
  }, []);

  const removeItem = useCallback(
    (id: string) => {
      if (uploading) return;
      setItems((prev) => prev.filter((it) => it.id !== id));
    },
    [uploading],
  );

  const updateItem = useCallback((id: string, patch: Partial<UploadSheetItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const hasPending = useMemo(() => items.some((it) => it.status === 'pending' || it.status === 'error'), [items]);
  const allDone = useMemo(
    () => items.length > 0 && items.every((it) => it.status === 'done'),
    [items],
  );
  const queueStats = useMemo(() => ({
    done: items.filter((it) => it.status === 'done').length,
    active: items.filter((it) => ['preparing', 'uploading', 'finalizing'].includes(it.status)).length,
    waiting: items.filter((it) => it.status === 'pending').length,
    error: items.filter((it) => it.status === 'error').length,
  }), [items]);

  const beginUpload = useCallback(async () => {
    if (uploading) return;
    setUploading(true);
    setGlobalError('');

    // Sequential upload — keeps storage usage and progress predictable.
    for (const item of items) {
      if (item.status === 'done' || item.status === 'uploading') continue;
      updateItem(item.id, { status: 'preparing', progress: 0, error: undefined });
      try {
        // Read latest displayName/description from the ref (always up-to-date)
        const latest = itemsRef.current.find((it) => it.id === item.id) || item;

        await onUpload(
          {
            ...latest,
            status: 'preparing',
            progress: 0,
          },
          {
            onProgress: (pct: number) => {
              updateItem(item.id, { progress: Math.min(100, Math.max(0, pct)) });
            },
            onStatusChange: (status) => {
              updateItem(item.id, { status });
            },
          }
        );
        updateItem(item.id, { status: 'done', progress: 100 });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'فشل الرفع';
        updateItem(item.id, { status: 'error', error: message });
        setGlobalError(message);
      }
    }

    setUploading(false);
  }, [items, onUpload, updateItem, uploading]);

  // Trigger onAllDone outside of render to avoid loops
  useEffect(() => {
    if (allDone && !uploading) onAllDone?.();
  }, [allDone, uploading, onAllDone]);

  const handleSheetClose = () => {
    if (uploading) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSheetClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
          dir="rtl"
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="surface-floating accent-top relative flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden sm:h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-line/70 px-6 py-4">
              <div className="min-w-0">
                <span className="kicker">رفع ملفات</span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                  أضف وصفاً لكل ملف
                </h3>
                <p className="mt-1 text-xs leading-6 text-fg-3">
                  يمكنك تعديل الاسم المعروض وكتابة شرح/تعليق واضح لكل ملف قبل الرفع.
                  مناسبٌ تماماً لمشاركة الفيديوهات والدروس.
                </p>
              </div>
              <button
                onClick={handleSheetClose}
                disabled={uploading}
                className="btn-ghost h-8 w-8 rounded-lg border border-line/60 !p-0 text-fg-3 disabled:opacity-40"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto px-6 py-5">
              {/* Drop zone / add more */}
              <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDragOver={(e) => {
                  if (uploading) return;
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  if (uploading) return;
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`mb-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors ${
                  dragOver
                    ? 'border-brass bg-brass/10'
                    : 'border-line-strong bg-surface-1/60 hover:border-brass/40 hover:bg-surface-2/60'
                } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <UploadCloud className={`mb-2 h-8 w-8 ${dragOver ? 'text-brass' : 'text-fg-4'}`} />
                <p className="text-sm font-medium text-fg-1">
                  {items.length === 0 ? 'اسحب الملفات هنا أو انقر للاختيار' : 'إضافة ملفات أخرى'}
                </p>
                <p className="mt-1 text-xs text-fg-4">
                  نوعيات مدعومة: فيديو، صوت، صور، PDF، نصوص، وأي ملف عام.
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    if (inputRef.current) inputRef.current.value = '';
                  }}
                />
              </div>

              {/* Items */}
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line/70 bg-surface-1/40 p-6 text-center text-sm text-fg-4">
                  لا توجد ملفات بعد. اسحب أو انقر أعلاه لإضافتها.
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => {
                    const Icon = fileKindIcon(item.file);
                    const badge = kindBadge(item.file);
                    const ext = getExtension(item.file.name);
                    return (
                      <li
                        key={item.id}
                        className="surface-elevated relative overflow-hidden p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brass/25"
                            style={{
                              background:
                                'linear-gradient(180deg, hsl(var(--brass) / 0.18), hsl(var(--brass) / 0.04))',
                              boxShadow: 'inset 0 1px 0 0 hsl(var(--sheen) / 0.10)',
                            }}
                          >
                            <Icon className="h-5 w-5 text-brass-ring" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.tone}`}
                                >
                                  {badge.label}
                                </span>
                                <span className="truncate text-xs text-fg-4" title={item.file.name}>
                                  {item.file.name} · {fileService.formatSize(item.file.size)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <StatusPill item={item} uploading={uploading} />
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  disabled={uploading || item.status === 'uploading'}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line/60 text-fg-3 transition-colors hover:bg-brick/15 hover:text-brick-soft disabled:opacity-30"
                                  aria-label="إزالة"
                                  title="إزالة"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Display name */}
                            <div>
                              <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-fg-4">
                                الاسم المعروض
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  value={item.displayName}
                                  onChange={(e) =>
                                    updateItem(item.id, { displayName: e.target.value })
                                  }
                                  disabled={item.status === 'uploading' || item.status === 'done'}
                                  className="field disabled:opacity-60"
                                  placeholder="اسم واضح ومختصر للملف"
                                  maxLength={180}
                                />
                                {ext && (
                                  <span className="rounded-md border border-line bg-surface-2 px-2 py-1 text-[10px] text-fg-3">
                                    {ext}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <label className="mb-1 block text-[10px] uppercase tracking-[0.18em] text-fg-4">
                                التعليق / الشرح (يظهر مع الملف للمشاهدين)
                              </label>
                              <textarea
                                value={item.description}
                                onChange={(e) =>
                                  updateItem(item.id, { description: e.target.value })
                                }
                                disabled={item.status === 'uploading' || item.status === 'done'}
                                rows={2}
                                placeholder="مثال: شرح الفصل الثالث — اشتقاق الدوال المثلثية"
                                className="field resize-none disabled:opacity-60"
                                maxLength={2000}
                              />
                            </div>

                            {/* Progress */}
                            {['preparing', 'uploading', 'finalizing'].includes(item.status) && (
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                                <div
                                  className="h-full rounded-full bg-brass transition-all"
                                  style={{ width: `${Math.max(5, item.progress)}%` }}
                                />
                              </div>
                            )}

                            {uploading && item.status === 'pending' && (
                              <p className="rounded-lg border border-line/70 bg-surface-2/70 px-3 py-1.5 text-[11px] text-fg-3">
                                هذا الملف بانتظار انتهاء الملفات السابقة، وسيبدأ تلقائيًا دون الحاجة لأي إجراء إضافي.
                              </p>
                            )}

                            {item.status === 'error' && item.error && (
                              <p className="rounded-lg border border-brick/30 bg-brick/10 px-3 py-1.5 text-[11px] text-brick-soft">
                                {item.error}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 border-t border-line/70 bg-surface-1/60 px-6 py-4">
              <div className="space-y-2 text-xs text-fg-3">
                <div>
                  {items.length === 0
                    ? 'أضف ملفاً أو أكثر للبدء.'
                    : allDone
                      ? 'تم رفع كل الملفات بنجاح.'
                      : `${items.length} ملف ضمن قائمة الرفع.`}
                  {globalError && (
                    <span className="ms-3 text-brick-soft">· {globalError}</span>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-line/70 bg-surface-2 px-2 py-1 text-fg-3">تم: {queueStats.done}</span>
                    <span className="rounded-full border border-brass/20 bg-brass/10 px-2 py-1 text-brass-ring">نشط: {queueStats.active}</span>
                    <span className="rounded-full border border-line/70 bg-surface-2 px-2 py-1 text-fg-3">بانتظار الدور: {queueStats.waiting}</span>
                    {queueStats.error > 0 && (
                      <span className="rounded-full border border-brick/30 bg-brick/10 px-2 py-1 text-brick-soft">أخطاء: {queueStats.error}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => !uploading && inputRef.current?.click()}
                  disabled={uploading}
                  className="btn-secondary !py-2 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={handleSheetClose}
                  disabled={uploading}
                  className="btn-ghost !py-2 text-xs"
                >
                  {allDone ? 'إغلاق' : 'إلغاء'}
                </button>
                <button
                  type="button"
                  onClick={beginUpload}
                  disabled={!hasPending || uploading || items.length === 0}
                  className="btn-primary !py-2 text-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الرفع…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      ابدأ الرفع
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatusPill({ item, uploading }: { item: UploadSheetItem; uploading: boolean }) {
  if (item.status === 'done')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sage/30 bg-sage/10 px-2 py-0.5 text-[10px] text-sage">
        <CheckCircle2 className="h-3 w-3" /> تم
      </span>
    );
  if (item.status === 'preparing')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-surface-2 px-2 py-0.5 text-[10px] text-fg-3">
        <Loader2 className="h-3 w-3 animate-spin" /> تجهيز…
      </span>
    );
  if (item.status === 'uploading')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brass/30 bg-brass/10 px-2 py-0.5 text-[10px] text-brass-ring">
        <Loader2 className="h-3 w-3 animate-spin" /> {Math.max(0, Math.min(100, Math.round(item.progress)))}%
      </span>
    );
  if (item.status === 'finalizing')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brass/30 bg-brass/10 px-2 py-0.5 text-[10px] text-brass-ring">
        <Loader2 className="h-3 w-3 animate-spin" /> تثبيت…
      </span>
    );
  if (item.status === 'error')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brick/30 bg-brick/10 px-2 py-0.5 text-[10px] text-brick-soft">
        <AlertTriangle className="h-3 w-3" /> خطأ
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line/70 bg-surface-2 px-2 py-0.5 text-[10px] text-fg-3">
      {uploading ? 'بانتظار الدور' : 'جاهز'}
    </span>
  );
}
