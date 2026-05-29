import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { getAdminDb, verifyFirebaseUser } from '../_lib/firebase-admin.js';

interface TokenBody {
  workspaceId?: string;
  uploadId?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const decoded = await verifyFirebaseUser(request);
    const body = (await request.json()) as TokenBody;
    const workspaceId = String(body.workspaceId || '').trim();
    const uploadId = String(body.uploadId || '').trim();

    if (!workspaceId || !uploadId) {
      throw new Error('بيانات التوكين غير مكتملة');
    }

    const db = getAdminDb();
    const uploadRef = db.doc(`workspaces/${workspaceId}/uploads/${uploadId}`);
    const uploadSnap = await uploadRef.get();

    if (!uploadSnap.exists) {
      throw new Error('جلسة الرفع غير موجودة');
    }

    if (uploadSnap.get('user_id') !== decoded.uid) {
      throw new Error('غير مصرح لك بالرفع');
    }

    const status = String(uploadSnap.get('status') || '');
    if (!['prepared', 'uploading'].includes(status)) {
      throw new Error('جلسة الرفع في حالة غير صالحة');
    }

    const pathname = String(uploadSnap.get('pathname') || '').trim();
    const size = Number(uploadSnap.get('size') || 0);
    const mimeType = String(uploadSnap.get('mime_type') || '').trim();

    if (!pathname) {
      throw new Error('مسار الملف غير موجود');
    }

    const token = await generateClientTokenFromReadWriteToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname,
      addRandomSuffix: false,
      maximumSizeInBytes: Number.isFinite(size) && size > 0 ? size : undefined,
      allowedContentTypes:
        mimeType && mimeType !== 'application/octet-stream'
          ? [mimeType]
          : undefined,
      validUntil: Date.now() + 60 * 60 * 1000,
    });

    return Response.json({ clientToken: token });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
