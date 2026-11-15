import { currentUser } from '@/lib/auth';
import { db } from '@/lib/prisma';
import { publiclyVisible } from '@/modules/domain';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
    const url = new URL(req.url);
    const userId = url.searchParams.get('user') || '';
    const u = await db.user.findUnique({ where: { id: userId }, include: { worker: true } });
    if (!u || !u.avatarUrl.startsWith(`/api/avatar/${id}?`))
      return new Response(null, { status: 404 });
    const viewer = await currentUser();
    if (
      !(u.worker && publiclyVisible({ ...u.worker, user: u })) &&
      viewer?.id !== u.id &&
      viewer?.role !== 'ADMIN'
    )
      return new Response(null, { status: 404 });
    const bytes = await readFile(
      /* turbopackIgnore: true */ path.resolve(process.env.UPLOAD_DIR || '.local/uploads', id),
    );
    return new Response(bytes, {
      headers: {
        'Content-Type': u.avatarUrl.endsWith('type=png') ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
