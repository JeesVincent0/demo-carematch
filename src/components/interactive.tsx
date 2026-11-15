'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, LogOut, Heart, Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { useHydrated } from '@/hooks/use-hydrated';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
export async function action(name: string, data: unknown = {}) {
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Something went wrong.');
  return json;
}
export function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      src={failed ? '/images/avatar.svg' : src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      unoptimized={src.startsWith('/api/')}
      onError={() => setFailed(true)}
    />
  );
}
export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <>
      <button
        disabled={!ready}
        className="mobile-toggle"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          {[
            ['Find care', '/find-care'],
            ['How it works', '/how-it-works'],
            ['Our services', '/services'],
            ['Become a care professional', '/become-a-professional'],
            ['About us', '/about'],
            [signedIn ? 'Dashboard' : 'Log in', signedIn ? '/dashboard' : '/login'],
            ['Get started', '/register'],
          ].map(([s, h]) => (
            <Link key={h} href={h} onClick={() => setOpen(false)}>
              {s}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
export function Logout() {
  return (
    <button className="logout" onClick={() => signOut({ callbackUrl: '/' })}>
      <LogOut size={17} /> Sign out
    </button>
  );
}
export function ActionButton({
  name,
  data,
  children,
  variant = 'default',
  confirm,
  message = 'Saved successfully',
  redirect,
}: {
  name: string;
  data?: unknown;
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  confirm?: string;
  message?: string;
  redirect?: string;
}) {
  const [busy, setBusy] = useState(false);
  const ready = useHydrated();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const run = async () => {
    setBusy(true);
    try {
      await action(name, data);
      toast.success(message);
      setOpen(false);
      if (redirect) router.push(redirect);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const button = (
    <Button variant={variant} disabled={busy || !ready} onClick={confirm ? undefined : run}>
      {busy && <Loader2 className="spin" size={16} />} {children}
    </Button>
  );
  if (!confirm) return button;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{button}</DialogTrigger>
      <DialogContent>
        <DialogTitle className="dialog-title">Please confirm</DialogTitle>
        <DialogDescription>{confirm}</DialogDescription>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep unchanged
          </Button>
          <Button disabled={busy || !ready} onClick={run}>
            {busy ? 'Saving…' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function FavouriteButton({
  workerId,
  saved,
  loggedIn,
  slug,
}: {
  workerId: string;
  saved: boolean;
  loggedIn: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const ready = useHydrated();
  return (
    <Button
      variant="outline"
      disabled={busy || !ready}
      onClick={async () => {
        if (!loggedIn) {
          router.push(`/login?callbackUrl=${encodeURIComponent(`/professionals/${slug}`)}`);
          return;
        }
        setBusy(true);
        try {
          await action('favourite', { workerId, saved: !saved });
          toast.success(saved ? 'Removed from favourites' : 'Saved to favourites');
          router.refresh();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
      {saved ? 'Saved' : 'Save professional'}
    </Button>
  );
}
export function Upload({
  type = 'avatar',
  label = 'Upload profile photo',
}: {
  type?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const ready = useHydrated();
  const router = useRouter();
  return (
    <label className="upload-label">
      {busy ? 'Uploading…' : label}
      <input
        type="file"
        disabled={busy || !ready}
        accept={type === 'avatar' ? 'image/png,image/jpeg' : 'application/pdf,image/png,image/jpeg'}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const body = new FormData();
          body.set('file', file);
          body.set('type', type);
          try {
            const r = await fetch('/api/upload', { method: 'POST', body });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            toast.success('File uploaded securely');
            router.refresh();
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setBusy(false);
            e.target.value = '';
          }
        }}
      />
      <small>PDF, PNG or JPEG · up to 5 MB{type !== 'avatar' ? ' · private' : ''}</small>
    </label>
  );
}
