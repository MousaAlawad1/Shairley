// ═══════════════════════════════════════════════════════════════════════════════
// FILE: api/blob/sign.ts
// PURPOSE: Generate a short-lived signed URL for a private Vercel Blob file.
//          Only authenticated workspace members can get a signed URL.
//          URL is valid for 1 hour.
// ═══════════════════════════════════════════════════════════════════════════════

import { issueSignedToken, presignUrl } from '@vercel/blob';
import { getAdminDb, verifyFirebaseUser } from '../_lib/firebase-admin.js';

interface SignBody {
  workspaceId?: string;
  storagePath?: string; // full blob URL e.g. https://xxx.vercel-storage.com/ws/file.pdf
}

// Extract the pathname from a full Vercel Blob URL
// e.g. "https://abc.vercel-storage.com/ws123/upload-abc-file.pdf" → "ws123/upload-abc-file.pdf"
function extractPathname(blobUrl: string): string {
  try {
    return new URL(blobUrl).pathname.slice(1); // remove leading "/"
  } catch {
    return blobUrl;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const decoded = await verifyFirebaseUser(request);
    const body = (await request.json()) as SignBody;

    const workspaceId = String(body.workspaceId || '').trim();
    const storagePath = String(body.storagePath || '').trim();

    if (!workspaceId || !storagePath) {
      throw new Error('workspaceId and storagePath are required');
    }

    // Verify the user is a member of this workspace
    const db = getAdminDb();
    const memberSnap = await db
      .doc(`workspaces/${workspaceId}/members/${decoded.uid}`)
      .get();

    if (!memberSnap.exists) {
      throw new Error('Access denied — not a workspace member');
    }

    const pathname = extractPathname(storagePath);

    // Issue a delegation token scoped to this file, valid 1 hour
    const signedToken = await issueSignedToken({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      pathname,
      allowedOperations: ['get'],
      validUntil: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // Presign the concrete URL
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: 'get',
      pathname,
      access: 'private',
      validUntil: Date.now() + 60 * 60 * 1000,
    });

    return Response.json({ url: presignedUrl });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
