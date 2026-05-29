// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/services/upload-service.ts
// PURPOSE: Robust prepare → token → direct put → finalize pipeline for Vercel Blob.
//          This project uses Firebase for auth/database and Vercel Blob for files.
// ═══════════════════════════════════════════════════════════════════════════════

import { put } from '@vercel/blob/client';
import { auth } from '@/lib/firebase';
import type { WorkspaceFile } from '@/types';

export type UploadStage = 'preparing' | 'uploading' | 'finalizing';
export type UploadOperation = 'create' | 'version';

export interface UploadOptions {
  onProgress?: (percentage: number) => void;
  onStageChange?: (stage: UploadStage) => void;
  signal?: AbortSignal;
  displayName?: string;
  description?: string;
  operation?: UploadOperation;
  fileId?: string;
}

export interface UploadResult {
  storagePath: string;
  file: WorkspaceFile;
}

interface PrepareResponse {
  uploadId: string;
  pathname: string;
  multipart: boolean;
}

interface TokenResponse {
  clientToken: string;
}

interface FinalizeResponse {
  file: WorkspaceFile;
}

function ensureSignedIn() {
  if (!auth.currentUser) {
    throw new Error('يجب تسجيل الدخول أولاً');
  }
}

function guessContentType(file: File) {
  if (file.type) return file.type;

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    md: 'text/markdown',
    txt: 'text/plain',
    json: 'application/json',
    csv: 'text/csv',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mov: 'video/quicktime',
  };

  return map[ext] || 'application/octet-stream';
}

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return {} as Record<string, unknown>;
  }
}

export async function uploadFileWithProgress(
  workspaceId: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    onProgress,
    onStageChange,
    signal,
    displayName,
    description,
    operation = 'create',
    fileId,
  } = options;

  ensureSignedIn();

  if (signal?.aborted) {
    throw new Error('تم إلغاء الرفع');
  }

  const idToken = await auth.currentUser!.getIdToken();
  const contentType = guessContentType(file);

  onStageChange?.('preparing');
  onProgress?.(5);

  const prepareResponse = await fetch('/api/uploads/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      workspaceId,
      fileName: file.name,
      displayName,
      description,
      mimeType: contentType,
      size: file.size,
      operation,
      fileId,
    }),
    signal,
  });

  if (!prepareResponse.ok) {
    const body = await readJsonSafe(prepareResponse);
    throw new Error(String(body.error || 'تعذر تهيئة جلسة الرفع'));
  }

  const prepared = (await prepareResponse.json()) as PrepareResponse;

  const tokenResponse = await fetch('/api/blob/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      workspaceId,
      uploadId: prepared.uploadId,
    }),
    signal,
  });

  if (!tokenResponse.ok) {
    const body = await readJsonSafe(tokenResponse);
    throw new Error(String(body.error || 'تعذر إنشاء توكين الرفع'));
  }

  const tokenData = (await tokenResponse.json()) as TokenResponse;

  onStageChange?.('uploading');
  onProgress?.(10);

  try {
    const blob = await put(prepared.pathname, file, {
      access: 'private',
      token: tokenData.clientToken,
      contentType,
      multipart: prepared.multipart,
      abortSignal: signal,
      onUploadProgress: (event) => {
        const mappedProgress = 10 + Math.round(event.percentage * 0.8);
        onProgress?.(Math.max(10, Math.min(90, mappedProgress)));
      },
    });

    onStageChange?.('finalizing');
    onProgress?.(95);

    const finalizeResponse = await fetch('/api/uploads/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        workspaceId,
        uploadId: prepared.uploadId,
        blobUrl: blob.url,
      }),
    });

    if (!finalizeResponse.ok) {
      const body = await readJsonSafe(finalizeResponse);
      throw new Error(String(body.error || 'تعذر تثبيت الملف بعد الرفع'));
    }

    const finalized = (await finalizeResponse.json()) as FinalizeResponse;
    onProgress?.(100);

    return {
      storagePath: blob.url,
      file: finalized.file,
    };
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('unauthorized')) {
      throw new Error('غير مصرح لك برفع الملفات');
    }

    if (message.includes('forbidden')) {
      throw new Error('تم رفض الرفع من Vercel Blob. غالباً التوكين أو نوع الملف غير مطابق.');
    }

    if (message.includes('pathname')) {
      throw new Error('مسار الملف غير متطابق مع توكين الرفع.');
    }

    if (message.includes('content type')) {
      throw new Error('نوع الملف غير مسموح للرفع.');
    }

    if (message.includes('failed to fetch')) {
      throw new Error('تعذر الوصول إلى خدمة الرفع. تأكد من إعدادات Vercel Functions و Blob.');
    }

    if (message.includes('bad request') || message.includes('upload') || message.includes('multipart')) {
      throw new Error('فشل الرفع المباشر إلى Vercel Blob.');
    }

    throw error;
  }
}
