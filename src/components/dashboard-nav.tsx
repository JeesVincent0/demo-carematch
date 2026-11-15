'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  Heart,
  Bell,
  UserRound,
  Settings,
  ShieldCheck,
  Users,
  ClipboardList,
  Activity,
  Clock,
} from 'lucide-react';
const icons = {
  LayoutDashboard,
  Search,
  CalendarDays,
  Heart,
  Bell,
  UserRound,
  Settings,
  ShieldCheck,
  Users,
  ClipboardList,
  Activity,
  Clock,
};
export function DashboardNav({ role }: { role: string }) {
  const path = usePathname();
  const entries =
    role === 'admin'
      ? [
          ['Overview', 'dashboard', 'LayoutDashboard'],
          ['All users', 'users', 'Users'],
          ['Clients', 'clients', 'UserRound'],
          ['Care professionals', 'workers', 'Heart'],
          ['Verification requests', 'verifications', 'ShieldCheck'],
          ['Care requests', 'requests', 'CalendarDays'],
          ['Activity logs', 'activity', 'Activity'],
          ['Settings', 'settings', 'Settings'],
        ]
      : role === 'worker'
        ? [
            ['Overview', 'dashboard', 'LayoutDashboard'],
            ['My profile', 'profile', 'UserRound'],
            ['Verification', 'verification', 'ShieldCheck'],
            ['Care requests', 'requests', 'CalendarDays'],
            ['Availability', 'availability', 'Clock'],
            ['Notifications', 'notifications', 'Bell'],
            ['Settings', 'settings', 'Settings'],
          ]
        : [
            ['Overview', 'dashboard', 'LayoutDashboard'],
            ['Find care', '/find-care', 'Search'],
            ['My requests', 'requests', 'CalendarDays'],
            ['Favourites', 'favourites', 'Heart'],
            ['Notifications', 'notifications', 'Bell'],
            ['My profile', 'profile', 'UserRound'],
            ['Settings', 'settings', 'Settings'],
          ];
  return (
    <nav className="sidebar-nav" aria-label={`${role} dashboard`}>
      {entries.map(([title, slug, icon]) => {
        const Icon = icons[icon as keyof typeof icons];
        const href = slug.startsWith('/') ? slug : `/${role}/${slug}`;
        return (
          <Link href={href} key={slug} className={path.startsWith(href) ? 'active' : ''}>
            <Icon size={18} />
            {title}
          </Link>
        );
      })}
    </nav>
  );
}
