import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/worker/',
        '/client/',
        '/api/',
        '/dashboard',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/sitemap.xml`,
  };
}
