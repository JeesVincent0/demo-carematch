import { currentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
export default async function Dashboard() {
  const u = await currentUser();
  redirect(u ? `/${u.role.toLowerCase()}/dashboard` : '/login');
}
