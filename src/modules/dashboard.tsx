'use client';
import { useCallback } from 'react';
import { DemoView, redirect, notFound } from '@/components/demo-view';
import { ResetDemo } from '@/components/demo-controls';
import Link from 'next/link';

import {
  CalendarDays,
  Clock,
  Heart,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Bell,
} from 'lucide-react';
import type { Role, User, RequestWithPeople } from '@/lib/demo/types';
import { currentUser } from '@/lib/auth';
import { demoRepository as db, type Where } from '@/lib/demo/repository';
import { date, label, money } from '@/lib/utils';
import { publicSelect, publicWhere, type SearchParams, value } from './queries';
import { Logo, Badge, Empty, ProfessionalCard } from '@/components/shared';
import { Logout, SafeImage, ActionButton, Upload } from '@/components/interactive';
import { DashboardNav } from '@/components/dashboard-nav';
import { Button } from '@/components/ui/button';
import { ProfileForm, AvailabilityForm } from '@/components/forms';
import { Onboarding } from '@/components/onboarding';
import { Analytics, UsersTable, ReviewActions } from '@/components/admin';
async function renderDashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: Role;
}) {
  const u = await currentUser();
  if (!u) redirect('/login');
  if (u.role !== role)
    return (
      <main id="main" className="container section">
        <Empty
          title="This area is restricted"
          description="Your account does not have access to this dashboard."
          href="/dashboard"
          cta="Go to your dashboard"
        />
      </main>
    );
  return (
    <div className={`dashboard-shell ${role === 'ADMIN' ? 'admin-shell' : ''}`}>
      <aside className="sidebar">
        <Logo />
        <div className="sidebar-label">
          {role === 'ADMIN'
            ? 'Platform workspace'
            : role === 'WORKER'
              ? 'Professional workspace'
              : 'Your care, connected'}
        </div>
        <DashboardNav role={role.toLowerCase()} />
        <div className="sidebar-bottom">
          <Link href="/">← Back to CareMatch</Link>
          <Logout />
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <span>
            {role === 'ADMIN'
              ? 'Platform management'
              : role === 'WORKER'
                ? 'Your professional space'
                : 'A little support, all in one place'}
          </span>
          <div className="dashboard-user">
            <Link
              href={`/${role.toLowerCase()}/${role === 'ADMIN' ? 'activity' : 'notifications'}`}
              aria-label="View recent updates"
            >
              <Bell size={18} />
            </Link>
            <SafeImage src={u.avatarUrl} alt="Your avatar" width={33} height={33} />
            <div>
              <strong>
                {u.firstName} {u.lastName}
              </strong>
              <small>{label(u.role)} account</small>
            </div>
          </div>
        </header>
        <main id="main" className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}
const heading = (title: string, description: string, cta?: React.ReactNode) => (
  <div className="dashboard-heading">
    <div>
      <p className="eyebrow">Your CareMatch</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {cta}
  </div>
);
function Stats({ items }: { items: [string, number | string, typeof Users][] }) {
  return (
    <div className="stat-grid">
      {items.map(([name, count, Icon]) => (
        <div className="stat-card" key={name}>
          <div className="row">
            <span>{name}</span>
            <Icon />
          </div>
          <strong>{count}</strong>
          <small>From your CareMatch records</small>
        </div>
      ))}
    </div>
  );
}
const requestInclude = {
  client: {
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
  },
  worker: {
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
  },
};

function RequestActions({ r, role }: { r: RequestWithPeople; role: Role }) {
  return (
    <div className="request-actions">
      <Button asChild variant="outline">
        <Link href={`/${role.toLowerCase()}/requests/${r.id}`}>View details</Link>
      </Button>
      {role === 'WORKER' && r.status === 'PENDING' && (
        <>
          <ActionButton
            name="request-status"
            data={{ id: r.id, status: 'ACCEPTED' }}
            confirm="Accept this demo care request? The client will receive an in-app notification."
            message="Care request accepted"
          >
            Accept
          </ActionButton>
          <ActionButton
            name="request-status"
            variant="outline"
            data={{ id: r.id, status: 'DECLINED' }}
            confirm="Decline this request? The client will be notified."
            message="Care request declined"
          >
            Decline
          </ActionButton>
        </>
      )}
      {role === 'CLIENT' && ['PENDING', 'ACCEPTED'].includes(r.status) && (
        <ActionButton
          name="request-status"
          variant="outline"
          data={{ id: r.id, status: 'CANCELLED' }}
          confirm="Cancel this care request? This cannot be undone."
          message="Care request cancelled"
        >
          Cancel
        </ActionButton>
      )}
      {role !== 'ADMIN' && r.status === 'ACCEPTED' && (
        <ActionButton
          name="request-status"
          variant="outline"
          data={{ id: r.id, status: 'COMPLETED' }}
          confirm="Record this request as completed for the demonstration? No real service or payment is implied."
          message="Demo completion recorded"
        >
          Complete (demo)
        </ActionButton>
      )}
    </div>
  );
}
function RequestList({ requests, role }: { requests: RequestWithPeople[]; role: Role }) {
  if (!requests.length)
    return (
      <Empty
        title="Your next connection starts here."
        description={
          role === 'CLIENT'
            ? 'Find a professional and send your first care request.'
            : 'New care requests will appear here when clients get in touch.'
        }
        href={role === 'CLIENT' ? '/find-care' : undefined}
        cta="Explore care"
      />
    );
  return (
    <div className="stack">
      {requests.map((r) => {
        const person = role === 'WORKER' ? r.client.user : r.worker.user;
        return (
          <article className="request-card" key={r.id}>
            <SafeImage src={person.avatarUrl} alt="Profile illustration" width={65} height={70} />
            <div className="request-card-info">
              <h3>
                {person.firstName} {person.lastName}
              </h3>
              <p>
                {r.careType}
                {role === 'ADMIN'
                  ? ` · Client: ${r.client.user.firstName} ${r.client.user.lastName}`
                  : ''}
              </p>
              <div className="meta">
                <span>
                  {date(r.requestedDate)} · {r.startTime}
                </span>
                <span>
                  {r.durationHours} hours · {r.generalLocation}
                </span>
              </div>
            </div>
            <Badge status={r.status} />
            <RequestActions r={r} role={role} />
          </article>
        );
      })}
    </div>
  );
}
function Activity({
  logs,
}: {
  logs: {
    id: string;
    action: string;
    createdAt: Date;
    actor?: { firstName: string; lastName: string };
  }[];
}) {
  return (
    <ul className="activity-list">
      {logs.map((l) => (
        <li key={l.id}>
          <span className="activity-dot" />
          <div>
            <strong>{l.action}</strong>
            <p>
              {l.actor ? `${l.actor.firstName} ${l.actor.lastName} · ` : ''}
              {date(l.createdAt)}
            </p>
          </div>
        </li>
      ))}
      {!logs.length && (
        <li>
          <p>No activity yet. Your updates will appear here.</p>
        </li>
      )}
    </ul>
  );
}
async function renderDashboardPage({
  role,
  section,
  searchParams,
}: {
  role: Role;
  section?: string[];
  searchParams: SearchParams;
}) {
  const u = await currentUser();
  if (!u) redirect('/login');
  if (u.role !== role) return null;
  const page = section?.[0] || 'dashboard';
  const id = section?.[1];
  if ((section?.length || 0) > 2) notFound();
  const base = role.toLowerCase();
  if (page === 'dashboard') {
    if (role === 'ADMIN') {
      const [
        total,
        clients,
        workers,
        pending,
        approved,
        rejected,
        requests,
        active,
        registered,
        verificationGroups,
        requestGroups,
        logs,
      ] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: 'CLIENT' } }),
        db.user.count({ where: { role: 'WORKER' } }),
        db.workerProfile.count({
          where: { verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } },
        }),
        db.workerProfile.count({ where: { verificationStatus: 'APPROVED' } }),
        db.workerProfile.count({ where: { verificationStatus: 'REJECTED' } }),
        db.careRequest.count(),
        db.careRequest.count({ where: { status: { in: ['PENDING', 'ACCEPTED'] } } }),
        db.user.findMany({ select: { createdAt: true } }),
        db.workerProfile.groupBy({ by: ['verificationStatus'], _count: true }),
        db.careRequest.groupBy({ by: ['status'], _count: true }),
        db.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 7,
          include: { actor: { select: { firstName: true, lastName: true } } },
        }),
      ]);
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() - 5 + i);
        return {
          name: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(d),
          users: registered.filter(
            (u) =>
              u.createdAt.getUTCMonth() === d.getUTCMonth() &&
              u.createdAt.getUTCFullYear() === d.getUTCFullYear(),
          ).length,
        };
      });
      return (
        <>
          {heading(
            'A clear view of your community.',
            'Monitor applications, care connections and platform activity.',
            <Button asChild>
              <Link href="/admin/verifications">
                Review applications <ArrowRight size={16} />
              </Link>
            </Button>,
          )}
          <Stats
            items={[
              ['Total users', total, Users],
              ['Clients', clients, Heart],
              ['Professionals', workers, ShieldCheck],
              ['Awaiting review', pending, Clock],
              ['Approved profiles', approved, CheckCircle2],
              ['Rejected applications', rejected, ShieldCheck],
              ['Care requests', requests, CalendarDays],
              ['Active requests', active, Clock],
            ]}
          />
          <Analytics
            registrations={months}
            statuses={verificationGroups.map((g) => ({
              name: label(g.verificationStatus),
              count: g._count,
            }))}
            requests={requestGroups.map((g) => ({ name: label(g.status), count: g._count }))}
          />
          <div className="content-card">
            <div className="row between">
              <h3>Recent platform activity</h3>
              <Link className="text-link" href="/admin/activity">
                View history <ArrowRight size={15} />
              </Link>
            </div>
            <Activity logs={logs} />
          </div>
        </>
      );
    }
    const [requests, favourites, worker, notifications] = await Promise.all([
      db.careRequest.findMany({
        where: role === 'CLIENT' ? { client: { userId: u.id } } : { worker: { userId: u.id } },
        include: requestInclude,
        orderBy: { createdAt: 'desc' },
      }),
      role === 'CLIENT'
        ? db.favourite.count({ where: { client: { userId: u.id } } })
        : Promise.resolve(0),
      role === 'WORKER'
        ? db.workerProfile.findUnique({
            where: { userId: u.id },
            include: { documents: true, skills: true },
          })
        : Promise.resolve(null),
      db.notification.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    const recommended =
      role === 'CLIENT'
        ? await db.workerProfile.findMany({ where: publicWhere, select: publicSelect, take: 3 })
        : [];
    const completion = worker
      ? Math.round(
          ([
            !!worker.city,
            !!worker.biography,
            !!worker.jobTitle,
            worker.skills.length > 0,
            worker.documents.length >= 3,
          ].filter(Boolean).length /
            5) *
            100,
        )
      : 0;
    return (
      <>
        {heading(
          `Welcome back, ${u.firstName}.`,
          role === 'CLIENT'
            ? 'Your care connections, all in one place.'
            : 'Make a difference, one connection at a time.',
          <Button asChild>
            <Link href={role === 'CLIENT' ? '/find-care' : '/worker/profile'}>
              {role === 'CLIENT' ? 'Find care' : 'Manage profile'}
              <ArrowRight size={16} />
            </Link>
          </Button>,
        )}
        <div className="dashboard-note">
          <ShieldCheck size={20} />
          {worker ? (
            <span>
              Profile status: <strong>{label(worker.verificationStatus)}</strong>.{' '}
              {worker.verificationStatus === 'APPROVED'
                ? 'Your internal demo review is complete. No external checks are claimed.'
                : 'Complete your profile and follow the verification journey.'}
            </span>
          ) : (
            <span>
              Your people. Your preferences. Find a little support for the things that matter most.
            </span>
          )}
        </div>
        <Stats
          items={
            role === 'CLIENT'
              ? [
                  [
                    'Active requests',
                    requests.filter((r) => r.status === 'ACCEPTED').length,
                    CalendarDays,
                  ],
                  [
                    'Pending requests',
                    requests.filter((r) => r.status === 'PENDING').length,
                    Clock,
                  ],
                  [
                    'Completed requests',
                    requests.filter((r) => r.status === 'COMPLETED').length,
                    CheckCircle2,
                  ],
                  ['Saved professionals', favourites, Heart],
                ]
              : [
                  ['Profile completion', `${completion}%`, UserIcon],
                  [
                    'Pending requests',
                    requests.filter((r) => r.status === 'PENDING').length,
                    Clock,
                  ],
                  [
                    'Accepted requests',
                    requests.filter((r) => r.status === 'ACCEPTED').length,
                    CheckCircle2,
                  ],
                  [
                    'Upcoming care',
                    requests.filter((r) => r.status === 'ACCEPTED' && r.requestedDate >= new Date())
                      .length,
                    CalendarDays,
                  ],
                ]
          }
        />
        <div className="dashboard-columns">
          <section>
            <div className="row between" style={{ marginBottom: 18 }}>
              <h3>Recent care requests</h3>
              <Link className="text-link" href={`/${base}/requests`}>
                View all <ArrowRight size={15} />
              </Link>
            </div>
            <RequestList requests={requests.slice(0, 3)} role={role} />
          </section>
          <div className="content-card">
            <h3>Recent updates</h3>
            <ul className="activity-list">
              {notifications.map((n) => (
                <li key={n.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <small>{date(n.createdAt)}</small>
                  </div>
                </li>
              ))}
            </ul>
            {worker && (
              <>
                <div className="progress-track">
                  <span style={{ width: `${completion}%` }} />
                </div>
                <Link className="text-link" href="/worker/verification">
                  Follow your verification <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
        {recommended.length > 0 && (
          <section style={{ marginTop: 35 }}>
            <h3 style={{ marginBottom: 20 }}>A few professionals to get to know</h3>
            <div className="results-grid">
              {recommended.map((w) => (
                <ProfessionalCard key={w.id} worker={w} />
              ))}
            </div>
          </section>
        )}
      </>
    );
  }
  if (page === 'requests') {
    const where: Where =
      role === 'ADMIN'
        ? {}
        : role === 'CLIENT'
          ? { client: { userId: u.id } }
          : { worker: { userId: u.id } };
    if (id) {
      const r = await db.careRequest.findFirst({
        where: { ...where, id },
        include: requestInclude,
      });
      if (!r) notFound();
      return (
        <>
          {heading('Your care request', 'A clear record of the details and next steps.')}
          <div className="content-card">
            <div className="row between">
              <h2>{r.careType}</h2>
              <Badge status={r.status} />
            </div>
            <dl className="detail-grid">
              {[
                ['Professional', `${r.worker.user.firstName} ${r.worker.user.lastName}`],
                ['Client', `${r.client.user.firstName} ${r.client.user.lastName}`],
                ['Preferred date', date(r.requestedDate)],
                ['Time', `${r.startTime} · ${r.durationHours} hours`],
                ['General location', r.generalLocation],
                ['Created', date(r.createdAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <h3 style={{ marginTop: 25 }}>Support requested</h3>
            <p>{r.description}</p>
            {r.notes && (
              <>
                <h3>Additional notes</h3>
                <p>{r.notes}</p>
              </>
            )}
            <div style={{ marginTop: 25 }}>
              <RequestActions r={r} role={role} />
            </div>
            <p className="small muted">
              This is a demo request. No real care, payment or medical service is arranged.
            </p>
          </div>
        </>
      );
    }
    const status = value(searchParams, 'status');
    const allowed = ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED'];
    const requests = await db.careRequest.findMany({
      where: { ...where, ...(allowed.includes(status) ? { status: status as 'PENDING' } : {}) },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
    return (
      <>
        {heading(
          role === 'WORKER'
            ? 'Your care requests.'
            : role === 'ADMIN'
              ? 'Care requests'
              : 'Your care, at a glance.',
          'Follow every connection, from the first request to the next step.',
        )}
        <div className="tabs">
          {['', ...allowed].map((s) => (
            <Link
              className={status === s ? 'active' : ''}
              href={`/${base}/requests${s ? `?status=${s}` : ''}`}
              key={s}
            >
              {s ? label(s) : 'All requests'}
            </Link>
          ))}
        </div>
        <RequestList requests={requests} role={role} />
      </>
    );
  }
  if (page === 'notifications' && role !== 'ADMIN') {
    const list = await db.notification.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: 'desc' },
    });
    return (
      <>
        {heading(
          'Your latest updates.',
          'Stay connected with your CareMatch journey.',
          <ActionButton
            name="notifications"
            variant="outline"
            message="Notifications marked as read"
          >
            Mark all as read
          </ActionButton>,
        )}
        <div className="stack">
          {list.length ? (
            list.map((n) => (
              <article className={`notification ${n.isRead ? 'read' : ''}`} key={n.id}>
                <h3>
                  {n.title}
                  {!n.isRead && (
                    <span className="badge" style={{ marginLeft: 10 }}>
                      New
                    </span>
                  )}
                </h3>
                <p>{n.message}</p>
                <small>{date(n.createdAt)}</small>
              </article>
            ))
          ) : (
            <Empty description="Your notifications will appear here when something changes." />
          )}
        </div>
      </>
    );
  }
  if (page === 'favourites' && role === 'CLIENT') {
    const list = await db.favourite.findMany({
      where: { client: { userId: u.id } },
      include: { worker: { select: publicSelect } },
      orderBy: { createdAt: 'desc' },
    });
    const visible = await db.workerProfile.findMany({
      where: { ...publicWhere, id: { in: list.map((f) => f.workerId) } },
      select: { id: true },
    });
    return (
      <>
        {heading(
          'Good people, worth remembering.',
          'Your saved professionals, ready when you are.',
        )}
        <div className="results-grid">
          {list.map((f) => (
            <div key={f.id}>
              {visible.some((w) => w.id === f.workerId) ? (
                <ProfessionalCard worker={f.worker} />
              ) : (
                <div className="content-card">
                  <h3>Profile currently unavailable</h3>
                  <p>This professional is no longer publicly listed.</p>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <ActionButton
                  name="favourite"
                  data={{ workerId: f.workerId, saved: false }}
                  variant="outline"
                  message="Removed from favourites"
                >
                  Remove from favourites
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
        {!list.length && (
          <Empty
            title="A place for your favourite people."
            description="Save a professional from their profile to find them here again."
            href="/find-care"
            cta="Find care"
          />
        )}
      </>
    );
  }
  if ((page === 'profile' || page === 'onboarding') && role === 'WORKER') {
    const w = await db.workerProfile.findUniqueOrThrow({
      where: { userId: u.id },
      include: {
        availability: true,
        documents: {
          select: { id: true, documentType: true, originalFileName: true, reviewStatus: true },
        },
        skills: true,
        qualifications: true,
        services: true,
      },
    });
    const initial = {
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      city: w.city,
      postcode: w.postcode,
      address: w.address,
      dateOfBirth: w.dateOfBirth,
      introduction: w.introduction,
      profession: w.profession,
      jobTitle: w.jobTitle,
      experienceYears: w.experienceYears,
      biography: w.biography,
      hourlyRate: w.hourlyRate.toString(),
      travelRadius: w.travelRadius,
      languages: w.languages.join(', '),
      skills: w.skills.map((s) => s.skillName).join(', '),
      qualifications: w.qualifications.map((q) => q.qualificationName).join(', '),
      specialisations: w.specialisations.join(', '),
      services: w.services.map((s) => s.serviceType),
      registrationNumber: w.registrationNumber,
      preferredLocation: w.preferredLocation,
      liveIn: w.liveIn,
      overnight: w.overnight,
      isListed: w.isListed,
      onboardingStep: w.onboardingStep,
    };
    return (
      <>
        {heading(
          page === 'onboarding' ? 'Let’s tell your story.' : 'Your professional profile.',
          'A thoughtful introduction to you and the care you offer.',
        )}
        <Onboarding
          initial={initial}
          availability={w.availability.map((a) => ({
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            isAvailable: a.isAvailable,
          }))}
          documents={w.documents}
          status={w.verificationStatus}
          edit={w.verificationStatus === 'APPROVED'}
        />
      </>
    );
  }
  if (page === 'verification' && role === 'WORKER') {
    const w = await db.workerProfile.findUniqueOrThrow({
      where: { userId: u.id },
      include: {
        reviews: { orderBy: { reviewedAt: 'desc' } },
        documents: {
          select: { id: true, documentType: true, originalFileName: true, reviewStatus: true },
        },
      },
    });
    return (
      <>
        {heading(
          'Your verification journey.',
          'Clear steps, thoughtful review and updates along the way.',
        )}
        <div className="content-grid">
          <div className="content-card">
            <div className="row between">
              <h2>Application status</h2>
              <Badge status={w.verificationStatus} />
            </div>
            <div className="timeline">
              {['Profile created', 'Documents submitted', 'Under review', 'Approved'].map(
                (s, i) => (
                  <div
                    className={`timeline-item ${i === 0 || (i === 1 && !!w.submittedAt) || (i === 2 && ['UNDER_REVIEW', 'APPROVED'].includes(w.verificationStatus)) || (i === 3 && w.verificationStatus === 'APPROVED') ? 'done' : ''}`}
                    key={s}
                  >
                    <strong>{s}</strong>
                    <p>
                      {
                        [
                          'Your professional account is ready.',
                          'Your profile and evidence are saved for review.',
                          'An administrator inspects the application.',
                          'Internal demo approval makes eligible listings visible.',
                        ][i]
                      }
                    </p>
                  </div>
                ),
              )}
            </div>
            {['DRAFT', 'REJECTED'].includes(w.verificationStatus) && (
              <Button asChild>
                <Link href="/worker/onboarding">
                  {w.verificationStatus === 'REJECTED'
                    ? 'Update and resubmit'
                    : 'Complete your application'}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            )}
            {w.verificationStatus === 'REJECTED' && (
              <p className="error-message">
                {w.reviews.find((r) => r.newStatus === 'REJECTED')?.notes}
              </p>
            )}
            <p className="small muted">
              An internal demo review is not an external identity, DBS, GMC, NMC or right-to-work
              check.
            </p>
          </div>
          <div className="content-card">
            <h2>Review history</h2>
            <div className="timeline">
              {w.reviews.map((r) => (
                <div className="timeline-item done" key={r.id}>
                  <strong>{label(r.newStatus)}</strong>
                  <p>{r.notes}</p>
                  <p>{date(r.reviewedAt)}</p>
                </div>
              ))}
              {!w.reviews.length && (
                <p className="muted small">Your review history will begin after submission.</p>
              )}
            </div>
          </div>
        </div>
        <div className="content-card" style={{ marginTop: 24 }}>
          <h2>Browser-only sample evidence</h2>
          <div className="document-list">
            {w.documents.map((d) => (
              <div className="document-item" key={d.id}>
                <div>
                  <strong>{d.documentType}</strong>
                  <small>
                    {d.originalFileName} ·{' '}
                    {d.reviewStatus === 'REVIEWED'
                      ? 'Manually reviewed in demo'
                      : 'Uploaded, not yet reviewed'}
                  </small>
                </div>
                <a href={d.dataUrl} download={d.originalFileName} target="_blank" rel="noreferrer">
                  Download sample ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }
  if (page === 'availability' && role === 'WORKER') {
    const w = await db.workerProfile.findUniqueOrThrow({
      where: { userId: u.id },
      include: { availability: true },
    });
    return (
      <>
        {heading('Make space for meaningful work.', 'Set the days and times that work for you.')}
        <div className="content-card">
          <AvailabilityForm
            initial={w.availability.map((a) => ({
              dayOfWeek: a.dayOfWeek,
              startTime: a.startTime,
              endTime: a.endTime,
              isAvailable: a.isAvailable,
            }))}
          />
        </div>
      </>
    );
  }
  if (page === 'profile' && role === 'CLIENT') {
    const c = await db.clientProfile.findUniqueOrThrow({ where: { userId: u.id } });
    return (
      <>
        {heading('Your demo details.', 'Keep your contact information up to date.')}
        <div className="content-card stack">
          <Upload />
          <ProfileForm
            initial={{
              firstName: u.firstName,
              lastName: u.lastName,
              phone: u.phone,
              city: c.city,
              postcode: c.postcode,
            }}
          />
        </div>
      </>
    );
  }
  if (page === 'settings') {
    return (
      <>
        {heading('Account settings', 'Manage your sign-in and understand the demo.')}
        <div className="content-grid">
          <div className="content-card">
            <h2>Sign-in details</h2>
            <p>{u.email}</p>
            <p>Account type: {label(u.role)}</p>
            <Button asChild variant="outline">
              <Link href="/forgot-password">Reset your password</Link>
            </Button>
            <Logout />
          </div>
          <div className="content-card">
            <h2>Your browser demo</h2>
            <ResetDemo />
            <p>
              Changes and sample uploads stay in this browser. Reset the demo to restore the bundled
              JSON examples. Use fictional details only.
            </p>
            <p>
              No payments, real medical consultations or external credential verification take
              place.
            </p>
            <Link href="/privacy" className="text-link">
              Read the draft privacy policy <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </>
    );
  }
  if (role === 'ADMIN') return adminPage(u, page, id, searchParams);
  notFound();
}
const UserIcon = Users;
async function adminPage(u: User, page: string, id: string | undefined, p: SearchParams) {
  if (['users', 'clients', 'workers'].includes(page)) {
    if (id) {
      const target = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          client: true,
        },
      });
      if (!target) notFound();
      return (
        <>
          {heading(`${target.firstName} ${target.lastName}`, 'Account details and status.')}
          <div className="content-card">
            <dl className="detail-grid">
              {[
                ['Email', target.email],
                ['Phone', target.phone],
                ['Role', label(target.role)],
                ['Status', label(target.status)],
                ['Joined', date(target.createdAt)],
                ['City', target.client?.city || 'Not supplied'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {target.role !== 'ADMIN' && (
              <div style={{ marginTop: 25 }}>
                <ActionButton
                  name="account-status"
                  variant="outline"
                  data={{
                    id: target.id,
                    status: target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                  }}
                  confirm="Update this account’s status and invalidate active sessions?"
                >
                  {target.status === 'ACTIVE' ? 'Suspend account' : 'Reactivate account'}
                </ActionButton>
              </div>
            )}
          </div>
        </>
      );
    }
    const list = await db.user.findMany({
      where: page === 'clients' ? { role: 'CLIENT' } : page === 'workers' ? { role: 'WORKER' } : {},
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        worker: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return (
      <>
        {heading(
          page === 'clients'
            ? 'Clients'
            : page === 'workers'
              ? 'Care professionals'
              : 'Your CareMatch community.',
          'Search, inspect and manage platform accounts.',
        )}
        <UsersTable
          users={list.map((v) => ({
            id: v.id,
            name: `${v.firstName} ${v.lastName}`,
            email: v.email,
            role: v.role,
            status: v.status,
            createdAt: v.createdAt.toISOString(),
            workerId: v.worker?.id,
          }))}
        />
      </>
    );
  }
  if (page === 'verifications') {
    if (id) {
      const w = await db.workerProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              avatarUrl: true,
            },
          },
          documents: true,
          qualifications: true,
          skills: true,
          services: true,
          reviews: {
            include: { reviewer: { select: { firstName: true, lastName: true } } },
            orderBy: { reviewedAt: 'desc' },
          },
        },
      });
      if (!w) notFound();
      return (
        <>
          {heading(
            `${w.user.firstName} ${w.user.lastName}`,
            `${w.profession} · ${w.city} · Application review`,
            <Badge status={w.verificationStatus} />,
          )}
          <div className="dashboard-note">
            <ShieldCheck size={20} /> Internal manual demo review only. Opening a document does not
            mark it as reviewed; use the explicit review action after inspection.
          </div>
          <div className="dashboard-columns">
            <div className="stack">
              <section className="content-card">
                <h2>Professional & demo details</h2>
                <dl className="detail-grid">
                  {[
                    ['Email', w.user.email],
                    ['Phone', w.user.phone],
                    ['City / postcode', `${w.city} / ${w.postcode}`],
                    ['Address (demo-only)', w.address || 'Not supplied'],
                    ['Date of birth (demo-only)', w.dateOfBirth || 'Not supplied'],
                    ['Registration (demo-only)', w.registrationNumber || 'Not applicable'],
                    ['Account status', label(w.user.status)],
                    ['Indicative rate', money(w.hourlyRate)],
                    ['Experience', `${w.experienceYears} years`],
                    ['Qualifications', w.qualifications.map((q) => q.qualificationName).join(', ')],
                    ['Skills', w.skills.map((s) => s.skillName).join(', ')],
                    ['Services', w.services.map((s) => s.serviceType).join(', ')],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <h3 style={{ marginTop: 25 }}>About this professional</h3>
                <p>{w.biography}</p>
              </section>
              <section className="content-card">
                <h2>Submitted evidence</h2>
                <div className="document-list">
                  {w.documents.map((d) => (
                    <div className="document-item" key={d.id}>
                      <div>
                        <strong>{d.documentType}</strong>
                        <small>{d.originalFileName}</small>
                        <div>
                          <Badge>
                            {d.reviewStatus === 'REVIEWED'
                              ? 'Manually reviewed'
                              : 'Uploaded · not reviewed'}
                          </Badge>
                        </div>
                      </div>
                      <div className="stack">
                        <a
                          href={d.dataUrl}
                          download={d.originalFileName}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download sample ↗
                        </a>
                        {w.verificationStatus === 'UNDER_REVIEW' &&
                          d.reviewStatus !== 'REVIEWED' && (
                            <ActionButton
                              name="document-review"
                              variant="outline"
                              data={{ id: d.id }}
                              confirm="Confirm you have inspected this sample document. This records an internal demo review only."
                            >
                              Mark reviewed
                            </ActionButton>
                          )}
                      </div>
                    </div>
                  ))}
                  {!w.documents.length && <p className="muted small">No evidence uploaded yet.</p>}
                </div>
              </section>
            </div>
            <aside className="stack">
              <div className="content-card">
                <h2>Review decision</h2>
                <ReviewActions id={w.id} status={w.verificationStatus} />
              </div>
              <div className="content-card">
                <h2>Review history</h2>
                <div className="timeline">
                  {w.reviews.map((r) => (
                    <div className="timeline-item done" key={r.id}>
                      <strong>
                        {label(r.previousStatus)} → {label(r.newStatus)}
                      </strong>
                      <p>{r.notes}</p>
                      <p>
                        {r.reviewer.firstName} {r.reviewer.lastName} · {date(r.reviewedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </>
      );
    }
    const status = value(p, 'status') || 'PENDING';
    const allowed = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DRAFT'];
    const list = await db.workerProfile.findMany({
      where: { verificationStatus: allowed.includes(status) ? (status as 'PENDING') : 'PENDING' },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    return (
      <>
        {heading(
          'Thoughtful reviews. Trusted connections.',
          'Review applications and keep every decision clear and accountable.',
        )}
        <div className="tabs">
          {allowed.map((s) => (
            <Link
              key={s}
              href={`/admin/verifications?status=${s}`}
              className={status === s ? 'active' : ''}
            >
              {label(s)}
            </Link>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Professional', 'Category', 'Location', 'Submitted', 'Status', ''].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id}>
                  <td>
                    <strong>
                      {w.user.firstName} {w.user.lastName}
                    </strong>
                    <small>{w.user.email}</small>
                  </td>
                  <td>{w.profession}</td>
                  <td>{w.city}</td>
                  <td>{w.submittedAt ? date(w.submittedAt) : 'Not submitted'}</td>
                  <td>
                    <Badge status={w.verificationStatus} />
                  </td>
                  <td>
                    <Button asChild variant="outline">
                      <Link href={`/admin/verifications/${w.id}`}>Review application</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={6}>No applications in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  if (page === 'activity') {
    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { actor: { select: { firstName: true, lastName: true } } },
    });
    return (
      <>
        {heading(
          'A clear record of every step.',
          'The latest 200 recorded platform actions, with actor and timestamp.',
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Record</th>
                <th>Time (UK)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.action}</td>
                  <td>
                    {l.actor.firstName} {l.actor.lastName}
                  </td>
                  <td>
                    {l.entityType}
                    <small>{l.entityId}</small>
                  </td>
                  <td>
                    {new Intl.DateTimeFormat('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Europe/London',
                    }).format(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  notFound();
}

export function DashboardLayout(props: { children: React.ReactNode; role: Role }) {
  const load = useCallback(() => renderDashboardLayout(props), [props.children, props.role]);
  return <DemoView load={load} />;
}
export function DashboardPage(props: {
  role: Role;
  section?: string[];
  searchParams: SearchParams;
}) {
  const load = useCallback(
    () => renderDashboardPage(props),
    [props.role, props.section, props.searchParams],
  );
  return <DemoView load={load} />;
}
