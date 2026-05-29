import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getAdminDb, verifyFirebaseIdToken } from '../_lib/firebase-admin.js';

function nowIso() {
  return new Date().toISOString();
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const db = getAdminDb();
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload, multipart) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};
        const idToken = typeof payload?.idToken === 'string' ? payload.idToken : '';
        const workspaceId = typeof payload?.workspaceId === 'string' ? payload.workspaceId : '';
        const uploadId = typeof payload?.uploadId === 'string' ? payload.uploadId : '';

        if (!idToken || !workspaceId || !uploadId) {
          throw new Error('Unauthorized');
        }

        const decoded = await verifyFirebaseIdToken(idToken);
        const uploadRef = db.doc(`workspaces/${workspaceId}/uploads/${uploadId}`);
        const uploadSnap = await uploadRef.get();

        if (!uploadSnap.exists) {
          throw new Error('جلسة الرفع غير موجودة');
        }

        if (uploadSnap.get('user_id') !== decoded.uid) {
          throw new Error('غير مصرح لك بالرفع');
        }

        if (String(uploadSnap.get('status') || '') !== 'prepared') {
          throw new Error('جلسة الرفع في حالة غير صالحة');
        }

        await uploadRef.set(
          {
            status: 'uploading',
            updated_at: nowIso(),
          },
          { merge: true },
        );

        return {
          addRandomSuffix: false,
          multipart,
          tokenPayload: JSON.stringify({
            uid: decoded.uid,
            workspaceId,
            uploadId,
          }),
        };
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error('[blob/upload] error:', error);
    return Response.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
