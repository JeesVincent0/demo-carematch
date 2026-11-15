'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { professions, careTypes, documentTypes, requiredDocuments } from '@/modules/domain';
import { Field, AvailabilityForm } from './forms';
import { action, Upload, ActionButton } from './interactive';
import { Button } from './ui/button';
import { useHydrated } from '@/hooks/use-hydrated';
type Values = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  postcode: string;
  address: string;
  dateOfBirth: string;
  introduction: string;
  profession: string;
  jobTitle: string;
  experienceYears: number;
  biography: string;
  hourlyRate: string;
  travelRadius: number;
  languages: string;
  skills: string;
  qualifications: string;
  specialisations: string;
  services: string[];
  registrationNumber: string;
  preferredLocation: string;
  liveIn: boolean;
  overnight: boolean;
  isListed: boolean;
  onboardingStep: number;
};
type Doc = {
  id: string;
  documentType: string;
  originalFileName: string;
  dataUrl: string;
  reviewStatus: string;
};
export function Onboarding({
  initial,
  documents,
  status,
  edit = false,
  availability = [],
}: {
  initial: Values;
  documents: Doc[];
  status: string;
  edit?: boolean;
  availability?: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[];
}) {
  const [v, setV] = useState(initial);
  const [step, setStep] = useState(edit ? 1 : Math.min(initial.onboardingStep, 5));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const ready = useHydrated();
  const locked = ['PENDING', 'UNDER_REVIEW', 'SUSPENDED'].includes(status);
  const change = (key: keyof Values, value: unknown) => setV({ ...v, [key]: value });
  const fields = (key: keyof Values) => ({
    value: String(v[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      change(key, e.target.value),
  });
  const text = (key: keyof Values, label: string, type = 'text', full = false) => (
    <Field key={key} label={label} full={full}>
      <input type={type} {...fields(key)} />
    </Field>
  );
  const save = async (next = step) => {
    setBusy(true);
    setError('');
    try {
      if (edit) {
        const r = await action('worker', { ...v, onboardingStep: 5 });
        toast.success(
          r.reReview
            ? 'Saved. Submit your updated credentials for re-review.'
            : 'Professional profile saved',
        );
        if (r.reReview) router.push('/worker/onboarding');
        router.refresh();
      } else {
        const keys: Record<number, (keyof Values)[]> = {
          1: [
            'firstName',
            'lastName',
            'phone',
            'city',
            'postcode',
            'address',
            'dateOfBirth',
            'introduction',
          ],
          2: [
            'profession',
            'jobTitle',
            'experienceYears',
            'biography',
            'languages',
            'skills',
            'qualifications',
            'specialisations',
            'registrationNumber',
          ],
          3: [
            'hourlyRate',
            'travelRadius',
            'services',
            'preferredLocation',
            'liveIn',
            'overnight',
            'isListed',
          ],
          4: [],
          5: [],
        };
        const data = Object.fromEntries(keys[step].map((k) => [k, v[k]]));
        await action('draft', { step: next, data });
        setStep(next);
        toast.success('Progress saved');
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!ready)
    return (
      <div className="content-card" role="status">
        Loading your saved profile…
      </div>
    );
  if (locked)
    return (
      <div className="content-card">
        <h2>
          {status === 'SUSPENDED'
            ? 'Your profile is restricted'
            : 'Your application is with the review team'}
        </h2>
        <p>
          Profile editing is locked while this status is active. You can follow updates on your
          verification page.
        </p>
        <Button asChild>
          <a href="/worker/verification">View verification status</a>
        </Button>
      </div>
    );
  const sections = [
    <div key="personal" className="stack">
      <h2>Let&apos;s start with you.</h2>
      <p className="small muted">
        Use fictional details only. All demo data is stored in this browser and is not protected
        authentication.
      </p>
      <Upload />
      <div className="form-grid">
        {text('firstName', 'First name')}
        {text('lastName', 'Last name')}
        {text('phone', 'Contact number', 'tel')}
        {text('dateOfBirth', 'Date of birth (optional, demo only)', 'date')}
        {text('city', 'City')}
        {text('postcode', 'Postcode')}
        {text('address', 'Address (optional, demo only)', 'text', true)}
        <Field label="Short introduction" full>
          <textarea
            {...fields('introduction')}
            maxLength={240}
            placeholder="A short introduction to the person behind the profile."
          />
        </Field>
      </div>
    </div>,
    <div key="professional" className="stack">
      <h2>Share your experience.</h2>
      <div className="form-grid">
        <Field label="Professional category">
          <select {...fields('profession')}>
            {professions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        {text('jobTitle', 'Professional title')}
        {text('experienceYears', 'Years of experience', 'number')}
        {text('languages', 'Languages (comma-separated)')}
        {text('qualifications', 'Qualifications (comma-separated)', 'text', true)}
        {text('skills', 'Skills (comma-separated)', 'text', true)}
        {text('specialisations', 'Specialisations (comma-separated)', 'text', true)}
        {['Nurse', 'Doctor'].includes(v.profession) &&
          text(
            'registrationNumber',
            v.profession === 'Nurse'
              ? 'NMC registration number (demo only)'
              : 'GMC registration number (demo only)',
            'text',
            true,
          )}
        <Field label="About you" full>
          <textarea {...fields('biography')} rows={5} />
        </Field>
      </div>
    </div>,
    <div key="preferences" className="stack">
      <h2>Care that works for you.</h2>
      <div className="form-grid">
        {text('hourlyRate', 'Indicative hourly rate (£)')}
        {text('travelRadius', 'Travel radius (miles)', 'number')}
        {text('preferredLocation', 'Preferred work location', 'text', true)}
      </div>
      <h3>Services offered</h3>
      <div className="checkbox-grid">
        {careTypes.map((s) => (
          <label className="checkbox-row" key={s}>
            <input
              type="checkbox"
              checked={v.services.includes(s)}
              onChange={(e) =>
                change(
                  'services',
                  e.target.checked ? [...v.services, s] : v.services.filter((t) => t !== s),
                )
              }
            />
            {s}
          </label>
        ))}
      </div>
      <div className="checkbox-grid">
        {(['liveIn', 'overnight', 'isListed'] as const).map((k) => (
          <label className="checkbox-row" key={k}>
            <input type="checkbox" checked={v[k]} onChange={(e) => change(k, e.target.checked)} />
            {
              {
                liveIn: 'Available for live-in care',
                overnight: 'Available for overnight care',
                isListed: 'Show my profile publicly once approved',
              }[k]
            }
          </label>
        ))}
      </div>
      <h3>Weekly availability</h3>
      <AvailabilityForm initial={availability} />
      <p className="small muted">
        Use Save availability to persist your schedule, then save and continue below.
      </p>
    </div>,
    <div key="verification" className="stack">
      <h2>Sample evidence, stored in this browser.</h2>
      <div className="dashboard-note">
        <ShieldCheck size={20} /> Use sample documents only. No external identity or
        professional-register checks are performed.
      </div>
      <p className="small muted">
        Required for {v.profession}: {requiredDocuments(v.profession).join(', ')}.
      </p>
      <div className="document-list">
        {documents.map((d) => (
          <div key={d.id} className="document-item">
            <div>
              <strong>{d.documentType}</strong>
              <small>
                {d.originalFileName} · {d.reviewStatus.toLowerCase()}
              </small>
            </div>
            <a href={d.dataUrl} download={d.originalFileName} target="_blank" rel="noreferrer">
              Download sample ↗
            </a>
          </div>
        ))}
      </div>
      {documentTypes.map((t) => (
        <Upload
          key={t}
          type={t}
          label={`${t}${requiredDocuments(v.profession).includes(t) ? ' (required)' : ' (optional)'}`}
        />
      ))}
    </div>,
    <div key="review" className="stack">
      <h2>Ready for the next chapter?</h2>
      <p className="muted small">
        Review your details, go back to make changes, then submit your profile for a manual demo
        review.
      </p>
      <dl className="detail-grid">
        {[
          ['Name', `${v.firstName} ${v.lastName}`],
          ['Profession', v.profession],
          ['Location', `${v.city} · ${v.postcode}`],
          ['Experience', `${v.experienceYears} years`],
          ['Rate', `£${v.hourlyRate} / hour`],
          ['Services', v.services.join(', ')],
          ['Qualifications', v.qualifications],
          ['Evidence uploaded', String(documents.length)],
        ].map(([t, c]) => (
          <div key={t}>
            <dt>{t}</dt>
            <dd>{c}</dd>
          </div>
        ))}
      </dl>
      {!edit && (
        <ActionButton
          name="submit"
          message="Your profile has been submitted for review"
          redirect="/worker/verification"
          confirm="Submit this fictional profile and its sample evidence for an internal manual review?"
        >
          Submit for verification
        </ActionButton>
      )}
      {edit && (
        <p className="small muted">
          Save your changes using the button below. Sensitive credential changes require a fresh
          review before your profile is listed again.
        </p>
      )}
    </div>,
  ];
  return (
    <>
      <div className="onboarding-steps">
        {['Personal details', 'Experience', 'Preferences', 'Documents', 'Review'].map((s, i) => (
          <button
            key={s}
            className={step === i + 1 ? 'current' : ''}
            onClick={() => {
              if (edit) setStep(i + 1);
              else if (i + 1 < step) setStep(i + 1);
            }}
            disabled={!edit && i + 1 > step}
          >
            <b>{i + 1}</b>
            <span>{s}</span>
          </button>
        ))}
      </div>
      <div className="content-card">
        {sections[step - 1]}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={16} /> Back
            </Button>
          )}
          {edit ? (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(Math.min(5, step + 1))}
                disabled={step === 5}
              >
                Next section
              </Button>
              <Button onClick={() => save()} disabled={busy}>
                {busy ? 'Saving…' : 'Save profile'}
              </Button>
            </>
          ) : (
            step < 5 && (
              <>
                <Button variant="outline" onClick={() => save()} disabled={busy}>
                  Save progress
                </Button>
                <Button onClick={() => save(step + 1)} disabled={busy}>
                  {busy ? 'Saving…' : 'Save & continue'}
                  <ArrowRight size={16} />
                </Button>
              </>
            )
          )}
        </div>
      </div>
    </>
  );
}
