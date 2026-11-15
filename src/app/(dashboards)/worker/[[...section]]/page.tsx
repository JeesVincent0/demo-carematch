import { DashboardPage } from '@/modules/dashboard';
import type { SearchParams } from '@/modules/queries';
export async function generateMetadata({ params }: { params: Promise<{ section?: string[] }> }) {
  const p = await params;
  return { title: 'Worker ' + (p.section?.[0] || 'dashboard') };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <DashboardPage
      role="WORKER"
      section={(await params).section}
      searchParams={await searchParams}
    />
  );
}
