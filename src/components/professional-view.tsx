'use client';
import { useCallback } from 'react';
import { DemoView } from '@/components/demo-view';
import Link from 'next/link';
import { notFound } from '@/components/demo-view';
import { BadgeCheck, MapPin, BriefcaseBusiness, Languages } from 'lucide-react';
import { demoRepository as db } from '@/lib/demo/repository';
import { currentUser } from '@/lib/auth';
import { publicSelect, publicWhere } from '@/modules/queries';
import { days } from '@/modules/domain';
import { money } from '@/lib/utils';
import { SafeImage, FavouriteButton } from '@/components/interactive';
import { BookingForm } from '@/components/forms';
async function renderProfessional({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [w, u] = await Promise.all([
    db.workerProfile.findFirst({ where: { ...publicWhere, slug }, select: publicSelect }),
    currentUser(),
  ]);
  if (!w) notFound();
  const favourite =
    u?.role === 'CLIENT'
      ? await db.favourite.findFirst({ where: { workerId: w.id, client: { userId: u.id } } })
      : null;
  return (
    <div className="container">
      <div className="breadcrumb">
        <Link href="/find-care">Find care</Link> / {w.user.firstName} {w.user.lastName}
      </div>
      <div className="profile-header">
        <SafeImage
          src={w.user.avatarUrl}
          alt={`Illustration of ${w.user.firstName}`}
          width={155}
          height={165}
          className="profile-photo"
        />
        <div>
          <span className="badge badge-approved">
            <BadgeCheck size={14} /> Internally reviewed · Demo profile
          </span>
          <h1>
            {w.user.firstName} {w.user.lastName}
          </h1>
          <p className="professional-title">{w.jobTitle || w.profession}</p>
          <div className="meta">
            <span>
              <MapPin size={15} />
              {w.city}
            </span>
            <span>
              <BriefcaseBusiness size={15} />
              {w.experienceYears} years&apos; experience
            </span>
          </div>
        </div>
        {(!u || u.role === 'CLIENT') && (
          <FavouriteButton workerId={w.id} slug={w.slug} saved={!!favourite} loggedIn={!!u} />
        )}
      </div>
      <div className="profile-layout">
        <div className="profile-sections">
          <section className="content-card">
            <h2>A little about me</h2>
            <p style={{ whiteSpace: 'pre-line' }}>{w.biography}</p>
          </section>
          <section className="content-card">
            <h2>Experience & qualifications</h2>
            <p>
              {w.experienceYears} years of experience supporting people with compassionate,
              person-centred care.
            </p>
            {w.qualifications.map((q) => (
              <div className="row" key={q.qualificationName} style={{ marginTop: 15 }}>
                <BriefcaseBusiness size={18} color="var(--primary)" />
                <div>
                  <strong>{q.qualificationName}</strong>
                  {q.institution && (
                    <p className="small muted">
                      {q.institution} · {q.yearCompleted}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <p className="small">
              Qualifications are supplied for this fictional demo. No external register checks have
              been performed.
            </p>
          </section>
          <section className="content-card">
            <h2>Skills & specialisations</h2>
            <div className="tags">
              {[...w.skills.map((s) => s.skillName), ...w.specialisations].map((s, i) => (
                <span key={`${s}-${i}`}>{s}</span>
              ))}
            </div>
          </section>
          <section className="content-card">
            <h2>How I can help</h2>
            <div className="tags">
              {w.services.map((s) => (
                <span key={s.serviceType}>{s.serviceType}</span>
              ))}
            </div>
            <h3 style={{ marginTop: 24 }}>Languages</h3>
            <p className="row">
              <Languages size={17} />
              {w.languages.join(', ')}
            </p>
          </section>
          <section className="content-card">
            <h2>Weekly availability</h2>
            <p className="small">
              UK local time. Final arrangements are subject to the professional&apos;s response.
            </p>
            {days.map((d, i) => {
              const a = w.availability.find((a) => a.dayOfWeek === i);
              return (
                <div
                  className="row between"
                  style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}
                  key={d}
                >
                  <span>{d}</span>
                  <span className="small muted">
                    {a?.isAvailable ? `${a.startTime} – ${a.endTime}` : 'Not available'}
                  </span>
                </div>
              );
            })}
          </section>
        </div>
        <aside className="content-card booking-card">
          <div className="rate">
            {money(w.hourlyRate)}
            <small> / hour</small>
          </div>
          <p>Indicative rate. Let&apos;s start with a request.</p>
          <BookingForm
            workerId={w.id}
            services={w.services.map((s) => s.serviceType)}
            loggedIn={!!u}
            slug={w.slug}
            role={u?.role}
          />
        </aside>
      </div>
    </div>
  );
}

export default function Professional({ slug }: { slug: string }) {
  const load = useCallback(() => renderProfessional({ params: Promise.resolve({ slug }) }), [slug]);
  return <DemoView load={load} />;
}
