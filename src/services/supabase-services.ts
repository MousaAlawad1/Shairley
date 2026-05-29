// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/services/supabase-services.ts
// PURPOSE: Firebase-backed file utility functions and realtime service.
//          Updated for private Vercel Blob — all reads go through /api/blob/sign
//          which verifies Firebase auth + workspace membership before issuing
//          a short-lived signed URL (1 hour TTL).
// ═══════════════════════════════════════════════════════════════════════════════

import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { errors } from '@/lib/errors';
import {
  workspaceFilesCollection,
  workspaceMembersCollection,
} from '@/lib/firebase-data';

// ─── Signed URL cache (avoid re-signing the same file within TTL) ─────────────
// key: storagePath, value: { url, expiresAt }
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 55 * 60 * 1000; // 55 min (refresh before 1h expiry)

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('يجب تسجيل الدخول أولاً');
  return user.getIdToken();
}

// ─── Core: get a signed URL for a private blob ────────────────────────────────
async function getSignedUrl(storagePath: string, workspaceId: string): Promise<string> {
  // Return cached URL if still valid
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const idToken = await getIdToken();
  const response = await fetch('/api/blob/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ workspaceId, storagePath }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(String(body.error || 'تعذر الحصول على رابط الملف'));
  }

  const { url } = await response.json() as { url: string };

  // Cache it
  signedUrlCache.set(storagePath, {
    url,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return url;
}

export const fileService = {
  // ─── Download — gets signed URL then triggers browser download ──────────────
  async downloadFile(
    storagePath: string,
    fileName: string,
    workspaceId?: string
  ): Promise<void> {
    try {
      const url = workspaceId
        ? await getSignedUrl(storagePath, workspaceId)
        : storagePath; // fallback for legacy calls without workspaceId

      const response = await fetch(url);
      if (!response.ok) throw new Error('فشل تحميل الملف');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
      throw errors.unknown('حدث خطأ أثناء تحميل الملف');
    }
  },

  // ─── Get signed URL for preview (viewer, PDF, video, image) ────────────────
  async getPreviewUrl(storagePath: string, workspaceId?: string): Promise<string> {
    if (!storagePath) return '';
    if (!workspaceId) return storagePath; // fallback
    return getSignedUrl(storagePath, workspaceId);
  },

  async getDownloadUrl(storagePath: string, workspaceId?: string): Promise<string> {
    return this.getPreviewUrl(storagePath, workspaceId);
  },

  // ─── Clear cache for a specific file (e.g. after delete) ───────────────────
  clearCachedUrl(storagePath: string) {
    signedUrlCache.delete(storagePath);
  },

  canPreview(mimeType: string): boolean {
    if (!mimeType) return false;
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/') ||
      mimeType === 'application/json'
    );
  },

  getFileKind(mimeType: string, fileName?: string): 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'other' {
    const mt = (mimeType || '').toLowerCase();
    if (mt.startsWith('image/')) return 'image';
    if (mt.startsWith('video/')) return 'video';
    if (mt.startsWith('audio/')) return 'audio';
    if (mt === 'application/pdf') return 'pdf';
    if (mt.startsWith('text/') || mt === 'application/json') return 'text';

    const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'webm', 'mov', 'mkv', 'm4v', 'ogv'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['txt', 'md', 'json', 'csv', 'log'].includes(ext)) return 'text';
    return 'other';
  },

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },
};

let fileUnsubscribe: (() => void) | null = null;
let memberUnsubscribe: (() => void) | null = null;

export const realtimeService = {
  subscribeToWorkspace(
    workspaceId: string,
    onFilesChange: () => void,
    onMembersChange: () => void
  ): void {
    this.unsubscribe();

    fileUnsubscribe = onSnapshot(
      query(workspaceFilesCollection(workspaceId), orderBy('created_at', 'desc')),
      () => onFilesChange(),
      () => onFilesChange()
    );

    memberUnsubscribe = onSnapshot(
      query(workspaceMembersCollection(workspaceId), orderBy('joined_at', 'asc')),
      () => onMembersChange(),
      () => onMembersChange()
    );
  },

  unsubscribe(): void {
    fileUnsubscribe?.();
    memberUnsubscribe?.();
    fileUnsubscribe = null;
    memberUnsubscribe = null;
  },
};
