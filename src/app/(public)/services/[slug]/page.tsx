import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { services } from '@/modules/content';
import { PageIntro } from '@/components/shared';
import { Button } from '@/components/ui/button';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = services.find((s) => s.slug === slug);
  return { title: s?.title, description: s?.copy };
}
export default async function Service({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = services.find((s) => s.slug === slug);
  if (!s) notFound();
  return (
    <div className="container page-section">
      <div className="breadcrumb">
        <Link href="/services">Our services</Link> / {s.title}
      </div>
      <PageIntro eyebrow="Thoughtful support, close to home" title={s.title} description={s.copy} />
      <div className="content-grid">
        <div className="content-card">
          <h2>Care that starts with you.</h2>
          <p>{s.detail}</p>
          <p>
            Explore professional profiles, read about their experience and select the support that
            fits your preferences. The rates shown are indicative, and every request stays visible
            in your dashboard.
          </p>
          <Button asChild>
            <Link href={`/find-care?care=${encodeURIComponent(s.care)}`}>
              Explore {s.title.toLowerCase()} <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="content-card">
          <h2>What to consider</h2>
          {[
            'The experience and skills relevant to your needs',
            'Preferred days, times and general location',
            'Languages and personal preferences',
            'The professional’s indicative hourly rate',
          ].map((t) => (
            <p className="row" key={t}>
              <Check size={16} color="var(--primary)" />
              {t}
            </p>
          ))}
          <p className="small">
            This is a fictional demonstration. No clinical service or external credential
            verification is provided.
          </p>
        </div>
      </div>
    </div>
  );
}
