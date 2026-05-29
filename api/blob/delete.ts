import { del } from '@vercel/blob';
import { verifyFirebaseUser } from '../_lib/firebase-admin.js';

interface DeleteBody {
  urls?: string[];
}

export async function POST(request: Request): Promise<Response> {
  try {
    await verifyFirebaseUser(request);
    const body = (await request.json()) as DeleteBody;
    const urls = Array.isArray(body.urls) ? body.urls.filter(Boolean) : [];

    if (urls.length === 0) {
      return Response.json({ ok: true, deleted: 0 });
    }

    await del(urls);
    return Response.json({ ok: true, deleted: urls.length });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
