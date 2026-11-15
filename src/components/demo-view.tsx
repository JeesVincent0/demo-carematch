'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { subscribeDemo } from '@/lib/demo/store';
export class DemoRedirect extends Error {
  constructor(public href: string) {
    super('Demo navigation');
  }
}
export class DemoNotFound extends Error {}
export function redirect(href: string): never {
  throw new DemoRedirect(href);
}
export function notFound(): never {
  throw new DemoNotFound();
}
export function DemoView({ load }: { load: () => Promise<ReactNode> }) {
  const [content, setContent] = useState<ReactNode>(null);
  const [error, setError] = useState('');
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = async () => {
      const current = ++revision;
      try {
        const result = await load();
        if (active && current === revision) {
          setContent(result);
          setError('');
        }
      } catch (e) {
        if (!active || current !== revision) return;
        if (e instanceof DemoRedirect) {
          router.replace(e.href);
          return;
        }
        if (e instanceof DemoNotFound) {
          setError('This page isn’t available.');
          return;
        }
        setError((e as Error).message || 'Unable to load this demo.');
      }
    };
    void refresh();
    const unsubscribe = subscribeDemo(() => void refresh());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load, path, router]);
  if (error)
    return (
      <div className="empty">
        <h1>{error}</h1>
        <p>This demo record may have changed or may belong to another demo account.</p>
        <Link href="/find-care" className="btn btn-primary">
          Explore care
        </Link>
      </div>
    );
  return (
    content ?? (
      <div className="container section" role="status">
        <div className="skeleton" style={{ height: 32, width: '60%', marginBottom: 20 }} />
        <p className="small muted">Loading your browser demo…</p>
      </div>
    )
  );
}
