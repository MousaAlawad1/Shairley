import { getAdminDb, verifyFirebaseUser } from '../_lib/firebase-admin.js';

type UploadOperation = 'create' | 'version';

interface FinalizeBody {
  workspaceId?: string;
  uploadId?: string;
  blobUrl?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function mapSnapshot<T>(snapshot: FirebaseFirestore.DocumentSnapshot): T {
  return {
    id: snapshot.id,
    ...(snapshot.data() || {}),
  } as T;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const decoded = await verifyFirebaseUser(request);
    const body = (await request.json()) as FinalizeBody;
    const workspaceId = String(body.workspaceId || '').trim();
    const uploadId = String(body.uploadId || '').trim();
    const blobUrl = String(body.blobUrl || '').trim();

    if (!workspaceId || !uploadId || !blobUrl) {
      throw new Error('بيانات إنهاء الرفع غير مكتملة');
    }

    const db = getAdminDb();
    const uploadRef = db.doc(`workspaces/${workspaceId}/uploads/${uploadId}`);
    const uploadSnap = await uploadRef.get();

    if (!uploadSnap.exists) {
      throw new Error('جلسة الرفع غير موجودة');
    }

    const session = uploadSnap.data() as {
      operation?: UploadOperation;
      status?: string;
      user_id?: string;
      workspace_id?: string;
      target_file_id?: string;
      version_doc_id?: string | null;
      file_name?: string;
      display_name?: string;
      description?: string;
      mime_type?: string;
      size?: number;
      uploaded_by_name?: string;
    };

    if (session.user_id !== decoded.uid || session.workspace_id !== workspaceId) {
      throw new Error('غير مصرح لك بإكمال هذا الرفع');
    }

    const targetFileId = String(session.target_file_id || '').trim();
    if (!targetFileId) {
      throw new Error('معرّف الملف النهائي غير موجود');
    }

    const currentFileRef = db.doc(`workspaces/${workspaceId}/files/${targetFileId}`);

    if (session.status === 'finalized') {
      const existingSnap = await currentFileRef.get();
      if (existingSnap.exists) {
        return Response.json({ file: mapSnapshot(existingSnap) });
      }
    }

    await uploadRef.set(
      {
        status: 'finalizing',
        blob_url: blobUrl,
        updated_at: nowIso(),
      },
      { merge: true },
    );

    const operation: UploadOperation = session.operation === 'version' ? 'version' : 'create';

    if (operation === 'create') {
      const file = {
        id: targetFileId,
        workspace_id: workspaceId,
        name: String(session.display_name || '').trim() || String(session.file_name || 'file'),
        description: String(session.description || ''),
        size: Number(session.size || 0),
        mime_type: String(session.mime_type || 'application/octet-stream'),
        storage_path: blobUrl,
        uploaded_by: decoded.uid,
        uploaded_by_name: String(session.uploaded_by_name || decoded.name || decoded.email || 'مستخدم'),
        created_at: nowIso(),
      };

      const batch = db.batch();
      batch.set(currentFileRef, file);
      batch.set(
        uploadRef,
        {
          status: 'finalized',
          blob_url: blobUrl,
          finalized_at: nowIso(),
          updated_at: nowIso(),
        },
        { merge: true },
      );
      await batch.commit();

      return Response.json({ file });
    }

    const currentFileSnap = await currentFileRef.get();
    if (!currentFileSnap.exists) {
      throw new Error('الملف الحالي غير موجود');
    }

    const currentFile = mapSnapshot<Record<string, unknown>>(currentFileSnap);
    const highestVersionSnap = await db
      .collection(`workspaces/${workspaceId}/file_versions`)
      .where('file_id', '==', targetFileId)
      .orderBy('version_number', 'desc')
      .limit(1)
      .get();

    const nextVersionNumber = highestVersionSnap.empty
      ? 1
      : Number(highestVersionSnap.docs[0]?.get('version_number') || 0) + 1;

    const versionId = String(session.version_doc_id || '').trim();
    if (!versionId) {
      throw new Error('معرّف نسخة الملف غير موجود');
    }

    const archivedVersion = {
      id: versionId,
      file_id: targetFileId,
      workspace_id: workspaceId,
      version_number: nextVersionNumber,
      name: String(currentFile.name || ''),
      size: Number(currentFile.size || 0),
      mime_type: String(currentFile.mime_type || 'application/octet-stream'),
      storage_path: String(currentFile.storage_path || ''),
      uploaded_by: String(currentFile.uploaded_by || ''),
      uploaded_by_name: String(currentFile.uploaded_by_name || 'مستخدم'),
      created_at: String(currentFile.created_at || nowIso()),
      is_current: false,
    };

    const updatedFile = {
      ...currentFile,
      id: targetFileId,
      workspace_id: workspaceId,
      name: String(session.file_name || currentFile.name || 'file'),
      size: Number(session.size || currentFile.size || 0),
      mime_type: String(session.mime_type || currentFile.mime_type || 'application/octet-stream'),
      storage_path: blobUrl,
      uploaded_by: decoded.uid,
      uploaded_by_name: String(session.uploaded_by_name || decoded.name || decoded.email || 'مستخدم'),
      created_at: nowIso(),
    };

    const batch = db.batch();
    batch.set(db.doc(`workspaces/${workspaceId}/file_versions/${versionId}`), archivedVersion);
    batch.set(currentFileRef, updatedFile);
    batch.set(
      uploadRef,
      {
        status: 'finalized',
        blob_url: blobUrl,
        finalized_at: nowIso(),
        updated_at: nowIso(),
      },
      { merge: true },
    );
    await batch.commit();

    return Response.json({ file: updatedFile });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
