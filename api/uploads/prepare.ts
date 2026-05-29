import { randomUUID } from 'crypto';
import { getAdminDb, verifyFirebaseUser } from '../_lib/firebase-admin.js';

type UploadOperation = 'create' | 'version';

interface PrepareBody {
  workspaceId?: string;
  fileName?: string;
  displayName?: string;
  description?: string;
  mimeType?: string;
  size?: number;
  operation?: UploadOperation;
  fileId?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeFileName(name: string) {
  const cleaned = String(name || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  return cleaned || 'file';
}

function canWriteFiles(role?: string | null) {
  return ['owner', 'admin', 'member'].includes(String(role || ''));
}

export async function POST(request: Request): Promise<Response> {
  try {
    const decoded = await verifyFirebaseUser(request);
    const body = (await request.json()) as PrepareBody;

    const workspaceId = String(body.workspaceId || '').trim();
    const fileName = String(body.fileName || '').trim();
    const displayName = String(body.displayName || '').trim();
    const description = String(body.description || '').trim();
    const mimeType = String(body.mimeType || 'application/octet-stream').trim();
    const size = Number(body.size || 0);
    const operation: UploadOperation = body.operation === 'version' ? 'version' : 'create';
    const fileId = String(body.fileId || '').trim();

    if (!workspaceId || !fileName || !Number.isFinite(size) || size <= 0) {
      throw new Error('بيانات الرفع غير مكتملة');
    }

    if (operation === 'version' && !fileId) {
      throw new Error('معرّف الملف مطلوب لرفع نسخة جديدة');
    }

    const db = getAdminDb();
    const workspaceRef = db.doc(`workspaces/${workspaceId}`);
    const memberRef = db.doc(`workspaces/${workspaceId}/members/${decoded.uid}`);
    const [workspaceSnap, memberSnap, profileSnap] = await Promise.all([
      workspaceRef.get(),
      memberRef.get(),
      db.doc(`users/${decoded.uid}`).get(),
    ]);

    if (!workspaceSnap.exists) {
      throw new Error('مساحة العمل غير موجودة');
    }

    if (!memberSnap.exists || !canWriteFiles(memberSnap.get('role'))) {
      throw new Error('لا تملك صلاحية رفع الملفات');
    }

    if (operation === 'version') {
      const fileSnap = await db.doc(`workspaces/${workspaceId}/files/${fileId}`).get();
      if (!fileSnap.exists) {
        throw new Error('الملف الأصلي غير موجود');
      }
    }

    const uploadId = randomUUID();
    const targetFileId = operation === 'create' ? randomUUID() : fileId;
    const versionDocId = operation === 'version' ? randomUUID() : null;
    const pathname = `${workspaceId}/${uploadId}-${sanitizeFileName(fileName)}`;
    const uploadedByName =
      (profileSnap.exists ? String(profileSnap.get('full_name') || '') : '') ||
      decoded.name ||
      decoded.email ||
      'مستخدم';

    const uploadRef = db.doc(`workspaces/${workspaceId}/uploads/${uploadId}`);
    await uploadRef.set({
      id: uploadId,
      workspace_id: workspaceId,
      operation,
      status: 'prepared',
      user_id: decoded.uid,
      target_file_id: targetFileId,
      version_doc_id: versionDocId,
      file_name: fileName,
      display_name: displayName,
      description,
      mime_type: mimeType,
      size,
      pathname,
      uploaded_by_name: uploadedByName,
      created_at: nowIso(),
      updated_at: nowIso(),
    });

    return Response.json({
      uploadId,
      pathname,
      multipart: size > 100 * 1024 * 1024,
    });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
