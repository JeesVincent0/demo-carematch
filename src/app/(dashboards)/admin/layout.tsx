import { DashboardLayout } from '@/modules/dashboard';
export const metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="ADMIN">{children}</DashboardLayout>;
}
