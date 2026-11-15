import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
export const publicSelect = {
  id: true,
  slug: true,
  profession: true,
  jobTitle: true,
  introduction: true,
  biography: true,
  experienceYears: true,
  hourlyRate: true,
  city: true,
  languages: true,
  specialisations: true,
  verificationStatus: true,
  skills: { select: { skillName: true } },
  services: { select: { serviceType: true } },
  qualifications: { select: { qualificationName: true, institution: true, yearCompleted: true } },
  availability: { select: { dayOfWeek: true, startTime: true, endTime: true, isAvailable: true } },
  user: { select: { firstName: true, lastName: true, avatarUrl: true } },
} satisfies Prisma.WorkerProfileSelect;
export type PublicWorker = Prisma.WorkerProfileGetPayload<{ select: typeof publicSelect }>;
export const publicWhere: Prisma.WorkerProfileWhereInput = {
  verificationStatus: 'APPROVED',
  isListed: true,
  user: { status: 'ACTIVE' },
};
export type SearchParams = Record<string, string | string[] | undefined>;
export const value = (p: SearchParams, k: string) =>
  typeof p[k] === 'string' ? (p[k] as string) : '';
export async function searchWorkers(p: SearchParams = {}) {
  const location = value(p, 'location').trim();
  const profession = value(p, 'profession');
  const care = value(p, 'care');
  const min = value(p, 'min');
  const max = value(p, 'max');
  const experience = value(p, 'experience');
  const language = value(p, 'language');
  const specialisation = value(p, 'specialisation');
  const day = value(p, 'day');
  const page = Math.max(1, Math.min(1000, Number(value(p, 'page')) || 1));
  const limit = 6;
  const where: Prisma.WorkerProfileWhereInput = {
    ...publicWhere,
    ...(location
      ? {
          OR: [
            { city: { contains: location, mode: 'insensitive' } },
            { postcode: { startsWith: location.replace(/\s/g, ''), mode: 'insensitive' } },
            { postcode: { startsWith: location, mode: 'insensitive' } },
            {
              postcode: {
                equals: location.replace(/\s/g, '').replace(/(.+)(.{3})$/, '$1 $2'),
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
    ...(profession ? { profession } : {}),
    ...(care ? { services: { some: { serviceType: care } } } : {}),
    ...(min || max
      ? {
          hourlyRate: {
            ...(min && Number.isFinite(+min) ? { gte: Math.max(0, +min) } : {}),
            ...(max && Number.isFinite(+max) ? { lte: Math.max(0, +max) } : {}),
          },
        }
      : {}),
    ...(experience && Number.isFinite(+experience)
      ? { experienceYears: { gte: Math.max(0, Math.floor(+experience)) } }
      : {}),
    ...(language ? { languages: { has: language } } : {}),
    ...(specialisation ? { specialisations: { has: specialisation } } : {}),
    ...(day !== '' && Number.isInteger(+day) && +day >= 0 && +day < 7
      ? { availability: { some: { dayOfWeek: +day, isAvailable: true } } }
      : {}),
  };
  const sort = value(p, 'sort');
  const orderBy: Prisma.WorkerProfileOrderByWithRelationInput[] =
    sort === 'price-low'
      ? [{ hourlyRate: 'asc' }, { id: 'asc' }]
      : sort === 'price-high'
        ? [{ hourlyRate: 'desc' }, { id: 'asc' }]
        : [{ experienceYears: 'desc' }, { id: 'asc' }];
  const [workers, total] = await db.$transaction([
    db.workerProfile.findMany({
      where,
      select: publicSelect,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.workerProfile.count({ where }),
  ]);
  return { workers, total, page, pages: Math.ceil(total / limit) };
}
