import Professional from '@/components/professional-view';
export const metadata = {
  title: 'Care professional profile',
  description: 'Explore a fictional CareMatch professional and make a demo care request.',
};
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <Professional slug={(await params).slug} />;
}
