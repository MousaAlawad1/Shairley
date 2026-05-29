// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useWorkspaceFiles.ts
// PURPOSE: Custom hook for workspace files state & logic (extracted from WorkspacePage)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { supabaseWorkspaceService } from '@/services/api-services';
import { fileService } from '@/services/supabase-services';
import {
  WorkspaceFile,
  PaginationMeta,
  FileTypeFilter,
  FileSortBy,
  FileVersion,
  FileComment,
} from '@/types';

const FILES_LIMIT = 12;
const FILE_COMMENTS_LIMIT = 20;

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 1,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export function useWorkspaceFiles(workspaceId: string | undefined) {
  // ─── Files list state ───────────────────────────────────────────────────
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [filesPagination, setFilesPagination] = useState<PaginationMeta>(emptyPagination);
  const [filesPage, setFilesPage] = useState(1);
  const [filesLoading, setFilesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>('all');
  const [fileSortBy, setFileSortBy] = useState<FileSortBy>('newest');
  const [filesError, setFilesError] = useState('');

  // ─── Preview/detail state ────────────────────────────────────────────────
  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [fileComments, setFileComments] = useState<FileComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [versionUploading, setVersionUploading] = useState(false);
  const [versionUploadProgress, setVersionUploadProgress] = useState(0);
  const [descEditing, setDescEditing] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  // ─── Rename state ────────────────────────────────────────────────────────
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  // ─── Delete state ────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<WorkspaceFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Load files ──────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    if (!workspaceId) return;
    setFilesLoading(true);
    try {
      const result = await supabaseWorkspaceService.getFiles(workspaceId, {
        page: filesPage,
        limit: FILES_LIMIT,
        search: searchQuery.trim() || undefined,
      });
      setFiles(result.data);
      setFilesPagination(result.pagination);
      setFilesError('');
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'تعذر تحميل الملفات');
    } finally {
      setFilesLoading(false);
    }
  }, [workspaceId, filesPage, searchQuery]);

  // ─── Reset to page 1 on search change ───────────────────────────────────
  useEffect(() => {
    setFilesPage(1);
  }, [searchQuery]);

  // ─── Load file details ───────────────────────────────────────────────────
  const loadFileDetails = useCallback(async (selectedFile: WorkspaceFile) => {
    if (!workspaceId) return;
    setDetailLoading(true);
    setFilesError('');
    setPreviewFile(selectedFile);
    setCommentInput('');
    setDescEditing(false);
    setDescDraft(selectedFile.description || '');

    try {
      const [versions, comments, signedUrl] = await Promise.all([
        supabaseWorkspaceService.getFileVersions(workspaceId, selectedFile.id),
        supabaseWorkspaceService.getFileComments(workspaceId, selectedFile.id, {
          page: 1,
          limit: FILE_COMMENTS_LIMIT,
        }),
        fileService.canPreview(selectedFile.mime_type)
          ? fileService.getPreviewUrl(selectedFile.storage_path, workspaceId)
          : Promise.resolve(''),
      ]);

      setFileVersions(versions);
      setFileComments(comments.data);
      setPreviewUrl(signedUrl || null);
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'تعذر تحميل تفاصيل الملف');
    } finally {
      setDetailLoading(false);
    }
  }, [workspaceId]);

  // ─── Close preview ───────────────────────────────────────────────────────
  const closePreview = useCallback(() => {
    setPreviewFile(null);
    setPreviewUrl(null);
    setFileComments([]);
    setFileVersions([]);
  }, []);

  // ─── Add comment ─────────────────────────────────────────────────────────
  const addComment = useCallback(async (content: string) => {
    if (!workspaceId || !previewFile) return;
    try {
      const comment = await supabaseWorkspaceService.addFileComment(workspaceId, previewFile.id, content);
      setFileComments((curr) => [comment, ...curr]);
      setCommentInput('');
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'تعذر إضافة التعليق');
    }
  }, [workspaceId, previewFile]);

  // ─── Upload version ──────────────────────────────────────────────────────
  const uploadVersion = useCallback(async (file: File, onRefresh: () => Promise<void>) => {
    if (!workspaceId || !previewFile) return;
    setVersionUploading(true);
    setVersionUploadProgress(0);
    setFilesError('');
    try {
      const updated = await supabaseWorkspaceService.uploadFileVersion(
        workspaceId,
        previewFile.id,
        file,
        setVersionUploadProgress
      );
      setPreviewFile(updated);
      await Promise.all([onRefresh(), loadFileDetails(updated)]);
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'تعذر رفع النسخة الجديدة');
    } finally {
      setVersionUploading(false);
      setVersionUploadProgress(0);
    }
  }, [workspaceId, previewFile, loadFileDetails]);

  // ─── Save description ────────────────────────────────────────────────────
  const saveDescription = useCallback(async (description: string, onRefresh: () => Promise<void>) => {
    if (!workspaceId || !previewFile) return;
    try {
      const updated = await supabaseWorkspaceService.updateFile(workspaceId, previewFile.id, { description });
      setPreviewFile({ ...previewFile, ...updated });
      setFiles((curr) => curr.map((f) => (f.id === previewFile.id ? { ...f, ...updated } : f)));
      setDescEditing(false);
      await onRefresh();
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'تعذر حفظ الوصف');
    }
  }, [workspaceId, previewFile]);

  // ─── Rename handlers ─────────────────────────────────────────────────────
  const startRename = useCallback((file: WorkspaceFile) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const confirmRename = useCallback(async (file: WorkspaceFile, onRefresh: () => Promise<void>) => {
    if (!workspaceId) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === file.name) {
      cancelRename();
      return;
    }
    setRenameSaving(true);
    setFilesError('');
    try {
      const updated = await supabaseWorkspaceService.updateFile(workspaceId, file.id, { name: trimmed });
      setFiles((curr) => curr.map((f) => (f.id === file.id ? { ...f, ...updated } : f)));
      if (previewFile?.id === file.id) setPreviewFile({ ...previewFile, ...updated });
      cancelRename();
      await onRefresh();
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'تعذر إعادة تسمية الملف');
    } finally {
      setRenameSaving(false);
    }
  }, [workspaceId, renameValue, previewFile, cancelRename]);

  // ─── Delete handler ──────────────────────────────────────────────────────
  const deleteFile = useCallback(async (file: WorkspaceFile, onRefresh: () => Promise<void>) => {
    if (!workspaceId) return;
    setDeleting(true);
    try {
      await supabaseWorkspaceService.deleteFile(workspaceId, file.id);
      setDeleteConfirm(null);
      closePreview();
      await onRefresh();
    } catch (err: unknown) {
      setFilesError(err instanceof Error ? err.message : 'تعذر حذف الملف');
    } finally {
      setDeleting(false);
    }
  }, [workspaceId, closePreview]);

  // ─── Copy file link ──────────────────────────────────────────────────────
  const copyFileLink = useCallback((file: WorkspaceFile) => {
    const link = file.storage_path;
    navigator.clipboard.writeText(link).catch(() => undefined);
  }, []);

  return {
    // Files list
    files,
    setFiles,
    filesPagination,
    filesPage,
    setFilesPage,
    filesLoading,
    searchQuery,
    setSearchQuery,
    fileTypeFilter,
    setFileTypeFilter,
    fileSortBy,
    setFileSortBy,
    filesError,
    setFilesError,
    loadFiles,
    // Preview
    previewFile,
    setPreviewFile,
    previewUrl,
    setPreviewUrl,
    detailLoading,
    fileVersions,
    fileComments,
    commentInput,
    setCommentInput,
    versionUploading,
    versionUploadProgress,
    descEditing,
    setDescEditing,
    descDraft,
    setDescDraft,
    loadFileDetails,
    closePreview,
    addComment,
    uploadVersion,
    saveDescription,
    // Rename
    renamingId,
    renameValue,
    setRenameValue,
    renameSaving,
    startRename,
    cancelRename,
    confirmRename,
    // Delete
    deleteConfirm,
    setDeleteConfirm,
    deleting,
    deleteFile,
    // Misc
    copyFileLink,
  };
}
