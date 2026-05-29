// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/workspace/FilePreviewModal.tsx
// PURPOSE: Quick-look modal — Premium motion edition
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  MonitorPlay,
  UploadCloud,
  Loader2,
  History,
  MessageSquareText,
  SendHorizontal,
  Pencil,
  Save,
  FileText,
} from 'lucide-react';
import { WorkspaceFile, FileVersion, FileComment } from '@/types';
import { fileService } from '@/services/supabase-services';
import { PageLoader } from '@/components/common/PageLoader';
import MediaPlayer from '@/components/media/MediaPlayer';
import { overlayVariants, modalVariants, tapScale, spring } from '@/lib/motion';

interface FilePreviewModalProps {
  file: WorkspaceFile | null;
  previewUrl: string | null;
  loading: boolean;
  versions: FileVersion[];
  comments: FileComment[];
  versionUploading: boolean;
  versionUploadProgress: number;
  currentUserId?: string;
  onClose: () => void;
  onDownload: (file: WorkspaceFile) => void;
  onOpenViewer: (file: WorkspaceFile) => void;
  onAddComment: (content: string) => Promise<void>;
  onVersionUpload: (file: File) => Promise<void>;
  onDescriptionSave: (description: string) => Promise<void>;
  editingDescription: boolean;
  descriptionDraft: string;
  descriptionSaving: boolean;
  onDescriptionEditStart: () => void;
  onDescriptionEditCancel: () => void;
  onDescriptionChange: (value: string) => void;
}

