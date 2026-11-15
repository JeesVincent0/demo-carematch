import { requireUser } from '@/lib/auth';
import { AppError, sameOrigin, rateLimit } from '@/lib/security';
import { db } from '@/lib/prisma';
import { documentTypes } from '@/modules/domain';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  let storagePath: string | undefined;
  try {
    sameOrigin(req);
    const user = await requireUser();
    await rateLimit(`upload:${user.id}`, 25);
    if (Number(req.headers.get('content-length') || 0) > 6 * 1024 * 1024)
      throw new AppError('Maximum upload size is 5 MB.');
    const form = await req.formData();
    const file = form.get('file');
    const type = String(form.get('type'));
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || file.size < 8)
      throw new AppError('Choose a PDF, PNG or JPEG up to 5 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime =
      bytes.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? 'image/jpeg'
            : null;
    if (!mime || file.type !== mime)
      throw new AppError('The file content must be a valid PDF, PNG or JPEG.');
    const key = randomUUID();
    const root = path.resolve(
      /* turbopackIgnore: true */ process.env.UPLOAD_DIR || '.local/uploads',
    );
    await mkdir(root, { recursive: true });
    storagePath = path.join(/* turbopackIgnore: true */ root, key);
    if (type === 'avatar') {
      if (mime === 'application/pdf') throw new AppError('Choose a PNG or JPEG profile photo.');
      await writeFile(storagePath, bytes, { mode: 0o600 });
      await db.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: `/api/avatar/${key}?user=${user.id}&type=${mime === 'image/png' ? 'png' : 'jpeg'}`,
        },
      });
      return NextResponse.json({ ok: true });
    }
    if (user.role !== 'WORKER' || !documentTypes.includes(type as (typeof documentTypes)[number]))
      throw new AppError('Invalid document type.', 403);
    const w = await db.workerProfile.findUniqueOrThrow({ where: { userId: user.id } });
    if (!['DRAFT', 'REJECTED'].includes(w.verificationStatus))
      throw new AppError(
        'Documents are locked during review. Change credentials in your profile to request re-review.',
      );
    await writeFile(storagePath, bytes, { mode: 0o600 });
    await db.$transaction(async (tx) => {
      const changed = await tx.workerProfile.updateMany({
        where: {
          id: w.id,
          updatedAt: w.updatedAt,
          verificationStatus: { in: ['DRAFT', 'REJECTED'] },
        },
        data: { updatedAt: new Date() },
      });
      if (!changed.count) throw new AppError('Application changed. Refresh and try again.', 409);
      await tx.verificationDocument.create({
        data: {
          workerId: w.id,
          documentType: type,
          privateStorageKey: key,
          originalFileName: path.basename(file.name).slice(0, 200),
          mimeType: mime,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (storagePath) await unlink(storagePath).catch(() => {});
    return NextResponse.json(
      { error: e instanceof AppError ? e.message : 'Upload failed. Please try again.' },
      { status: e instanceof AppError ? e.status : 500 },
    );
  }
}
