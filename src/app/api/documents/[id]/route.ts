import { requireUser } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { AppError } from '@/lib/security';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await params;
    const d = await db.verificationDocument.findUnique({
      where: { id },
      include: { worker: true },
    });
    if (!d || (u.role !== 'ADMIN' && d.worker.userId !== u.id))
      throw new AppError('Document unavailable.', 404);
    const data = await readFile(
      /* turbopackIgnore: true */ path.resolve(
        process.env.UPLOAD_DIR || '.local/uploads',
        d.privateStorageKey,
      ),
    );
    return new Response(data, {
      headers: {
        'Content-Type': d.mimeType,
        'Content-Disposition': `attachment; filename="${d.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return Response.json(
      { error: 'Document unavailable.' },
      { status: e instanceof AppError ? e.status : 404 },
    );
  }
}
