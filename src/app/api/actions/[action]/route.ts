import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { AppError, rateLimit, sameOrigin } from '@/lib/security';
import * as service from '@/modules/services';
import { db } from '@/lib/prisma';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    sameOrigin(req);
    const { action } = await params;
    if (Number(req.headers.get('content-length') || 0) > 25000)
      throw new AppError('Request too large.', 413);
    const raw = await req.text();
    if (raw.length > 25000) throw new AppError('Request too large.', 413);
    const data = JSON.parse(raw);
    if (['register', 'forgot', 'reset'].includes(action)) {
      await rateLimit(`public:${action}`, 100);
      if (typeof data.email === 'string')
        await rateLimit(`${action}:${data.email.toLowerCase()}`, 8);
      const result =
        action === 'register'
          ? await service.register(data)
          : action === 'forgot'
            ? await service.forgot(data)
            : await service.resetPassword(data);
      return NextResponse.json({ ok: true, ...result });
    }
    const user = await requireUser();
    await rateLimit(`action:${user.id}`, 120);
    let result: unknown;
    switch (action) {
      case 'worker':
        result = await service.saveWorker(user, data);
        break;
      case 'draft':
        await service.saveDraft(user, data);
        break;
      case 'submit':
        await service.submitVerification(user);
        break;
      case 'review':
        await service.reviewWorker(user, data);
        break;
      case 'request':
        result = await service.createRequest(user, data);
        break;
      case 'request-status':
        await service.transitionRequest(user, data);
        break;
      case 'favourite':
        await service.favourite(user, data);
        break;
      case 'availability':
        await service.availability(user, data);
        break;
      case 'account-status':
        await service.accountStatus(user, data);
        break;
      case 'profile':
        await service.profile(user, data);
        break;
      case 'notifications':
        await db.notification.updateMany({
          where: { userId: user.id, isRead: false },
          data: { isRead: true },
        });
        break;
      case 'document-review': {
        if (user.role !== 'ADMIN') throw new AppError('Administrator permission required.', 403);
        const { id } = z.object({ id: z.uuid() }).parse(data);
        await db.$transaction(async (tx) => {
          const doc = await tx.verificationDocument.findUniqueOrThrow({
            where: { id },
            include: { worker: true },
          });
          if (doc.worker.verificationStatus !== 'UNDER_REVIEW')
            throw new AppError('Start the application review first.');
          await tx.verificationDocument.update({
            where: { id },
            data: { reviewStatus: 'REVIEWED' },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'Document manually reviewed',
              entityType: 'VerificationDocument',
              entityId: id,
            },
          });
        });
        break;
      }
      default:
        throw new AppError('Unknown action.', 404);
    }
    return NextResponse.json({ ok: true, ...(result && typeof result === 'object' ? result : {}) });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json(
        { error: e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
        { status: 400 },
      );
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof SyntaxError)
      return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034')
      return NextResponse.json({ error: 'This record changed. Please retry.' }, { status: 409 });
    console.error(e);
    return NextResponse.json(
      { error: 'Unable to complete this action. Please try again.' },
      { status: 500 },
    );
  }
}
