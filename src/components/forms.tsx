'use client';
import { useState, useId, Children, isValidElement, cloneElement, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Loader2, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { registrationSchema } from '@/modules/validation';
import { professions, careTypes, days } from '@/modules/domain';
import { safeReturn } from '@/lib/utils';
import { useHydrated } from '@/hooks/use-hydrated';
import { action } from './interactive';
import { Button } from './ui/button';
function HydratedForm({ children, ...props }: React.ComponentProps<'form'>) {
  const ready = useHydrated();
  return (
    <form method="post" {...props}>
      <fieldset disabled={!ready} style={{ display: 'contents' }}>
        {children}
      </fieldset>
    </form>
  );
}
export function Field({
  label,
  error,
  children,
  full = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  const id = useId();
  return (
    <div className={`form-field ${full ? 'full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        typeof child.type === 'string' &&
        ['input', 'select', 'textarea'].includes(child.type)
          ? cloneElement(child as ReactElement<Record<string, unknown>>, {
              id,
              'aria-invalid': !!error,
              'aria-describedby': error ? `${id}-error` : undefined,
            })
          : child,
      )}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function LoginForm({ callbackUrl, demo }: { callbackUrl?: string; demo: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, setValue } = useForm<{ email: string; password: string }>();
  const submit = handleSubmit(async (data) => {
    setBusy(true);
    setError('');
    try {
      const r = await signIn('credentials', { ...data, redirect: false });
      if (r?.error)
        throw new Error('We couldn’t sign you in. Check your details or try again later.');
      window.location.assign(safeReturn(callbackUrl));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  });
  return (
    <>
      <HydratedForm onSubmit={submit}>
        <Field label="Email address">
          <input type="email" autoComplete="email" required {...register('email')} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            required
            {...register('password')}
          />
        </Field>
        <div className="row between">
          <span className="small muted row">
            <LockKeyhole size={13} /> Demo sign-in
          </span>
          <Link href="/forgot-password" className="text-link small">
            Forgot password?
          </Link>
        </div>
        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="spin" size={17} /> : null} Sign in <ArrowRight size={17} />
        </Button>
      </HydratedForm>
      {demo && (
        <div className="demo-login">
          <strong>Take a look around</strong>
          <p>
            Use a fictional demo account. Select a role to fill the email, then enter the demo
            password from the README.
          </p>
          <div className="demo-login-buttons">
            {[
              ['Client', 'olivia@carematch.demo'],
              ['Professional', 'sarah@carematch.demo'],
              ['Admin', 'admin@carematch.demo'],
            ].map(([name, email]) => (
              <button
                type="button"
                key={name}
                onClick={() => {
                  setValue('email', email);
                  setValue('password', 'CareMatch-Demo-2026!');
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
export function RegistrationForm({ role }: { role: 'CLIENT' | 'WORKER' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { role, profession: role === 'WORKER' ? 'Nurse' : undefined },
  });
  return (
    <HydratedForm
      onSubmit={handleSubmit(async (data) => {
        setError('');
        try {
          await action('register', data);
          const r = await signIn('credentials', {
            email: data.email,
            password: data.password,
            redirect: false,
          });
          if (r?.error) {
            router.push('/login');
            return;
          }
          window.location.assign(role === 'WORKER' ? '/worker/onboarding' : '/client/dashboard');
        } catch (e) {
          setError((e as Error).message);
        }
      })}
    >
      <div className="form-grid">
        <Field label="First name" error={errors.firstName?.message}>
          <input autoComplete="given-name" {...register('firstName')} />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <input autoComplete="family-name" {...register('lastName')} />
        </Field>
        <Field full label="Email address" error={errors.email?.message}>
          <input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field full label="Phone number" error={errors.phone?.message}>
          <input type="tel" autoComplete="tel" placeholder="07700 900123" {...register('phone')} />
        </Field>
        {role === 'WORKER' && (
          <Field full label="Professional category" error={errors.profession?.message}>
            <select {...register('profession')}>
              {professions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        )}
        <Field full label="Password" error={errors.password?.message}>
          <input type="password" autoComplete="new-password" {...register('password')} />
          <small>At least 12 characters, including upper-case, lower-case and a number.</small>
        </Field>
        <Field full label="Confirm password" error={errors.confirmPassword?.message}>
          <input type="password" autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
      </div>
      <label className="checkbox-row">
        <input type="checkbox" {...register('terms')} />
        <span>
          I agree to the{' '}
          <Link href="/terms" className="text-link">
            demo terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-link">
            privacy policy
          </Link>
          . I will use fictional details only.
        </span>
      </label>
      {errors.terms && <span className="field-error">Please accept the demo terms.</span>}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating your account…' : 'Create your account'}
        <ArrowRight size={17} />
      </Button>
    </HydratedForm>
  );
}
export function PasswordForm({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [link, setLink] = useState('');
  return (
    <HydratedForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const result = await action(token ? 'reset' : 'forgot', { ...data, token });
          setDone(true);
          setLink(result.resetLink || '');
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {!done ? (
        <>
          <Field label={token ? 'New password' : 'Email address'}>
            <input
              name={token ? 'password' : 'email'}
              type={token ? 'password' : 'email'}
              autoComplete={token ? 'new-password' : 'email'}
              minLength={token ? 12 : undefined}
              required
            />
          </Field>
          {token && (
            <p className="small muted">
              Use 12 or more characters with upper-case, lower-case and a number.
            </p>
          )}
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? 'Please wait…' : token ? 'Update password' : 'Create reset link'}
          </Button>
        </>
      ) : (
        <div className="dashboard-note">
          {token
            ? 'Your demo password has been updated in this browser. Sign in again.'
            : 'If the account exists, a reset token has been created. This demo does not send email. The browser-only reset link appears below.'}
        </div>
      )}
      {link && (
        <Link href={link} className="text-link">
          Open demo reset link <ArrowRight size={15} />
        </Link>
      )}
      <Link href="/login" className="text-link">
        Back to sign in
      </Link>
    </HydratedForm>
  );
}
export function BookingForm({
  workerId,
  services,
  loggedIn,
  slug,
  role,
}: {
  workerId: string;
  services: string[];
  loggedIn: boolean;
  slug: string;
  role?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  if (!loggedIn)
    return (
      <Button asChild className="w-full">
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/professionals/${slug}`)}`}>
          Sign in to request care <ArrowRight size={16} />
        </Link>
      </Button>
    );
  if (role !== 'CLIENT')
    return <p className="small muted">Sign in with a client account to send a care request.</p>;
  return (
    <HydratedForm
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const data = Object.fromEntries(new FormData(e.currentTarget));
        try {
          const r = await action('request', { ...data, workerId });
          toast.success('Your care request has been sent');
          router.push(`/client/requests/${r.id}`);
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Type of care">
        <select name="careType" required>
          {services.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Preferred date">
        <input
          type="date"
          name="requestedDate"
          min={new Date().toISOString().slice(0, 10)}
          required
        />
      </Field>
      <div className="form-grid">
        <Field label="Start time">
          <input type="time" name="startTime" defaultValue="09:00" required />
        </Field>
        <Field label="Duration (hours)">
          <input type="number" name="durationHours" defaultValue="2" min="1" max="24" required />
        </Field>
      </div>
      <Field label="General location">
        <input
          name="generalLocation"
          placeholder="City or postcode area"
          maxLength={100}
          required
        />
      </Field>
      <Field label="How can they help?">
        <textarea
          name="description"
          minLength={10}
          maxLength={1000}
          placeholder="Share the everyday support you’re looking for."
          required
        />
        <small>Please don&apos;t include medical histories or sensitive information.</small>
      </Field>
      <Field label="Additional notes (optional)">
        <textarea name="notes" maxLength={1000} />
      </Field>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <Button disabled={busy}>
        {busy ? 'Sending request…' : 'Request care'}
        <ArrowRight size={16} />
      </Button>
      <p className="small muted">
        A demo request, not a confirmed care booking. No payment required.
      </p>
    </HydratedForm>
  );
}
export function ProfileForm({
  initial,
}: {
  initial: { firstName: string; lastName: string; phone: string; city: string; postcode: string };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <HydratedForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await action('profile', Object.fromEntries(new FormData(e.currentTarget)));
          toast.success('Profile updated');
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {Object.entries(initial).map(([key, v]) => (
          <Field
            key={key}
            label={
              (
                {
                  firstName: 'First name',
                  lastName: 'Last name',
                  phone: 'Phone number',
                  city: 'City',
                  postcode: 'Postcode',
                } as Record<string, string>
              )[key]
            }
          >
            <input name={key} defaultValue={v} required />
          </Field>
        ))}
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="form-actions">
        <Button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </HydratedForm>
  );
}
export function AvailabilityForm({
  initial,
}: {
  initial: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[];
}) {
  const [slots, setSlots] = useState(
    days.map(
      (_, i) =>
        initial.find((s) => s.dayOfWeek === i) || {
          dayOfWeek: i,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: i < 5,
        },
    ),
  );
  const [busy, setBusy] = useState(false);
  return (
    <HydratedForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await action('availability', slots);
          toast.success('Availability saved');
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="small muted">
        Times use UK local time. This schedule describes your preferences; requests are reviewed
        individually.
      </p>
      {slots.map((s, i) => (
        <div className="availability-row" key={i}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={s.isAvailable}
              onChange={(e) =>
                setSlots(
                  slots.map((v, n) => (n === i ? { ...v, isAvailable: e.target.checked } : v)),
                )
              }
            />
            {days[i]}
          </label>
          <label>
            From
            <input
              type="time"
              aria-label={`${days[i]} start time`}
              value={s.startTime}
              disabled={!s.isAvailable}
              onChange={(e) =>
                setSlots(slots.map((v, n) => (n === i ? { ...v, startTime: e.target.value } : v)))
              }
            />
          </label>
          <label>
            Until
            <input
              type="time"
              aria-label={`${days[i]} end time`}
              value={s.endTime}
              disabled={!s.isAvailable}
              onChange={(e) =>
                setSlots(slots.map((v, n) => (n === i ? { ...v, endTime: e.target.value } : v)))
              }
            />
          </label>
        </div>
      ))}
      <div className="form-actions">
        <Button disabled={busy}>{busy ? 'Saving…' : 'Save availability'}</Button>
      </div>
    </HydratedForm>
  );
}
