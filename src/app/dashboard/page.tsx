'use client';
import { useCallback } from 'react';
import { currentUser } from '@/lib/auth';
import { DemoView, redirect } from '@/components/demo-view';
export default function Dashboard() {
  const load = useCallback(async () => {
    const u = await currentUser();
    redirect(u ? `/${u.role.toLowerCase()}/dashboard` : '/login');
  }, []);
  return <DemoView load={load} />;
}
