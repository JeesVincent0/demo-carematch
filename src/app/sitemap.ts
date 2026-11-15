import type { MetadataRoute } from 'next';
import { services } from '@/modules/content';
import { db } from '@/lib/prisma';
import { publicWhere } from '@/modules/queries';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const workers = await db.workerProfile.findMany({
    where: publicWhere,
    select: { slug: true, updatedAt: true },
  });
  return [
    ...[
      '',
      '/about',
      '/services',
      '/how-it-works',
      '/become-a-professional',
      '/find-care',
      '/faq',
      '/contact',
      '/privacy',
      '/terms',
      ...services.map((s) => `/services/${s.slug}`),
    ].map((path) => ({ url: base + path, changeFrequency: 'weekly' as const })),
    ...workers.map((w) => ({ url: `${base}/professionals/${w.slug}`, lastModified: w.updatedAt })),
  ];
}