export default function FilePreviewModal({
  file,
  previewUrl,
  loading,
  versions,
  comments,
  versionUploading,
  versionUploadProgress,
  currentUserId,
  onClose,
  onDownload,
  onOpenViewer,
  onAddComment,
  onVersionUpload,
  onDescriptionSave,
  editingDescription,
  descriptionDraft,
  descriptionSaving,
  onDescriptionEditStart,
  onDescriptionEditCancel,
  onDescriptionChange,
}: FilePreviewModalProps) {
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const versionInputRef = useRef<HTMLInputElement>(null);

  if (!file) return null;

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await onAddComment(commentInput.trim());
      setCommentInput('');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleVersionFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    await onVersionUpload(fileList[0]);
    if (versionInputRef.current) versionInputRef.current.value = '';
  };

  const kind = fileService.getFileKind(file.mime_type, file.name);

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-line/70 bg-surface-1/95 shadow-2xl backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4 gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{file.name}</h3>
              <p className="text-xs text-fg-4 mt-1">
                {fileService.formatSize(file.size)} • {file.uploaded_by_name}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                {...tapScale}
                onClick={() => { onClose(); onOpenViewer(file); }}
                className="btn-primary !py-1.5 !px-3 text-sm"
                title="فتح المشغل الكامل"
              >
                <MonitorPlay className="w-4 h-4" />
                <span className="hidden sm:block">المشغل الكامل</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="text-fg-3 hover:text-fg-1 p-1 rounded-lg hover:bg-surface-3 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* ── Content ── */}
          {loading ? (
            <div className="p-10">
              <PageLoader label="جاري تحميل تفاصيل الملف..." />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(340px,420px)] max-h-[calc(90vh-73px)] overflow-hidden">

              {/* ── Left Panel — Preview & Actions ── */}
              <div className="overflow-auto border-b lg:border-b-0 lg:border-l border-line p-6">

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <motion.button
                    {...tapScale}
                    onClick={() => onDownload(file)}
                    className="btn-primary"
                  >
                    <Download className="w-4 h-4" />
                    تحميل الملف
                  </motion.button>

                  <motion.button
                    {...tapScale}
                    onClick={() => versionInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    <UploadCloud className="w-4 h-4" />
                    رفع نسخة جديدة
                  </motion.button>
                  <input ref={versionInputRef} type="file" className="hidden" onChange={handleVersionFileSelected} />
                </div>

                {/* Version Upload Progress */}
                <AnimatePresence>
                  {versionUploading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 rounded-2xl border border-brand-accent/20 bg-brand-accent/10 p-4"
                    >
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>جاري رفع النسخة الجديدة...</span>
                        <span>{versionUploadProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${versionUploadProgress}%` }}
                          className="h-full bg-brand-accent rounded-full"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preview Area */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-line bg-surface-1 overflow-hidden"
                >
                  {!previewUrl ? (
                    <div className="p-10 text-center">
                      <FileText className="mx-auto mb-4 h-16 w-16 text-fg-4" />
                      <h4 className="mb-2 text-lg font-semibold">جاري تجهيز رابط المعاينة…</h4>
                      <p className="mb-5 text-sm leading-7 text-fg-3">سيكون بإمكانك التحميل والتفاعل بعد قليل.</p>
                    </div>
                  ) : kind === 'video' ? (
                    <MediaPlayer src={previewUrl} kind="video" />
                  ) : kind === 'audio' ? (
                    <div className="p-6">
                      <MediaPlayer src={previewUrl} kind="audio" title={file.name} />
                    </div>
                  ) : kind === 'image' ? (
                    <div className="p-2">
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="mx-auto max-h-[60vh] rounded-xl object-contain"
                      />
                    </div>
                  ) : kind === 'pdf' || kind === 'text' ? (
                    <iframe src={previewUrl} title={file.name} className="h-[60vh] w-full bg-white" />
                  ) : (
                    <div className="p-10 text-center">
                      <FileText className="mx-auto mb-4 h-16 w-16 text-fg-4" />
                      <h4 className="mb-2 text-lg font-semibold">لا توجد معاينة مباشرة لهذا النوع</h4>
                      <p className="mb-5 text-sm leading-7 text-fg-3">يمكنك تنزيل الملف وفتحه على جهازك.</p>
                      <motion.button {...tapScale} onClick={() => onDownload(file)} className="btn-primary mx-auto">
                        <Download className="h-4 w-4" />
                        تحميل الملف
                      </motion.button>
                    </div>
                  )}
                </motion.div>

                {/* Hint to open full viewer */}
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-fg-4">
                  <MonitorPlay className="h-3 w-3" />
                  <span>هذه معاينة سريعة — للمشغل الكامل مع كل الأدوات اضغط</span>
                  <button
                    onClick={() => { onClose(); onOpenViewer(file); }}
                    className="text-brand-accent hover:underline font-medium"
                  >
                    المشغل الكامل
                  </button>
                </div>

                {/* Description Section */}
                <section className="mt-5 rounded-2xl border border-line bg-surface-1/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-accent" />
                      <h4 className="font-semibold">الوصف / التعليق</h4>
                    </div>
                    {!editingDescription ? (
                      <motion.button {...tapScale} onClick={onDescriptionEditStart} className="btn-ghost !py-1.5 text-xs">
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <motion.button {...tapScale} onClick={onDescriptionEditCancel} disabled={descriptionSaving} className="btn-ghost !py-1.5 text-xs">
                          إلغاء
                        </motion.button>
                        <motion.button
                          {...tapScale}
                          onClick={() => onDescriptionSave(descriptionDraft)}
                          disabled={descriptionSaving}
                          className="btn-primary !py-1.5 text-xs"
                        >
                          {descriptionSaving
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Save className="h-3.5 w-3.5" />}
                          حفظ
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {editingDescription ? (
                    <textarea
                      value={descriptionDraft}
                      onChange={(e) => onDescriptionChange(e.target.value)}
                      rows={4}
                      placeholder="اكتب وصفاً أو تعليقاً واضحاً..."
                      className="field resize-none"
                      maxLength={2000}
                    />
                  ) : file.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-7 text-fg-2">{file.description}</p>
                  ) : (
                    <p className="text-sm leading-7 text-fg-4">لا يوجد وصف بعد.</p>
                  )}
                </section>
              </div>

              {/* ── Right Panel — Versions & Comments ── */}
              <div className="overflow-auto p-6 space-y-6">

                {/* Versions Section */}
                <section className="rounded-2xl border border-line bg-surface-1/70 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-brand-accent" />
                      <h4 className="font-semibold">سجل النسخ</h4>
                    </div>
                    <span className="text-xs text-fg-4">{versions.length} سجل</span>
                  </div>

                  <div className="space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-sm text-fg-4">لا توجد نسخ محفوظة.</p>
                    ) : (
                      versions.map((version) => (
                        <motion.div
                          key={`${version.id}-${version.version_number}`}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-line bg-surface-1/60 p-3 hover:border-brand-accent/20 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">الإصدار {version.version_number}</p>
                                {version.is_current && (
                                  <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[10px] text-sage">الحالي</span>
                                )}
                              </div>
                              <p className="text-xs text-fg-3 mt-1">
                                {version.uploaded_by_name} • {new Date(version.created_at).toLocaleString('ar')}
                              </p>
                              <p className="text-xs text-fg-4 mt-1">{fileService.formatSize(version.size)}</p>
                            </div>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => onDownload(version as unknown as WorkspaceFile)}
                              className="p-2 rounded-lg hover:bg-surface-2 transition-colors"
                            >
                              <Download className="w-4 h-4 text-fg-2" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </section>

                {/* Comments Section */}
                <section className="rounded-2xl border border-line bg-surface-1/70 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquareText className="w-4 h-4 text-brand-accent" />
                    <h4 className="font-semibold">التعليقات</h4>
                  </div>

                  {/* Comment Input */}
                  <div className="space-y-3 mb-4">
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="اكتب تعليقك هنا..."
                      rows={3}
                      className="field resize-none"
                    />
                    <motion.button
                      {...tapScale}
                      onClick={handleAddComment}
                      disabled={commentSubmitting || !commentInput.trim()}
                      className="btn-primary disabled:opacity-60"
                    >
                      {commentSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="w-4 h-4" />
                          إضافة تعليق
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-sm text-fg-4">لا توجد تعليقات بعد.</p>
                    ) : (
                      comments.map((comment) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-line bg-surface-1/60 p-3"
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-medium text-fg-2">{comment.user_name}</p>
                            <span className="text-[11px] text-fg-4">
                              {new Date(comment.created_at).toLocaleString('ar')}
                            </span>
                          </div>
                          <p className="text-sm leading-7 text-fg-2 whitespace-pre-wrap">{comment.content}</p>
                        </motion.div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}