import Link from 'next/link';
import {
  ArrowRight,
  HeartHandshake,
  MapPin,
  BadgeCheck,
  BriefcaseBusiness,
  SearchX,
} from 'lucide-react';
import type { PublicWorker } from '@/modules/queries';
import { money, label } from '@/lib/utils';
import { Button } from './ui/button';
import { SafeImage } from './interactive';
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="CareMatch home">
      <span className="logo-icon">
        <HeartHandshake size={24} />
      </span>
      Care<span>Match</span>
      <span className="logo-dot">.</span>
    </Link>
  );
}
export function Badge({ status, children }: { status?: string; children?: React.ReactNode }) {
  return (
    <span className={`badge ${status ? `badge-${status.toLowerCase()}` : ''}`}>
      {children || label(status || '')}
    </span>
  );
}
export function SectionHead({
  eyebrow,
  title,
  copy,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {copy && <p className="muted">{copy}</p>}
      </div>
      {href && (
        <Link href={href} className="text-link">
          {cta || 'Explore more'}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function ProfessionalCard({ worker: w }: { worker: PublicWorker }) {
  return (
    <article className="professional-card">
      <div className="professional-image">
        <SafeImage
          src={w.user.avatarUrl}
          alt={`Illustration of ${w.user.firstName}`}
          width={400}
          height={320}
        />
        <span className="image-badge">
          <BadgeCheck size={14} /> Demo reviewed
        </span>
      </div>
      <div className="professional-body">
        <div className="row between">
          <h3>
            {w.user.firstName} {w.user.lastName}
          </h3>
          <span className="rate">
            {money(w.hourlyRate)}
            <small>/hr</small>
          </span>
        </div>
        <p className="professional-title">{w.jobTitle || w.profession}</p>
        <div className="meta">
          <span>
            <MapPin size={14} />
            {w.city}
          </span>
          <span>
            <BriefcaseBusiness size={14} />
            {w.experienceYears} years&apos; experience
          </span>
        </div>
        <div className="tags">
          {w.skills.slice(0, 2).map((s) => (
            <span key={s.skillName}>{s.skillName}</span>
          ))}
        </div>
        <p className="bio-preview">{w.introduction}</p>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/professionals/${w.slug}`}>
            View profile <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    </article>
  );
}
export function Empty({
  title = 'Nothing here just yet',
  description,
  href,
  cta,
}: {
  title?: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="empty">
      <SearchX size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <Button asChild>
          <Link href={href}>{cta || 'Get started'}</Link>
        </Button>
      )}
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
