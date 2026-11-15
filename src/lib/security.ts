import { db } from './prisma';
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function rateLimit(key: string, limit = 15, minutes = 15) {
  const now = new Date();
  const row = await db.rateLimit.upsert({
    where: { key },
    create: { key, windowStart: now },
    update: { count: { increment: 1 } },
  });
  if (now.getTime() - row.windowStart.getTime() > minutes * 60000) {
    await db.rateLimit.update({ where: { key }, data: { count: 1, windowStart: now } });
    return;
  }
  if (row.count > limit) throw new AppError('Too many attempts. Please try again later.', 429);
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(process.env.NEXTAUTH_URL || req.url).origin)
    throw new AppError('Invalid request origin.', 403);
}
