import FindCare from '@/components/find-care-view';
import type { SearchParams } from '@/modules/queries';
export const metadata = {
  title: 'Find care professionals',
  description: 'Explore fictional care professional profiles across the UK.',
};
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <FindCare query={await searchParams} />;
}
